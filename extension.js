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
 */
function getLibraryList() {
	client.getLibraryList()
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
	});
}

/**
 * vsCodeTalker.talkコマンドの実体
 * @param {vscode.TextEditor} textEditor 
 * 現在のカーソル行を読み上げる
 */
async function talk(textEditor) {
	let config = vscode.workspace.getConfiguration("vsCodeTalker");
	let ttsText = getTtsText(textEditor);

	let request = makeTtsRequestFromLine(ttsText, config.get("voicePresetSeparator"), config.get("availableEngines"));
	// 読み上げ内容にボイスプリセットがない場合の処理
	if(!isTruthy(request.LibraryName)) {
		// 読み上げに使用するttsエンジンを選択してもらう
		const engine = await selectTtsEngine(config);
		if (engine) {
			request = makeTtsRequest(ttsText, engine.LibraryName ,engine.EngineName);
		} else {
			// 入力がキャンセルされた場合の処理
			return showTtsToast(`再生をキャンセルしました`);
		}
	}
	client.talk(request)
	.then(res => {
		return showTtsToast("\""+ res + "\"を再生しました");
	});
}

/**
 * 保存先のフォルダパスを取得
 * @returns {string} 保存先のフォルダのパス
 */
function getTtsRecordFolderPath() {
	let config = vscode.workspace.getConfiguration("vsCodeTalker");
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
	let config = vscode.workspace.getConfiguration("vsCodeTalker");
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
	let config = vscode.workspace.getConfiguration("vsCodeTalker");
	let allLines = textEditor.document.getText().split(getDocumentEOL(textEditor));
	let ttsPresetSeparator = config.get("voicePresetSeparator");
	let availableEngines = config.get("availableEngines");
	let ttsRecordFolder = getTtsRecordFolderPath();

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
	let config = vscode.workspace.getConfiguration("vsCodeTalker");
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
	let ttsText = getTtsText(textEditor);
	let config = vscode.workspace.getConfiguration("vsCodeTalker");
	let ttsRecordFolder = getTtsRecordFolderPath();

	let request = makeTtsRequestFromLine(ttsText, config.get("voicePresetSeparator"), config.get("availableEngines"));
	// 読み上げ内容にボイスプリセットがない場合の処理
	if(!isTruthy(request.LibraryName)) {
		// 読み上げに使用するttsエンジンを選択してもらう
		const engine = await selectTtsEngine(config);
		if (engine) {
			request = makeTtsRequest(ttsText, engine.LibraryName ,engine.EngineName);
		} else {
			// 入力がキャンセルされた場合の処理
			return showTtsToast(`録音をキャンセルしました`);
		}
	}
	request.OutputPath = generateRecordPath(ttsRecordFolder, request.LibraryName, request.Body);

	client.record(request)
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
 * 読み上げ対象の文字列から、ttsRequestを返す
 * @param {string} line
 * @param {string} separator ボイスプリセットの区切り文字。
 * @param {Array<Object>} presets 
 * @return {Object} ttsRequest
 */
const makeTtsRequestFromLine = (line, separator, presets) => {
	let splitRegExp = new RegExp("\(\(.+?\)" + separator + "\)?\(.+\)");
	let [presetName,body] = splitRegExp.exec(line).slice(2);
	let preset = presets.find(p => p.LibraryName === presetName);
	if(isTruthy(preset)) {
		return makeTtsRequest(body, preset.LibraryName, preset.EngineName);
	} else {
		return makeTtsRequest(body, "", "");
	}
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
