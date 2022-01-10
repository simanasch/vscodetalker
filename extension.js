const { execFile } = require('child_process');
const path = require('path');
const vscode = require('vscode');
const client = require("./src/client.js");
const fs = require("fs");
const iconv = require('iconv-lite');

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
	let ttsText = getTtsText(textEditor);
	let config = vscode.workspace.getConfiguration("gyouyomi");
	// デフォルトで使用するライブラリ名、利用可能なライブラリ名から読み上げに使用するライブラリの設定値を取得
	let engine = getTtsEngine(config.get("defaultLibraryName"), config.get("availableEngines"));

	client.talk(ttsText, engine.LibraryName, engine.EngineName)
	.then(res => {
		vscode.window.showInformationMessage("\""+ res + "\"を再生しました");
	});
}

/**
 * gyouyomi.recordタスクの実体
 * @param {vscode.TextEditor} textEditor 
 * 現在のカーソル行を読み上げ+録音する
 */
function record(textEditor) {
	let ttsText = getTtsText(textEditor);
	let config = vscode.workspace.getConfiguration("gyouyomi");
	// デフォルトで使用するライブラリ名、利用可能なライブラリ名から読み上げに使用するライブラリの設定値を取得
	let engine = getTtsEngine(config.get("defaultLibraryName"), config.get("availableEngines"));
	let currentFilePath = path.dirname(textEditor.document.fileName);
	let pathConfig = config.get("defaultSavePath",path.join(currentFilePath,"tts"));
	let saveToPath = generateRecordPath(pathConfig, engine.LibraryName, ttsText);

	client.record(ttsText, engine.LibraryName, engine.EngineName, saveToPath)
	.then(res => {
		if(config.get("saveTextFileOnRecord")) {
			const buf = iconv.encode(engine.LibraryName+"＞"+ttsText, "Shift_JIS");
			fs.writeFileSync(res.OutputPath.replace(/\.wav$/,".txt"),buf);
		}
		vscode.window.showInformationMessage("\"" + res.OutputPath + "\"を保存しました");
	});
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

const getTtsEngine = (libraryName, availableEngines) => {
	let engines = availableEngines.filter(i => i.LibraryName === libraryName);
	return engines.length > 0 ? engines[0] : availableEngines[0];
}

const generateRecordPath = (dirName, ...args) => {
	// todo:ファイル名に命名規則をつけられるようにする
	return path.join(dirName, args.join("_") + ".wav");
}

const isBlank = t => t===undefined || t === ""

// this method is called when your extension is deactivated
function deactivate() {
	// grpcServerProcess.kill();
}

module.exports = {
	activate,
	deactivate
}
