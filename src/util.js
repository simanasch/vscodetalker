// 引数がTruthyな値かの判別
const isTruthy = t => !!t

// stringに対するisBlank判定
const isBlank = t => t === undefined || t === ""

// Array系の型に対するisBlank判定
const isEmpty = l => !Array.isArray(l) || l.length <= 0

// Objectのkey,valueを逆にする
const invertKeyValue = (o,r={})  => Object.keys(o).map(k => r[o[k]]=k) && r;

module.exports = {
  invertKeyValue,
  isBlank,
  isEmpty,
  isTruthy
}