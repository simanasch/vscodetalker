// vscodeに関する共通系関数を定義する
// 設定取得など
const vscode = require('vscode');
const iconv = require('iconv-lite');
const path = require('path');
const fs = require("fs");

const { engineLabelTranslations, isTruthy, invertKeyValue, translateEngineName } = require('./util.js');

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
  if (textEditor.document.eol === 1) {
    return "\n";
  } else {
    return "\r\n";
  }
};

/**
 * 読み上げ対象の文字列とworkspace configから{ボイスプリセット、読み上げ内容}を返す
 * @param {string} line
 * @param {vscode.WorkspaceConfiguration} config ボイスプリセットの区切り文字。
 * @return {Object} 読み上げ内容にpresetが含まれない場合、presetの値はundefinedを返す
 */
const getEngineFromLine = (line, config) => {
  let splitRegExp = new RegExp("\(\(.+?\)" + config.get("voicePresetSeparator") + "\)?\(.+\)");
  let [presetName, body] = splitRegExp.exec(line).slice(2);
  let preset = config.get("availableEngines").find(p => p.LibraryName === presetName);
  return { preset, body };
}

/**
 * 音声合成エンジンを手動で選択する際の処理
 * @param {vscode.WorkspaceConfiguration} config 
 * @returns {Promise<Object>}
 */
async function promptEngine(config) {
  let preset = await selectTtsEngine(config);
  if (!preset) {
    // 入力がキャンセルされた場合の処理
    return showTtsToast(`再生/録音をキャンセルしました`, config);
  }
  return preset;
}

/**
 * @description 読み上げ部分の取得
 * 選択範囲がある場合は最初の選択範囲内のテキスト、
 * ない場合はカーソル行を返す
 * @param {vscode.TextEditor} textEditor 
 * @returns {String}
 */
const getTtsText = textEditor => {
  if (!isTruthy(textEditor.document.getText(textEditor.selection))) {
    return textEditor.document.lineAt(textEditor.selection.start).text
  } else {
    return textEditor.document.getText(textEditor.selection);
  }
}

/**
 * @description 引数のワークスペース設定から音声合成エンジン選択のquickPickを作成する
 * @param {vscode.WorkspaceConfiguration} config 
 * @returns {Thenable<Object>}
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
      if (!result) return undefined;
      return {
        // @ts-ignore
        "LibraryName": result.label,
        // @ts-ignore
        "EngineName": translateEngineName(result.description, invertKeyValue(engineLabelTranslations))
      }
    });
}

/**
 * 各コマンド実行後のtoast表示
 * 実行時、コンフィグの値からtoast表示が必要か取得する
 * @param {string} body 
 * @param {vscode.WorkspaceConfiguration} config 
 * @returns {Thenable<string|undefined>|undefined}
 */
function showTtsToast(body, config) {
  // 通知オフになってる場合はメッセージ表示しない
  if (!isTruthy(config.get("notifyOnRead"))) return;
  return vscode.window.showInformationMessage(body, "通知をオフにする")
    .then(clicked => {
      if (clicked) {
        vscode.workspace.getConfiguration("vsCodeTalker").update("notifyOnRead", false, true);
        return vscode.window.showInformationMessage(`"vscodetalker.notifyOnRead"をチェックすると通知を有効にできます`)
      }
    })
}

/**
 * 保存先のフォルダパスを取得
 * @param {vscode.WorkspaceConfiguration} config 指定がなかったら呼び出し時に取得
 * @returns {string} 保存先のフォルダのパス
 */
function getTtsRecordFolderPath(config) {
  let ttsRecordFolder = config.get("ttsRecordFileFolder");
  if (!isTruthy(ttsRecordFolder)) {
    ttsRecordFolder = path.join(process.env.TMP, "tts");
  }
  return path.win32.resolve(ttsRecordFolder).replace('\\mnt\\c\\', 'c:\\\\');
}

const generateRecordPath = (dirName, ...args) => {
  // todo:ファイル名に命名規則をつけられるようにする
  return path.join(dirName, args.join("_") + ".wav");
}

// 
function saveTtsBodyToText(ttsResponse, config) {
  if (config.get("saveTextFileOnRecord")) {
    const buf = iconv.encode(ttsResponse.LibraryName + config.get("voicePresetSeparator") + ttsResponse.Body, "Shift_JIS");
    fs.writeFileSync(ttsResponse.OutputPath.replace(/\.wav$/, ".txt"), buf);
  }
  return;
}


module.exports = {
  generateRecordPath,
  getConfig,
  getDocumentEOL,
  getEngineFromLine,
  getTtsRecordFolderPath,
  getTtsText,
  promptEngine,
  saveTtsBodyToText,
  showTtsToast,
}