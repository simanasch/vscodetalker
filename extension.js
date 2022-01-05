// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const { execFile } = require('child_process');
const path = require('path');
const vscode = require('vscode');
const client = require("./src/client.js");

let ttsControllerPath = path.join(__dirname,"bin","SpeechGRpcServer.exe");
let grpcServerProcess;
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	// vscode.window.showInformationMessage('ttsサーバーを起動しました');
	context.subscriptions.push(vscode.commands.registerTextEditorCommand(
		"gyouyomi.talk",
		talk
	));
	context.subscriptions.push(vscode.commands.registerCommand(
		"gyouyomi.getLibraryList",
		getLibraryList
	));

	// TODO:tts起動できなかった際にnotification表示
	grpcServerProcess = execFile(
		ttsControllerPath,
		(error, stdout, stderr) => {
			if (error) {
				throw error;
			}
		}
	);
}

function getLibraryList() {
	client.getLibraryList()
	.then(results => {
		// vscode.window.showInformationMessage(res);
		console.info(results);
		// let p = path.resolve(localSettingsFileName);
		// fs.writeFileSync(localSettingsFileName,JSON.stringify(results));
		vscode.workspace.getConfiguration().update("gyouyomi.availableEngines", results, true)
		.then(() => {
			console.info(vscode.workspace.getConfiguration("gyouyomi.availableEngines"));
		});
	});
}

function talk(textEditor) {
	// let libraryList = JSON.parse(fs.readFileSync(localSettingsFileName).toString());
	let currentLine = textEditor.document.lineAt(textEditor.selection.start);
	client.talk(currentLine.text)
	.then(res => {
		vscode.window.showInformationMessage("\""+ res + "\"");
	});
}

function record(textEditor) {
	let currentLine = textEditor.document.lineAt(textEditor.selection.start);
	client.talk(currentLine.text)
	.then(res => {
		vscode.window.showInformationMessage(res);
	});
}

// this method is called when your extension is deactivated
function deactivate() {
	grpcServerProcess.kill();
}

module.exports = {
	activate,
	deactivate
}
