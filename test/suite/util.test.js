// src/util/util.jsに対するテスト
const assert = require('assert');
const util = require('../../src/util/util');

const testMap = {
  "hoge":"fuga",
  1:2,
  false:true,
}

suite('util関数に対するテスト', () => {


  test('isTruthyのテスト', () => {
    assert.deepStrictEqual(true, util.isTruthy(1));
    assert.deepStrictEqual(true, util.isTruthy("hoge"));
    assert.deepStrictEqual(false, util.isTruthy(""));
    assert.deepStrictEqual(false, util.isTruthy(undefined));
    assert.deepStrictEqual(false, util.isTruthy(null));
  });

  test('isEmptyのテスト',() => {
    assert.deepStrictEqual(true, util.isEmpty([]));
    assert.deepStrictEqual(false, util.isEmpty([null]));
    assert.deepStrictEqual(false, util.isEmpty([undefined]));
    assert.deepStrictEqual(true, util.isEmpty(undefined));
    assert.deepStrictEqual(true, util.isEmpty(null));
  })

  test("invertKeyValueのテスト", () => {
    assert.deepStrictEqual({
      "fuga":"hoge",
      2:"1",
      true:"false"
    }, util.invertKeyValue(testMap))
  })

  test("getIfExistのテスト", () => {
    assert.deepStrictEqual("fuga", util.getIfExist("hoge", testMap));
    assert.deepStrictEqual("ngo", util.getIfExist("ngo", testMap));
    assert.deepStrictEqual(2, util.getIfExist(1, testMap));
    assert.deepStrictEqual(2, util.getIfExist(2, testMap));
    assert.deepStrictEqual(true, util.getIfExist("false", testMap));
    assert.deepStrictEqual(true, util.getIfExist(false, testMap));
  })

})