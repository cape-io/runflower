const _ = require('lodash/fp')
const funcOptions = require('./funcs')

const getFunc = _.propertyOf(funcOptions)
const funcIds = _.keys(funcOptions)

const objFuncId = _.flow(_.keys, _.first)
const objFunc = _.flow(objFuncId, getFunc)

const isObjDirective = _.overEvery([
  _.isPlainObject,
  _.flow(_.size, _.eq(1)),
  _.flow(objFunc, _.isFunction),
])

function directiveToFunc(directive) {
  function expandArg(arg) {
    if (isObjDirective(arg)) return directiveToFunc(arg)
    return arg
  }
  if (_.isArray(directive)) {
    const [funcId, arg] = directive
    if (funcId === 'over') {
      return getFunc(funcId)(_.map(directiveToFunc, arg))
    }
    return getFunc(funcId)(arg)
  }
  if (isObjDirective(directive)) {
    const funcId = _.first(_.keys(directive))
    const arg = directive[funcId]
    const func = getFunc(funcId)
    if (_.isArray(arg)) return func(..._.map(expandArg, arg))
    if (_.isPlainObject(arg)) return func(expandArg(arg))
    return func(arg)
  }
  if (_.isString(directive)) return _.get(directive)
  if (_.isNumber(directive)) return _.nth(directive)
  return _.identity
}

function evaluate(directives) {
  if (_.isArray(directives)) {
    const args = _.map(directiveToFunc, directives)
    return _.flow(...args)
  }
  return directiveToFunc(directives)
}

module.exports = {
  directiveToFunc,
  evaluate,
  getFunc,
  funcIds,
}
