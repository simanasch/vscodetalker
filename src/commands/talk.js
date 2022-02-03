const vscode = require('vscode');
const client = require("../grpc/client.js");
const { isTruthy,  } = require('../util/util.js');
const { getEngineFromLine, getPresetForLine, showTtsToast} = require("../util/vscode");
const { makeTtsRequest } = require('../util/grpc');

/**
 * vsCodeTalker.talkコマンドの実体
 * @param {string} ttsLine 
 * @param {vscode.WorkspaceConfiguration} config
 * @return {Promise}
 * 現在のカーソル行を読み上げる
 */
async function talk(ttsLine, config) {
  // 読み上げ内容がボイスプリセットを含む場合はそのまま読み上げ
  let request =  await getPresetForLine(ttsLine,config);
  if(!isTruthy(request)) return;
  return client.talk(request)
  .then(res => {
    return showTtsToast("\""+ res + "\"を再生しました");
  });
}

/**
 * vscodetalker.talkAllLineHasSeparatorコマンドの実体
 * @param {Array<string>} ttsLines 
 * @param {vscode.WorkspaceConfiguration} config
 * ボイスプリセットを含む行を読み上げる
 */
async function talkLines(ttsLines, config) {

  for(let ttsLine of ttsLines) {
    let { preset, body } =  await getEngineFromLine(ttsLine,config);
    if(!isTruthy(preset)) continue;
    await client.talk(makeTtsRequest(body, preset.LibraryName, preset.EngineName));
  }
  return showTtsToast("ファイル全体を読み上げました");
}

module.exports = {
  talk,
  talkLines
}