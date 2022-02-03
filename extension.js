const { spawn, exec } = require('child_process');
const path = require('path');
const vscode = require('vscode');
const client = require("./src/grpc/client.js");
const iconv = require('iconv-lite');
const { isEmpty } = require('./src/util/util.js');
const { getConfig, getDocumentEOL, getTtsText, getTtsRecordFolderPath } = require("./src/util/vscode");
const { talk, talkLines } = require('./src/commands/talk')
const { record, recordLines } = require('./src/commands/record')
let ttsControllerPath = path.join(__dirname, "bin", "SpeechGRpcServer.exe");
let grpcServerProcess;

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
    talkCommand
  ));

  context.subscriptions.push(vscode.commands.registerTextEditorCommand(
    "vsCodeTalker.record",
    recordCommand
  ));

  context.subscriptions.push(vscode.commands.registerTextEditorCommand(
    "vsCodeTalker.talkAllLineHasSeparator",
    talkAllLinesCommand
  ));

  context.subscriptions.push(vscode.commands.registerTextEditorCommand(
    "vsCodeTalker.recordAllLineHasSeparator",
    recordLinesCommand
  ));

  grpcServerProcess = spawn(
    ttsControllerPath
  );

  // ttsのサーバープロセスの起動後処理
  // 使用可能なttsライブラリの一覧がない場合、自動でgetLibraryList()を実行する
  grpcServerProcess.stdout.once("data"
    , (data) => {
      console.info("successfully spawn " + iconv.decode(data, "Shift_JIS"));
      if (isEmpty(vscode.workspace.getConfiguration("vsCodeTalker").get("availableEngines"))) {
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
function talkCommand(textEditor) {
  let config = getConfig();
  // 読み上げ対象の行の内容を取得
  const ttsText = getTtsText(textEditor);
  return talk(ttsText, config);
}

/**
 * vsCodeTalker.recordタスクの実体
 * @param {vscode.TextEditor} textEditor 
 * 現在のカーソル行を読み上げ+録音する
 */
function recordCommand(textEditor) {
  let config = getConfig();
  // 読み上げ対象の行の内容を取得
  const ttsText = getTtsText(textEditor);
  return record(ttsText, config);
}

/**
 * vscodetalker.openDestinationFolderの内容
 * 音声保存先のフォルダをエクスプローラーを使用して開く
 */
function openDestinationFolder() {
  let config = getConfig();
  return exec(`explorer  "${getTtsRecordFolderPath(config)}"`);
}

/**
 * vscodetalker.talkAllLineHasSeparatorコマンドの実体
 * @param {vscode.TextEditor} textEditor 
 * ボイスプリセットを含む行を読み上げる
 */
function talkAllLinesCommand(textEditor) {
  let config = getConfig();
  let allLines = textEditor.document.getText().split(getDocumentEOL(textEditor));
  return talkLines(allLines, config);
}

/**
 * vscoderecorder.recordAllLineHasSeparatorコマンドの実体
 * @param {vscode.TextEditor} textEditor 
 * ボイスプリセットを含む行を読み上げる
 */
function recordLinesCommand(textEditor) {
  let config = getConfig();
  let allLines = textEditor.document.getText().split(getDocumentEOL(textEditor));
  return recordLines(allLines, config);
}

// 拡張機能を無効にした際に呼ばれる関数
function deactivate() {
  // grpcServerProcess.kill();
}

module.exports = {
  activate,
  deactivate
}
