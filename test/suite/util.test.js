// src/util/util.jsに対するテスト
const assert = require('assert');
const util = require('../../src/util/util');

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

})