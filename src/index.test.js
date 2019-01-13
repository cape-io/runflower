import { isFalse } from 'understory'
import { evaluate, directiveToFunc, getFunc } from './'

/* globals describe test expect */

describe('getFunc', () => {
  test('return func by id', () => {
    const func = getFunc('isFalse')
    expect(typeof func).toBe('function')
    expect(func).toBe(isFalse)
    expect(isFalse(false)).toBe(true)
  })
  test('get', () => {
    const func = getFunc('get')
    expect(func('foo', { foo: 'bar' })).toBe('bar')
  })
})

const d1 = ['over', [['constant', '/cape-io/'], ['get', 'url.subdomain'], ['get', 'pathname']]]
const info = { url: { subdomain: 'dev' }, pathname: '/index.html' }
describe('directiveToFunc', () => {
  test('get', () => {
    const func = directiveToFunc(['get', 'foo'])
    expect(typeof func).toBe('function')
    expect(func({ foo: 'bar' })).toBe('bar')
  })
  test('handle over', () => {
    const func = directiveToFunc(d1)
    expect(func(info)).toEqual(['/cape-io/', info.url.subdomain, info.pathname])
  })
})

describe('evaluate', () => {
  test('over join', () => {
    const func = evaluate([d1, ['join', '']])
    expect(func(info)).toBe('/cape-io/dev/index.html')
  })
})
