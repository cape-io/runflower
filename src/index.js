const _ = require('lodash/fp')
const funcOptions = require('./funcs')

const getFunc = _.propertyOf(funcOptions)
const funcIds = _.keys(funcOptions)

const objFuncId = _.flow(_.keys, _.first)
const objFunc = _.flow(objFuncId, getFunc)
const arrFunc = _.flow(_.nth(0), getFunc)

const isObjDirective = _.overEvery([
  _.isPlainObject,
  _.flow(_.size, _.eq(1)),
  _.flow(objFunc, _.isFunction),
])
const isArrDirective = _.overEvery([
  _.isArray,
  _.flow(_.size, _.eq(2)),
  _.flow(arrFunc, _.isFunction),
])
function directiveToFunc(directive) {
  if (_.isString(directive)) return _.get(directive)
  if (_.isNumber(directive)) return _.nth(directive)

  let funcId = null
  let args = null
  let func = null

  if (_.isArray(directive)) {
    funcId = _.nth(0, directive)
    args = _.nth(1, directive)
    func = getFunc(funcId)
  }
  if (isObjDirective(directive)) {
    funcId = _.first(_.keys(directive))
    args = directive[funcId]
    func = getFunc(funcId)
  }
  if (!_.isFunction(func)) return _.identity

  function expandArg(arg) {
    if (isObjDirective(arg)) return directiveToFunc(arg)
    if (isArrDirective(arg)) return directiveToFunc(arg)
    return arg
  }
  if (funcId === 'over') {
    return getFunc(funcId)(_.map(expandArg, args))
  }
  if (_.isArray(args)) return func(..._.map(expandArg, args))
  if (_.isPlainObject(args)) return func(expandArg(args))
  return func(args)
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
