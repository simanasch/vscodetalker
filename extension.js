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
	))

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
	});

}

function talk(textEditor) {
	let currentLine = textEditor.document.lineAt(textEditor.selection.start);
	client.talk(currentLine.text)
	.then(res => {
		vscode.window.showInformationMessage(res);
	});
}
// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
