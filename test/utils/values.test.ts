import { describe, test, expect } from 'bun:test'
import { coerceValue, parseInList, parseArrayLiteral } from '../../src/utils/values.js'

describe('coerceValue', () => {
  test('null', () => expect(coerceValue('null')).toBe(null))
  test('true', () => expect(coerceValue('true')).toBe(true))
  test('false', () => expect(coerceValue('false')).toBe(false))
  test('integer', () => expect(coerceValue('42')).toBe(42))
  test('float', () => expect(coerceValue('3.14')).toBe(3.14))
  test('negative', () => expect(coerceValue('-7')).toBe(-7))
  test('scientific notation', () => expect(coerceValue('1e3')).toBe(1000))
  test('empty string stays string', () => expect(coerceValue('')).toBe(''))
  test('plain string stays string', () => expect(coerceValue('hello')).toBe('hello'))
})

describe('parseInList', () => {
  test('empty ()', () => expect(parseInList('()')).toEqual([]))
  test('single item', () => expect(parseInList('(42)')).toEqual([42]))
  test('multiple items', () => expect(parseInList('(1,2,3)')).toEqual([1, 2, 3]))
  test('quoted strings with commas', () => {
    expect(parseInList('("a,b","c")')).toEqual(['a,b', 'c'])
  })
  test('mixed types', () => {
    expect(parseInList('(1,hello,true,null)')).toEqual([1, 'hello', true, null])
  })
  test('nested quotes', () => {
    // parseInList doesn't handle escaped quotes inside quoted strings —
    // each "" pair produces separate tokens
    expect(parseInList('("he said ""hi""",ok)')).toEqual(['he said ', 'hi', '', 'ok'])
  })
})

describe('parseArrayLiteral', () => {
  test('empty {}', () => expect(parseArrayLiteral('{}')).toEqual([]))
  test('single item', () => expect(parseArrayLiteral('{42}')).toEqual([42]))
  test('mixed types', () => {
    expect(parseArrayLiteral('{1,hello,true}')).toEqual([1, 'hello', true])
  })
  test('escaped quotes in values', () => {
    expect(parseArrayLiteral('{"a\\"b",c}')).toEqual(['a"b', 'c'])
  })
})
