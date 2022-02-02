const { spawn, exec } = require('child_process');
const path = require('path');
const vscode = require('vscode');
const client = require("./src/client.js");
const fs = require("fs");
const iconv = require('iconv-lite');
const { isTruthy, isEmpty, invertKeyValue } = require('./src/util.js');

let ttsControllerPath = path.join(__dirname,"bin","SpeechGRpcServer.exe");
let grpcServerProcess;

// エンジン名の変換定義
const engineLabelTranslations = {
	"VOICEROID64": "VOICEROID2"
}
const translateEngineName = (t,m) => !m[t] ? t : m[t];
/**
 * この拡張機能の設定取得をする
 * @returns {vscode.WorkspaceConfiguration}
 */
const getConfig = () => vscode.workspace.getConfiguration("vsCodeTalker")
/**
 * @description 引数のtextEditorの改行文字列を返す
 * @param {vscode.TextEditor} textEditor
 */
const getDocumentEOL = (textEditor) => {
	if(textEditor.document.eol === 1) {
		return "\n";
	} else {
		return "\r\n";
	}
};

/**
 * 拡張機能の有効化時、一度だけ実行される関数
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	context.subscriptions.push(vscode.commands.registerCommand(
		"vsCodeTalker.getLibraryList",
		getLibraryList
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		"vsCodeTalker.openDestinationFolder",
		openDestinationFolder
	));

	context.subscriptions.push(vscode.commands.registerTextEditorCommand(
		"vsCodeTalker.talk",
		talk
	));

	context.subscriptions.push(vscode.commands.registerTextEditorCommand(
		"vsCodeTalker.record",
		record
	));

	context.subscriptions.push(vscode.commands.registerTextEditorCommand(
		"vsCodeTalker.talkAllLineHasSeparator",
		talkAllLineHasSeparator
	));

	context.subscriptions.push(vscode.commands.registerTextEditorCommand(
		"vsCodeTalker.recordAllLineHasSeparator",
		recordAllLineHasSeparator
	));

	grpcServerProcess = spawn(
		ttsControllerPath
	);

	// ttsのサーバープロセスの起動後処理
	// 使用可能なttsライブラリの一覧がない場合、自動でgetLibraryList()を実行する
	grpcServerProcess.stdout.once("data"
		,(data) => {
			console.info("successfully spawn " + iconv.decode(data, "Shift_JIS"));
			if(isEmpty(vscode.workspace.getConfiguration("vsCodeTalker").get("availableEngines"))) {
				getLibraryList();
			}
		}
	);
}

/**
 * vsCodeTalker.getLibraryListコマンドの実体
 * 現在のpcで使用できるttsエンジンの一覧を更新する
 * @returns {Promise<Array<Object>>}
 */
function getLibraryList() {
	return client.getLibraryList()
	.then(results => {
		let availableEngines = results.map(t => {
			return {
				EngineName: t.EngineName,
				LibraryName: t.LibraryName
			}
		});
		vscode.window.showInformationMessage("使用可能な音声合成ライブラリのリストを更新しました");
		// settings.jsonに保存している使用可能なライブラリの一覧を更新する
		// pcごとに1設定あればいいのでグローバル設定に保存
		vscode.workspace.getConfiguration().update("vsCodeTalker.availableEngines", availableEngines, true)
		return availableEngines;
	})
	.catch(e => {
		console.error(e);
		vscode.window.showWarningMessage("音声合成ライブラリの一覧取得に失敗しました");
		return [];
	});
}

/**
 * vsCodeTalker.talkコマンドの実体
 * @param {vscode.TextEditor} textEditor 
 * @return {Promise}
 * 現在のカーソル行を読み上げる
 */
async function talk(textEditor) {
	let config = getConfig();
	// 読み上げ対象の行の内容を取得
	const ttsText = getTtsText(textEditor);
	// 読み上げ内容がボイスプリセットを含む場合はそのまま読み上げ
	let request =  await getPresetForLine(ttsText,config);
	if(!isTruthy(request)) return;
	return client.talk(request)
	.then(res => {
		return showTtsToast("\""+ res + "\"を再生しました");
	});
}

/**
 * 行の内容から読み上げ内容を取得する
 * 読み上げ内容にボイスプリセットが含まれる場合は同期でttsRequestを返す、
 * そうでない場合はユーザーにttsエンジンを選択してもらう(キャンセル時はtoastを表示しundefinedを返す)
 * @param {string} ttsText 
 * @param {vscode.WorkspaceConfiguration} config 
 * @returns {Promise<Object>}
 */
async function getPresetForLine(ttsText, config = getConfig()) {
	let { preset, body } = getEngineFromLine(ttsText, config);

	// 読み上げ内容にボイスプリセットがない場合の処理
	if(!isTruthy(preset)) {
		// 読み上げに使用するttsエンジンを選択してもらう
		preset = await selectTtsEngine(config);
		if (!preset) {
			// 入力がキャンセルされた場合の処理
			return showTtsToast(`再生/録音をキャンセルしました`);
		}
	}
	return makeTtsRequest(body, preset.LibraryName, preset.EngineName);
}

/**
 * 保存先のフォルダパスを取得
 * @param {vscode.WorkspaceConfiguration} config 指定がなかったら呼び出し時に取得
 * @returns {string} 保存先のフォルダのパス
 */
function getTtsRecordFolderPath(config=getConfig()) {
	let ttsRecordFolder = config.get("ttsRecordFileFolder");
	if(!isTruthy(ttsRecordFolder)) {
		ttsRecordFolder = path.join(process.env.TMP,"tts");
	}
	return path.win32.resolve(ttsRecordFolder).replace('\\mnt\\c\\', 'c:\\\\');
}

/**
 * vscodetalker.openDestinationFolderの内容
 * 音声保存先のフォルダをエクスプローラーを使用して開く
 */
function openDestinationFolder() {
	return exec(`explorer  "${getTtsRecordFolderPath()}"`);
}

function getNotifyOnRead() {
	return vscode.workspace.getConfiguration("vsCodeTalker").get("notifyOnRead") === true;
}

function showTtsToast(body) {
	// 通知オフになってる場合はメッセージ表示しない
	if(!getNotifyOnRead()) return;
	return vscode.window.showInformationMessage(body,"通知をオフにする")
	.then(clicked => {
		if(clicked) {
			vscode.workspace.getConfiguration("vsCodeTalker").update("notifyOnRead",false,true);
			return vscode.window.showInformationMessage(`"vscodetalker.notifyOnRead"をチェックすると通知を有効にできます`)
		}
	})
}

/**
 * vscodetalker.talkAllLineHasSeparatorコマンドの実体
 * @param {vscode.TextEditor} textEditor 
 * ボイスプリセットを含む行を読み上げる
 */
async function talkAllLineHasSeparator(textEditor) {
	let config = getConfig();
	let allLines = textEditor.document.getText().split(getDocumentEOL(textEditor));
	let ttsPresetSeparator = config.get("voicePresetSeparator");
	let availableEngines = config.get("availableEngines");

	for(let request of mapLinesToRequest(allLines, ttsPresetSeparator, availableEngines,"")) {
		await client.talk(request);
	}
	return showTtsToast("ファイル全体を読み上げました");
}

/**
 * vscoderecorder.recordAllLineHasSeparatorコマンドの実体
 * @param {vscode.TextEditor} textEditor 
 * ボイスプリセットを含む行を読み上げる
 */
 async function recordAllLineHasSeparator(textEditor) {
	let config = getConfig();
	let allLines = textEditor.document.getText().split(getDocumentEOL(textEditor));
	let ttsPresetSeparator = config.get("voicePresetSeparator");
	let availableEngines = config.get("availableEngines");
	let ttsRecordFolder = getTtsRecordFolderPath(config);

	for(let request of mapLinesToRequest(allLines, ttsPresetSeparator, availableEngines, ttsRecordFolder)) {
		await client.record(request)
		.then((res) => {
			// 録音後の後処理
			// 設定で有効化されている場合、読み上げ内容をテキストファイルとして保存する
			saveTtsBodyToText(res);
		});
	}
	return showTtsToast("ファイル全体を読み上げ&録音しました");
}

/**
 * 
 * @param {Array<string>} lines 
 * @param {string} separator 
 * @param {Array<Object>} availableEngines 
 * @param {string} savePath 
 * @returns Array<Object>
 */
function mapLinesToRequest(lines, separator, availableEngines, savePath) {
	let availableEngineNames = availableEngines.map(engine => engine.LibraryName);
	// プリセットが存在する行のみ読み上げる
	return lines
	.filter(line => line.includes(separator) && availableEngineNames.includes(line.split(separator)[0]))
	.map(line => {
		let saveToPath = "";
		let [presetName, body] = line.split(separator);
		let engine = availableEngines.find(engine=> engine["LibraryName"] === presetName);
		if(isTruthy(savePath)) {
			saveToPath = generateRecordPath(savePath, engine.LibraryName, body);
		}
		return makeTtsRequest(body, presetName ,engine.EngineName, saveToPath);
	});
}


function saveTtsBodyToText(ttsResponse) {
	const config = getConfig();

	if(config.get("saveTextFileOnRecord")) {
		const buf = iconv.encode(ttsResponse.LibraryName+"＞"+ttsResponse.Body, "Shift_JIS");
		fs.writeFileSync(ttsResponse.OutputPath.replace(/\.wav$/,".txt"),buf);
	}
	return;
}

/**
 * vsCodeTalker.recordタスクの実体
 * @param {vscode.TextEditor} textEditor 
 * 現在のカーソル行を読み上げ+録音する
 */
async function record(textEditor) {
	let config = getConfig();
	// 読み上げ対象の行の内容を取得
	const ttsText = getTtsText(textEditor);
	const ttsRecordFolder = getTtsRecordFolderPath(config);
	// 読み上げ内容がボイスプリセットを含む場合はそのまま読み上げ
	let request =  await getPresetForLine(ttsText,config);
	if(!isTruthy(request)) return;
	request.OutputPath = generateRecordPath(ttsRecordFolder, request.LibraryName, request.Body);
	return client.record(request)
	.then(res => {
		saveTtsBodyToText(res);
		return showTtsToast("\"" + res.OutputPath + "\"を保存しました");
	});
}

/**
 * 読み上げ部分の取得
 * 選択範囲がある場合は最初の選択範囲、ない場合はカーソル行を返す
 * @param {vscode.TextEditor} textEditor 
 * @returns {String}
 */
const getTtsText = textEditor => {
	if(!isTruthy(textEditor.document.getText(textEditor.selection))) {
		return textEditor.document.lineAt(textEditor.selection.start).text
	} else {
		return textEditor.document.getText(textEditor.selection);
	}
}

/**
 * 読み上げ対象の文字列とworkspace configから{ボイスプリセット、読み上げ内容}を返す
 * @param {string} line
 * @param {vscode.WorkspaceConfiguration} config ボイスプリセットの区切り文字。
 * @return {Object} 読み上げ内容にpresetが含まれない場合、presetの値はundefinedを返す
 */
const getEngineFromLine = (line, config) => {
	let separator = config.get("voicePresetSeparator");
	let presets = config.get("availableEngines");
	let splitRegExp = new RegExp("\(\(.+?\)" + separator + "\)?\(.+\)");
	let [presetName,body] = splitRegExp.exec(line).slice(2);
	let preset = presets.find(p => p.LibraryName === presetName);
	return {preset, body};
}

/**
 * @description 引数のワークスペース設定から音声合成エンジン選択のquickPickを作成する
 * @param {vscode.WorkspaceConfiguration} config 
 * @returns {Object}
 */
const selectTtsEngine = config => {
	let defaultLibraryName = config.get("defaultLibraryName");
	let quickPickItems = config.get("availableEngines").map(t => {
		return {
			"description": translateEngineName(t.EngineName, engineLabelTranslations),
			"label": t.LibraryName
		}
	}).sort(t => t.label === defaultLibraryName ? -1 : 0)

	// @ts-ignore
	return vscode.window.showQuickPick(quickPickItems, {
		placeHolder: "読み上げに使うライブラリ名"
	})
	.then(result => {
		if(!result) return undefined;
		return {
			// @ts-ignore
			"LibraryName": result.label, 
			// @ts-ignore
			"EngineName": translateEngineName(result.description, invertKeyValue(engineLabelTranslations))
		}
	})
}

const generateRecordPath = (dirName, ...args) => {
	// todo:ファイル名に命名規則をつけられるようにする
	return path.join(dirName, args.join("_") + ".wav");
}

function makeTtsRequest(text, libraryName, engineName, path="") {
	return {
			LibraryName: libraryName,
			EngineName: engineName,
			Body: text,
			OutputPath: path
	};
}

// 拡張機能を無効にした際に呼ばれる関数
function deactivate() {
	// grpcServerProcess.kill();
}

module.exports = {
	activate,
	deactivate
}
