import { describe, test, expect } from 'bun:test'
import { resolveMeta } from '../../src/resolvers/meta.js'
import type { HeadersResult, QueryParamsResult } from '../../src/types.js'

function headers(tokens: HeadersResult['preferTokens'], accept = 'application/json'): HeadersResult {
  return { preferTokens: tokens, accept }
}

function params(entries: [string, string][]): QueryParamsResult {
  const m = new Map<string, string[]>()
  for (const [k, v] of entries) {
    m.set(k, [v])
  }
  return m
}

describe('resolveMeta', () => {
  test('count from Prefer', () => {
    const r = resolveMeta(headers([{ key: 'count', value: 'exact' }]), new Map(), 'GET')
    expect(r.count).toBe('exact')
  })

  test('missing from Prefer', () => {
    const r = resolveMeta(headers([{ key: 'missing', value: 'default' }]), new Map(), 'POST')
    expect(r.missing).toBe('default')
  })

  test('rollback from tx=rollback', () => {
    const r = resolveMeta(headers([{ key: 'tx', value: 'rollback' }]), new Map(), 'POST')
    expect(r.rollback).toBe(true)
  })

  test('maxAffected', () => {
    const r = resolveMeta(headers([{ key: 'max-affected', value: 100 }]), new Map(), 'PATCH')
    expect(r.maxAffected).toBe(100)
  })

  test('timezone', () => {
    const r = resolveMeta(headers([{ key: 'timezone', value: 'America/Los_Angeles' }]), new Map(), 'GET')
    expect(r.timezone).toBe('America/Los_Angeles')
  })

  test('HEAD → head:true', () => {
    const r = resolveMeta(headers([]), new Map(), 'HEAD')
    expect(r.head).toBe(true)
  })

  test('cardinality from Accept', () => {
    const r = resolveMeta(
      headers([], 'application/vnd.pgrst.object+json'),
      new Map(),
      'GET',
    )
    expect(r.cardinality).toBe('one')
  })

  test('columns param', () => {
    const r = resolveMeta(headers([]), params([['columns', '"product_id","quantity"']]), 'POST')
    expect(r.columns).toEqual(['product_id', 'quantity'])
  })

  test('explain from Accept', () => {
    const r = resolveMeta(
      headers([], 'application/vnd.pgrst.plan+text; for="application/json"; options=analyze|verbose;'),
      new Map(),
      'GET',
    )
    expect(r.explain).toEqual({
      analyze: true,
      verbose: true,
      settings: false,
      buffers: false,
      wal: false,
    })
  })

  test('handling strict', () => {
    const r = resolveMeta(headers([{ key: 'handling', value: 'strict' }]), new Map(), 'GET')
    expect(r.handling).toBe('strict')
  })

  test('count=planned', () => {
    const r = resolveMeta(headers([{ key: 'count', value: 'planned' }]), new Map(), 'GET')
    expect(r.count).toBe('planned')
  })

  test('count=estimated', () => {
    const r = resolveMeta(headers([{ key: 'count', value: 'estimated' }]), new Map(), 'GET')
    expect(r.count).toBe('estimated')
  })

  test('handling=lenient', () => {
    const r = resolveMeta(headers([{ key: 'handling', value: 'lenient' }]), new Map(), 'GET')
    expect(r.handling).toBe('lenient')
  })

  test('explain with JSON format', () => {
    const r = resolveMeta(
      headers([], 'application/vnd.pgrst.plan+json; options=analyze;'),
      new Map(),
      'GET',
    )
    expect(r.explain).toEqual({
      analyze: true,
      verbose: false,
      settings: false,
      buffers: false,
      wal: false,
    })
  })

  test('explain with all 5 flags', () => {
    const r = resolveMeta(
      headers([], 'application/vnd.pgrst.plan+text; options=analyze|verbose|settings|buffers|wal;'),
      new Map(),
      'GET',
    )
    expect(r.explain).toEqual({
      analyze: true,
      verbose: true,
      settings: true,
      buffers: true,
      wal: true,
    })
  })

  test('explain with no options (just format)', () => {
    const r = resolveMeta(
      headers([], 'application/vnd.pgrst.plan+text'),
      new Map(),
      'GET',
    )
    expect(r.explain).toEqual({})
  })

  test('multiple Prefer tokens combined', () => {
    const r = resolveMeta(
      headers([
        { key: 'count', value: 'exact' },
        { key: 'handling', value: 'lenient' },
        { key: 'missing', value: 'default' },
      ]),
      new Map(),
      'POST',
    )
    expect(r.count).toBe('exact')
    expect(r.handling).toBe('lenient')
    expect(r.missing).toBe('default')
  })
})
