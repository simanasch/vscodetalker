// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const { execFile } = require('child_process');
const vscode = require('vscode');
const client = require("./src/client.js");
// import { sayHello } from './src/client';
let grpcServerProcess;
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "gyouyomi" is now active!');
		
		// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('gyouyomi.helloWorld', function () {
		// The code you place here will be executed every time your command is executed

		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from gyouyomi!');
		
		client.getLibraryList("ついなちゃん")
		.then(results => {
			// vscode.window.showInformationMessage(res);
			console.info(results);
		});
		client.talk("ついなちゃんやで")
		.then(res => {
			vscode.window.showInformationMessage(res);
			// console.info(results);
		});
	});

	grpcServerProcess = execFile(
		"C:/Users/tktos/Documents/repos/descript-to-video/TTSController/src/SpeechGRPCServer/bin/x64/Release/net4.5.2/SpeechGRpcServer.exe",
		(error, stdout, stderr) => {
			if (error) {
				throw error;
			}
			console.log("stdout"+ stdout);
			context.subscriptions.push(disposable);
		}
	);
}

// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
