const { execFile } = require('child_process');
const path = require('path');
const vscode = require('vscode');
const client = require("./src/client.js");

let ttsControllerPath = path.join(__dirname,"bin","SpeechGRpcServer.exe");
let grpcServerProcess;

/**
 * 拡張機能の有効化時、一度だけ実行される関数
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	context.subscriptions.push(vscode.commands.registerCommand(
		"gyouyomi.getLibraryList",
		getLibraryList
	));

	context.subscriptions.push(vscode.commands.registerTextEditorCommand(
		"gyouyomi.talk",
		talk
	));

	context.subscriptions.push(vscode.commands.registerTextEditorCommand(
		"gyouyomi.record",
		record
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
 * gyouyomi.getLibraryListコマンドの実体
 * 現在のpcで使用できるttsエンジンの一覧を更新する
 */
function getLibraryList() {
	client.getLibraryList()
	.then(results => {
		console.info(results);
		// settings.jsonに保存している使用可能なライブラリの一覧を更新する
		// pcごとに1設定あればいいのでグローバル設定に保存
		vscode.workspace.getConfiguration().update("gyouyomi.availableEngines", results, true)
	});
}

/**
 * gyouyomi.talkコマンドの実体
 * @param {vscode.TextEditor} textEditor 
 * 現在のカーソル行を読み上げる
 */
function talk(textEditor) {
	let currentLine = textEditor.document.lineAt(textEditor.selection.start);
	let config = vscode.workspace.getConfiguration("gyouyomi");
	// デフォルトで使用するライブラリ名、利用可能なライブラリ名から読み上げに使用するライブラリの設定値を取得
	let engine = getTtsEngine(config.get("defaultLibraryName"), config.get("availableEngines"));

	client.talk(currentLine.text, engine.LibraryName, engine.EngineName)
	.then(res => {
		vscode.window.showInformationMessage("\""+ res + "\"");
	});
}

/**
 * gyouyomi.recordタスクの実体
 * @param {vscode.TextEditor} textEditor 
 * 現在のカーソル行を読み上げ+録音する
 */
function record(textEditor) {
	let currentLine = textEditor.document.lineAt(textEditor.selection.start);
	let config = vscode.workspace.getConfiguration("gyouyomi");
	// デフォルトで使用するライブラリ名、利用可能なライブラリ名から読み上げに使用するライブラリの設定値を取得
	let engine = getTtsEngine(config.get("defaultLibraryName"), config.get("availableEngines"));
	let currentFilePath = path.dirname(textEditor.document.fileName);
	let pathConfig = config.get("defaultSavePath","tts");
	let saveToPath = generateRecordPath(path.join(currentFilePath,pathConfig), engine.LibraryName, currentLine.text);

	client.record(currentLine.text, engine.LibraryName, engine.EngineName, saveToPath)
	.then(res => {
		vscode.window.showInformationMessage("\"" + res.OutputPath + "\"を保存しました");
	});
}

const getTtsEngine = (libraryName, availableEngines) => {
	const config = vscode.workspace.getConfiguration("gyouyomi");
	let engines = availableEngines.filter(i => i.LibraryName === libraryName);
	return engines.length > 0 ? engines[0] : availableEngines[0];
}

const generateRecordPath = (dirName, ...args) => {
	// todo:ファイル名に命名規則をつけられるようにする
	return path.join(dirName, args.join("_") + ".wav");
}

// const isBlank = t => t===undefined || t === ""

// this method is called when your extension is deactivated
function deactivate() {
	// grpcServerProcess.kill();
}

module.exports = {
	activate,
	deactivate
}
