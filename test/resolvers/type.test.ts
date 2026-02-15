import { describe, test, expect } from 'bun:test'
import { resolveType } from '../../src/resolvers/type.js'
import type { RouteResult, HeadersResult } from '../../src/types.js'

const noHeaders: HeadersResult = { preferTokens: [], accept: 'application/json' }

function headers(tokens: HeadersResult['preferTokens']): HeadersResult {
  return { preferTokens: tokens, accept: 'application/json' }
}

describe('resolveType', () => {
  test('GET table → query', () => {
    expect(resolveType({ from: 'products', isRpc: false }, 'GET', noHeaders)).toBe('query')
  })

  test('HEAD table → query', () => {
    expect(resolveType({ from: 'products', isRpc: false }, 'HEAD', noHeaders)).toBe('query')
  })

  test('POST table → insert', () => {
    expect(resolveType({ from: 'products', isRpc: false }, 'POST', noHeaders)).toBe('insert')
  })

  test('POST table + merge-duplicates → upsert', () => {
    expect(resolveType(
      { from: 'products', isRpc: false },
      'POST',
      headers([{ key: 'resolution', value: 'merge-duplicates' }]),
    )).toBe('upsert')
  })

  test('POST table + ignore-duplicates → upsert', () => {
    expect(resolveType(
      { from: 'products', isRpc: false },
      'POST',
      headers([{ key: 'resolution', value: 'ignore-duplicates' }]),
    )).toBe('upsert')
  })

  test('PATCH → update', () => {
    expect(resolveType({ from: 'products', isRpc: false }, 'PATCH', noHeaders)).toBe('update')
  })

  test('DELETE → delete', () => {
    expect(resolveType({ from: 'products', isRpc: false }, 'DELETE', noHeaders)).toBe('delete')
  })

  test('GET rpc → rpc', () => {
    expect(resolveType({ function: 'search', isRpc: true }, 'GET', noHeaders)).toBe('rpc')
  })

  test('POST rpc → rpc', () => {
    expect(resolveType({ function: 'search', isRpc: true }, 'POST', noHeaders)).toBe('rpc')
  })
})
