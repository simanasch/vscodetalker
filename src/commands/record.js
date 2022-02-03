const vscode = require('vscode');
const client = require("../grpc/client.js");
const { isTruthy } = require('../util/util.js');
const { 
  getEngineFromLine,
  showTtsToast,
  getTtsRecordFolderPath,
  generateRecordPath,
  saveTtsBodyToText,
  promptEngine
} = require("../util/vscode");
const { makeTtsRequest } = require('../util/grpc');

/**
 * vsCodeTalker.talkコマンドの実体
 * @param {string} ttsLine 
 * @param {vscode.WorkspaceConfiguration} config
 * @return {Promise}
 * 現在のカーソル行を読み上げ録音ファイルを作成する
 */
async function record(ttsLine, config) {
  // 読み上げ内容がボイスプリセットを含む場合はそのまま読み上げ
  let { preset, body } = getEngineFromLine(ttsLine, config);
  if (!isTruthy(preset) ) {
    // 読み上げ内容がボイスプリセットを含まない場合は音声合成エンジンをユーザーに選択してもらう
    preset = await promptEngine(config);
  }
  if(!isTruthy(preset)) return;
  // リクエスト内容を生成
  let filepath = generateRecordPath(getTtsRecordFolderPath(config), preset.LibraryName, body);
  let request = makeTtsRequest(body, preset.LibraryName, preset.EngineName, filepath);
  return client.record(request)
    .then(res => {
      saveTtsBodyToText(res, config);
      return showTtsToast("\"" + res.OutputPath + "\"を保存しました");
    });
}

/**
 * vscodetalker.talkAllLineHasSeparatorコマンドの実体
 * @param {Array<string>} ttsLines 
 * @param {vscode.WorkspaceConfiguration} config
 * ボイスプリセットを含む行を読み上げ、録音ファイルを作成する
 */
async function recordLines(ttsLines, config) {
  for (let ttsLine of ttsLines) {
    let { preset, body } = getEngineFromLine(ttsLine, config);
    if (!isTruthy(preset)) continue;
    let filepath = generateRecordPath(getTtsRecordFolderPath(config), preset.LibraryName, body);
    await client.record(makeTtsRequest(body, preset.LibraryName, preset.EngineName, filepath))
      .then((res) => {
        // 録音後の後処理
        // 設定で有効化されている場合、読み上げ内容をテキストファイルとして保存する
        saveTtsBodyToText(res, config);
      });
  }
  return showTtsToast("ファイル全体を読み上げ&録音しました");
}

module.exports = {
  record,
  recordLines
}