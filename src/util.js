// 引数がTruthyな値かの判別
const isTruthy = t => !!t

// 空Array判定
const isEmpty = l => !isTruthy(l) || l.length <= 0

// Objectのkey,valueを逆にする
const invertKeyValue = (o,r={})  => Object.keys(o).map(k => r[o[k]]=k) && r;

module.exports = {
  invertKeyValue,
  isEmpty,
  isTruthy
}