import { describe, test, expect } from 'bun:test'
import { resolveRpcParams } from '../../src/resolvers/rpc-params.js'
import type { QueryParamsResult, BodyResult } from '../../src/types.js'

function params(entries: [string, string][]): QueryParamsResult {
  const m = new Map<string, string[]>()
  for (const [k, v] of entries) {
    const existing = m.get(k) ?? []
    existing.push(v)
    m.set(k, existing)
  }
  return m
}

describe('resolveRpcParams', () => {
  test('non-RPC returns empty', () => {
    const r = resolveRpcParams({ from: 'test', isRpc: false }, 'GET', new Map(), {})
    expect(r).toEqual({})
  })

  test('POST RPC with object body', () => {
    const body: BodyResult = { values: { product_id: 123, discount: 15 } }
    const r = resolveRpcParams({ function: 'calc', isRpc: true }, 'POST', new Map(), body)
    expect(r).toEqual({
      httpMethod: 'POST',
      args: { product_id: 123, discount: 15 },
      paramsType: 'named',
      inputType: 'json',
    })
  })

  test('POST RPC with array body', () => {
    const body: BodyResult = { values: [1, 2, 3] }
    const r = resolveRpcParams({ function: 'calc', isRpc: true }, 'POST', new Map(), body)
    expect(r).toEqual({
      httpMethod: 'POST',
      args: [1, 2, 3],
      paramsType: 'positional',
      inputType: 'json',
    })
  })

  test('GET RPC — args vs filters', () => {
    const qp = params([
      ['term', 'phone'],
      ['category', 'electronics'],
      ['min_rating', 'gte.4'],
      ['status', 'eq.available'],
      ['select', 'id,name'],
    ])
    const r = resolveRpcParams({ function: 'search', isRpc: true }, 'GET', qp, {})
    expect(r).toEqual({
      httpMethod: 'GET',
      paramsType: 'named',
      inputType: 'json',
      args: { term: 'phone', category: 'electronics' },
    })
  })

  test('GET RPC — no args', () => {
    const qp = params([['status', 'eq.active']])
    const r = resolveRpcParams({ function: 'search', isRpc: true }, 'GET', qp, {})
    expect(r).toEqual({
      httpMethod: 'GET',
      paramsType: 'named',
      inputType: 'json',
    })
  })

  test('POST RPC with raw body', () => {
    const body: BodyResult = { raw: '<xml>data</xml>' }
    const r = resolveRpcParams({ function: 'process', isRpc: true }, 'POST', new Map(), body)
    expect(r.httpMethod).toBe('POST')
    expect(r.inputType).toBe('text')
  })

  test('GET RPC with zero query params', () => {
    const r = resolveRpcParams({ function: 'ping', isRpc: true }, 'GET', new Map(), {})
    expect(r).toEqual({
      httpMethod: 'GET',
      paramsType: 'named',
      inputType: 'json',
    })
  })

  test('POST RPC with text/plain content type body', () => {
    const body: BodyResult = { raw: 'plain text payload' }
    const r = resolveRpcParams({ function: 'echo', isRpc: true }, 'POST', new Map(), body)
    expect(r.httpMethod).toBe('POST')
    expect(r.inputType).toBe('text')
    expect(r.args).toEqual({ _raw: 'plain text payload' })
  })
})
