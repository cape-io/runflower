const { isFalse } = require('understory')
const { evaluate, directiveToFunc, getFunc } = require('.')

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

const sample = {
  results: 3,
  data: [
    {
      id: 'a', value: 5, instance: 0, src: 200,
    },
    {
      id: 'b', value: 7, instance: 1, src: 224,
    },
    {
      id: 'c', value: 9, instance: 0, src: 224,
    },
  ],
}

describe('directiveToFunc', () => {
  test('get array', () => {
    const func = directiveToFunc(['get', 'foo'])
    expect(typeof func).toBe('function')
    expect(func({ foo: 'bar' })).toBe('bar')
  })
  test('get obj', () => {
    const func = directiveToFunc({ get: 'foo' })
    expect(typeof func).toBe('function')
    expect(func({ foo: 'bar' })).toBe('bar')
  })
  test('get str', () => {
    expect(directiveToFunc('foo')({ foo: 'bar' })).toBe('bar')
  })
  test('add obj', () => {
    expect(directiveToFunc({ add: 10 })(5)).toBe(15)
  })
  test('nth number', () => {
    expect(directiveToFunc(1)(['a', 'b'])).toBe('b')
  })
  test('matches obj', () => {
    const func = directiveToFunc({
      matches: {
        src: 224,
        instance: 0,
      },
    })
    expect(func(sample.data[0])).toBe(false)
    expect(func(sample.data[1])).toBe(false)
    expect(func(sample.data[2])).toBe(true)
  })
  test('handle over', () => {
    const func = directiveToFunc(d1)
    expect(func(info)).toEqual(['/cape-io/', info.url.subdomain, info.pathname])
  })
  test('map obj', () => {
    const directive = {
      flow: [
        { get: 'data' },
        {
          map: {
            flow: [
              { get: 'value' },
              { add: 10 },
            ],
          },
        },
      ],
    }
    const func = directiveToFunc(directive)
    expect(func(sample)).toEqual([
      15,
      17,
      19,
    ])
  })
})

describe('evaluate', () => {
  test('over join', () => {
    const func = evaluate([d1, ['join', '']])
    expect(func(info)).toBe('/cape-io/dev/index.html')
  })
  test('get & nth', () => {
    expect(evaluate(['data', 1, 'id'])(sample)).toBe('b')
  })
})
