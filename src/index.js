import { args, flow, get, isArray, map } from 'lodash/fp'
import * as funcOptions from './funcs'

// console.log(funcOptions)
export function getFunc(funcId) {
  return get(funcId, funcOptions)
}
export function directiveToFunc(directive) {
  if (isArray(directive)) {
    const [funcId, arg] = directive
    if (funcId === 'over') {
      return getFunc(funcId)(map(directiveToFunc, arg))
    }
    return getFunc(funcId)(arg)
  }
  return _.identity
}

// Assume you send it an array of directives.
export function evaluate(directives) {
  const args = map(directiveToFunc, directives)
  return flow(args)
}
