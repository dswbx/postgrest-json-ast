import { describe, test, expect } from 'bun:test'
import { parseOperator, isFilter, RESERVED_KEYS } from '../../src/utils/operators.js'

describe('parseOperator', () => {
  // ── Base operators ──
  test('eq', () => expect(parseOperator('eq')).toEqual({ astOp: '$eq' }))
  test('neq', () => expect(parseOperator('neq')).toEqual({ astOp: '$neq' }))
  test('gt', () => expect(parseOperator('gt')).toEqual({ astOp: '$gt' }))
  test('gte', () => expect(parseOperator('gte')).toEqual({ astOp: '$gte' }))
  test('lt', () => expect(parseOperator('lt')).toEqual({ astOp: '$lt' }))
  test('lte', () => expect(parseOperator('lte')).toEqual({ astOp: '$lte' }))
  test('like', () => expect(parseOperator('like')).toEqual({ astOp: '$like' }))
  test('ilike', () => expect(parseOperator('ilike')).toEqual({ astOp: '$ilike' }))
  test('match', () => expect(parseOperator('match')).toEqual({ astOp: '$regex' }))
  test('imatch', () => expect(parseOperator('imatch')).toEqual({ astOp: '$iregex' }))
  test('is', () => expect(parseOperator('is')).toEqual({ astOp: '$is' }))
  test('isdistinct', () => expect(parseOperator('isdistinct')).toEqual({ astOp: '$isDistinct' }))
  test('in', () => expect(parseOperator('in')).toEqual({ astOp: '$in' }))
  test('cs', () => expect(parseOperator('cs')).toEqual({ astOp: '$contains' }))
  test('cd', () => expect(parseOperator('cd')).toEqual({ astOp: '$containedBy' }))
  test('ov', () => expect(parseOperator('ov')).toEqual({ astOp: '$overlaps' }))
  test('sl', () => expect(parseOperator('sl')).toEqual({ astOp: '$rangeLt' }))
  test('sr', () => expect(parseOperator('sr')).toEqual({ astOp: '$rangeGt' }))
  test('nxl', () => expect(parseOperator('nxl')).toEqual({ astOp: '$rangeGte' }))
  test('nxr', () => expect(parseOperator('nxr')).toEqual({ astOp: '$rangeLte' }))
  test('adj', () => expect(parseOperator('adj')).toEqual({ astOp: '$rangeAdjacent' }))

  // ── Quantified combos ──
  test('eq(any)', () => expect(parseOperator('eq(any)')).toEqual({ astOp: '$eqAny' }))
  test('eq(all)', () => expect(parseOperator('eq(all)')).toEqual({ astOp: '$eqAll' }))
  test('neq(any)', () => expect(parseOperator('neq(any)')).toEqual({ astOp: '$neqAny' }))
  test('like(any)', () => expect(parseOperator('like(any)')).toEqual({ astOp: '$likeAny' }))
  test('like(all)', () => expect(parseOperator('like(all)')).toEqual({ astOp: '$likeAll' }))
  test('ilike(any)', () => expect(parseOperator('ilike(any)')).toEqual({ astOp: '$ilikeAny' }))
  test('ilike(all)', () => expect(parseOperator('ilike(all)')).toEqual({ astOp: '$ilikeAll' }))
  test('gte(all)', () => expect(parseOperator('gte(all)')).toEqual({ astOp: '$gteAll' }))

  // ── FTS variants ──
  test('fts (no config)', () => {
    expect(parseOperator('fts')).toEqual({ astOp: '$textSearch', ftsType: undefined, ftsConfig: undefined })
  })
  test('fts with config', () => {
    expect(parseOperator('fts(english)')).toEqual({ astOp: '$textSearch', ftsType: undefined, ftsConfig: 'english' })
  })
  test('plfts', () => {
    expect(parseOperator('plfts')).toEqual({ astOp: '$textSearch', ftsType: 'plain', ftsConfig: undefined })
  })
  test('plfts with config', () => {
    expect(parseOperator('plfts(english)')).toEqual({ astOp: '$textSearch', ftsType: 'plain', ftsConfig: 'english' })
  })
  test('phfts', () => {
    expect(parseOperator('phfts')).toEqual({ astOp: '$textSearch', ftsType: 'phrase', ftsConfig: undefined })
  })
  test('phfts with config', () => {
    expect(parseOperator('phfts(german)')).toEqual({ astOp: '$textSearch', ftsType: 'phrase', ftsConfig: 'german' })
  })
  test('wfts', () => {
    expect(parseOperator('wfts')).toEqual({ astOp: '$textSearch', ftsType: 'websearch', ftsConfig: undefined })
  })
  test('wfts with config', () => {
    expect(parseOperator('wfts(french)')).toEqual({ astOp: '$textSearch', ftsType: 'websearch', ftsConfig: 'french' })
  })

  // ── Unknown ──
  test('unknown → null', () => expect(parseOperator('bogus')).toBe(null))
  test('unknown quantified → null', () => expect(parseOperator('bogus(any)')).toBe(null))
})

describe('isFilter', () => {
  test('plain value → false', () => expect(isFilter('phone')).toBe(false))
  test('op.val → true', () => expect(isFilter('eq.active')).toBe(true))
  test('not.op.val → true', () => expect(isFilter('not.eq.active')).toBe(true))
  test('quantified eq(any).{...} → true', () => expect(isFilter('eq(any).{1,2}')).toBe(true))
  test('in.(list) → true', () => expect(isFilter('in.(1,2,3)')).toBe(true))
  test('number without op → false', () => expect(isFilter('42')).toBe(false))
})

describe('RESERVED_KEYS', () => {
  test('contains expected keys', () => {
    for (const k of ['select', 'order', 'limit', 'offset', 'on_conflict', 'columns']) {
      expect(RESERVED_KEYS.has(k)).toBe(true)
    }
  })
  test('does not contain random key', () => {
    expect(RESERVED_KEYS.has('status')).toBe(false)
  })
})
