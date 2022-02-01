/**
 * 引数がTruthyな値かの判別
 * @param {any} t 
 * @returns {Boolean}
 */
const isTruthy = t => !!t

/**
 * 空Array判定
 * @param {Array} l
 * @returns {Boolean}
 */
const isEmpty = l => !isTruthy(l) || l.length <= 0

/**
 * Objectのkey,valueを逆にする
 * @param {Object} o
 * @param {Object} r
 * @returns {Boolean}
 */
const invertKeyValue = (o,r={})  => Object.keys(o).map(k => r[o[k]]=k) && r;

module.exports = {
  invertKeyValue,
  isEmpty,
  isTruthy
}