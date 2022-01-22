const { execFile } = require('child_process');
const path = require('path');
const vscode = require('vscode');
const client = require("./src/client.js");
const fs = require("fs");
const iconv = require('iconv-lite');

let ttsControllerPath = path.join(__dirname,"bin","SpeechGRpcServer.exe");
let grpcServerProcess;

// エンジン名の変換定義
const engineLabelTranslations = {
	"VOICEROID64": "VOICEROID2"
}
const invertKeyValue = (o,r={})  => Object.keys(o).map(k => r[o[k]]=k) && r;
const translateEngineName = (t,m) => !m[t] ? t : m[t];
/**
 * @description 引数のtextEditorの改行文字列を返す
 * @param {vscode.TextEditor} textEditor
 */
const getDocumentEOL = (textEditor) => {
	if(textEditor.document.eol === 1) {
		return "\r";
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

	// TODO:tts起動できなかった際にnotification表示
	grpcServerProcess = execFile(
		ttsControllerPath,
		(error, stdout, stderr) => {
			if (error) {
				vscode.window.showInformationMessage("ttsサーバーの起動に失敗しました");
				throw error;
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
	let ttsText = getTtsText(textEditor);
	let config = vscode.workspace.getConfiguration("vsCodeTalker");

	// quickPickで読み上げに使用するttsエンジンを選択する
	const engine = await selectTtsEngine(config);
	// 結果を表示する
	if (engine) {
		// 入力完了
		let request = makeTtsRequest(ttsText, engine.LibraryName ,engine.EngineName);
		client.talk(request)
		// client.talk(ttsText, engine.LibraryName, engine.EngineName)
		.then(res => {
			// showQuickPick()
			vscode.window.showInformationMessage("\""+ res + "\"を再生しました");
		});
	} else {
		// 入力がキャンセルされた
		vscode.window.showInformationMessage(`再生をキャンセルしました`);
	}
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

	for(let request of mapLinesToRequest(allLines, ttsPresetSeparator, availableEngines)) {
		await client.talk(request);
	}
	vscode.window.showInformationMessage("ファイル全体を読み上げました");
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
	let currentFilePath = path.dirname(textEditor.document.fileName);
	let pathConfig = config.get("defaultSavePath",path.join(currentFilePath,"tts"));

	for(let request of mapLinesToRequest(allLines, ttsPresetSeparator, availableEngines, pathConfig)) {
		await client.record(request)
		.then((res) => {
			if(config.get("saveTextFileOnRecord")) {
				const buf = iconv.encode(res.LibraryName+"＞"+res.Body, "Shift_JIS");
				fs.writeFileSync(res.OutputPath.replace(/\.wav$/,".txt"),buf);
			}
		});
	}
	vscode.window.showInformationMessage("ファイル全体を読み上げ&録音しました");
}


function mapLinesToRequest(lines, separator, availableEngines, savePath)  {
	let availableEngineNames = availableEngines.map(engine => engine.LibraryName);
	// プリセットが存在する行のみ読み上げる
	let ttsLines  = lines.filter(line => {
		return line.includes(separator) && availableEngineNames.includes(line.split(separator)[0]);
	});
	return ttsLines.map(line => {
		let saveToPath = "";
		let [presetName, body] = line.split(separator);
		let engine = availableEngines.find(engine=> engine["LibraryName"] === presetName);
		if(!isBlank(savePath)) {
			saveToPath = generateRecordPath(savePath, engine.LibraryName, body);
		}
		return makeTtsRequest(body, presetName ,engine.EngineName, saveToPath);
	});
} 

/**
 * vsCodeTalker.recordタスクの実体
 * @param {vscode.TextEditor} textEditor 
 * 現在のカーソル行を読み上げ+録音する
 */
async function record(textEditor) {
	let ttsText = getTtsText(textEditor);
	let config = vscode.workspace.getConfiguration("vsCodeTalker");
	let currentFilePath = path.dirname(textEditor.document.fileName);
	let pathConfig = config.get("defaultSavePath",path.join(currentFilePath,"tts"));
	// quickPickで読み上げに使用するttsエンジンを選択する
	const engine = await selectTtsEngine(config);
	if (engine) {
		let saveToPath = generateRecordPath(pathConfig, engine.LibraryName, ttsText);

		let request = makeTtsRequest(ttsText, engine.LibraryName ,engine.EngineName, saveToPath);
		client.record(request)
		// client.record(ttsText, engine.LibraryName, engine.EngineName, saveToPath)
		.then(res => {
			if(config.get("saveTextFileOnRecord")) {
				const buf = iconv.encode(engine.LibraryName+"＞"+ttsText, "Shift_JIS");
				fs.writeFileSync(res.OutputPath.replace(/\.wav$/,".txt"),buf);
			}
			vscode.window.showInformationMessage("\"" + res.OutputPath + "\"を保存しました");
		});
	} else {
		// 入力がキャンセルされた
		vscode.window.showInformationMessage(`録音をキャンセルしました`);
	}
}

/**
 * 読み上げ部分の取得
 * 選択範囲がある場合は最初の選択範囲、ない場合はカーソル行を返す
 * @param {vscode.TextEditor} textEditor 
 * @returns {String}
 */
const getTtsText = textEditor => {
	return isBlank(textEditor.document.getText(textEditor.selection))
		? textEditor.document.lineAt(textEditor.selection.start).text
		: textEditor.document.getText(textEditor.selection)
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

const isBlank = t => t === undefined || t === ""

const isEmpty = l => !Array.isArray(l) || l.length <= 0

// this method is called when your extension is deactivated
function deactivate() {
	// grpcServerProcess.kill();
}

module.exports = {
	activate,
	deactivate
}
