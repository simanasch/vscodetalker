// src/util/util.jsに対するテスト
const assert = require('assert');
const vscode = require('vscode');
const vscodeUtil = require('../../src/util/vscode');

const testAvailableEngines = [
  {
    "LibraryName": "libraryName1",
    "EngineName": "engineName1"
  },
  {
    "LibraryName": "libraryName2",
    "EngineName": "engineName2"
  },
  {
    "LibraryName": "libraryName3",
    "EngineName": "engineName3"
  },
]

suite('vsCode機能関係のutil関数に対するテスト', () => {


  test('getConfigのテスト', () => {
    assert.deepEqual(vscode.workspace.getConfiguration("vsCodeTalker").inspect("availableEngines"), vscodeUtil.getConfig().inspect("availableEngines"));
  });

  test('getDocumentEOLのテスト',() => {
    // assert.deepStrictEqual(true, util.isEmpty([]));
    // assert.deepStrictEqual(false, util.isEmpty([null]));
    // assert.deepStrictEqual(false, util.isEmpty([undefined]));
    // assert.deepStrictEqual(true, util.isEmpty(undefined));
    // assert.deepStrictEqual(true, util.isEmpty(null));
  })

  suite("getEngineFromLineのテスト", async () => {
    await vscode.workspace.getConfiguration("vsCodeTalker").update("availableEngines",testAvailableEngines);
    await vscode.workspace.getConfiguration("vsCodeTalker").update("voicePresetSeparator","＞");
    const config = vscodeUtil.getConfig().get("availableEngines");

    test("読み上げ内容がpresetを含み、かつ利用可能なエンジンがある場合", () => {
      assert.equal({
        "preset": "libraryName1",
        "body": "test"
      }, vscodeUtil.getEngineFromLine("libraryName1＞test", config));
    })
    test("読み上げ内容がpresetを含み、かつ利用可能なエンジンがない場合", () => {
      assert.equal({
        "preset": undefined,
        "body": "test"
      }, vscodeUtil.getEngineFromLine("hoge＞test", config));
    })
    test("読み上げ内容が複数のpresetを含む場合", () => {
      assert.strictEqual({
        "preset": "libraryName1",
        "body": "＞test"
      }, vscodeUtil.getEngineFromLine("libraryName1＞＞test", config));
    })
    test("読み上げ内容が複数のpresetを含む場合", () => {
      assert.strictEqual({
        "preset": "libraryName2",
        "body": "libraryName3＞test"
      }, vscodeUtil.getEngineFromLine("libraryName2＞libraryName3＞test", config));
    })
    test("読み上げ内容がpresetを含まない場合", () => {
      assert.strictEqual({
        "preset": undefined,
        "body": "hogetest"
      }, vscodeUtil.getEngineFromLine("hogetest", config));
    })
    test("読み上げ内容が空文字の場合", () => {
      assert.strictEqual({
        "preset": undefined,
        "body": ""
      }, vscodeUtil.getEngineFromLine("", config));
    })
  })

  test("selectTtsEngineのテスト", () => {
  })

})