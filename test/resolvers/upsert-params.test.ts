import { describe, test, expect } from 'bun:test'
import { resolveUpsertParams } from '../../src/resolvers/upsert-params.js'
import type { HeadersResult, QueryParamsResult } from '../../src/types.js'

function headers(tokens: HeadersResult['preferTokens']): HeadersResult {
  return { preferTokens: tokens, accept: 'application/json' }
}

function params(entries: [string, string][]): QueryParamsResult {
  const m = new Map<string, string[]>()
  for (const [k, v] of entries) {
    m.set(k, [v])
  }
  return m
}

describe('resolveUpsertParams', () => {
  test('merge-duplicates', () => {
    const r = resolveUpsertParams(
      params([['on_conflict', 'product_id']]),
      headers([{ key: 'resolution', value: 'merge-duplicates' }]),
    )
    expect(r).toEqual({ onConflict: 'product_id', ignoreDuplicates: false })
  })

  test('ignore-duplicates', () => {
    const r = resolveUpsertParams(
      new Map(),
      headers([{ key: 'resolution', value: 'ignore-duplicates' }]),
    )
    expect(r).toEqual({ onConflict: undefined, ignoreDuplicates: true })
  })

  test('no on_conflict', () => {
    const r = resolveUpsertParams(
      new Map(),
      headers([{ key: 'resolution', value: 'merge-duplicates' }]),
    )
    expect(r).toEqual({ onConflict: undefined, ignoreDuplicates: false })
  })
})
