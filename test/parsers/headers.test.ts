import { describe, test, expect } from 'bun:test'
import { parseHeaders } from '../../src/parsers/headers.js'

function req(method: string, headers: Record<string, string> = {}) {
  return new Request('http://localhost/rest/v1/test', { method, headers })
}

describe('parseHeaders', () => {
  test('schema from Accept-Profile for GET', () => {
    const r = parseHeaders(req('GET', { 'Accept-Profile': 'public' }))
    expect(r.schema).toBe('public')
  })

  test('schema from Content-Profile for POST', () => {
    const r = parseHeaders(req('POST', { 'Content-Profile': 'public' }))
    expect(r.schema).toBe('public')
  })

  test('no schema', () => {
    const r = parseHeaders(req('GET'))
    expect(r.schema).toBeUndefined()
  })

  test('single Prefer token', () => {
    const r = parseHeaders(req('GET', { Prefer: 'count=exact' }))
    expect(r.preferTokens).toEqual([{ key: 'count', value: 'exact' }])
  })

  test('multiple Prefer tokens', () => {
    const r = parseHeaders(req('POST', {
      Prefer: 'resolution=merge-duplicates, count=exact, missing=default',
    }))
    expect(r.preferTokens).toEqual([
      { key: 'resolution', value: 'merge-duplicates' },
      { key: 'count', value: 'exact' },
      { key: 'missing', value: 'default' },
    ])
  })

  test('max-affected is numeric', () => {
    const r = parseHeaders(req('PATCH', { Prefer: 'max-affected=100' }))
    expect(r.preferTokens).toEqual([{ key: 'max-affected', value: 100 }])
  })

  test('default accept', () => {
    const r = parseHeaders(req('GET'))
    expect(r.accept).toBe('application/json')
  })

  test('custom accept', () => {
    const r = parseHeaders(req('GET', { Accept: 'application/vnd.pgrst.object+json' }))
    expect(r.accept).toBe('application/vnd.pgrst.object+json')
  })

  test('CSV accept', () => {
    const r = parseHeaders(req('GET', { Accept: 'text/csv' }))
    expect(r.accept).toBe('text/csv')
  })

  test('GeoJSON accept', () => {
    const r = parseHeaders(req('GET', { Accept: 'application/geo+json' }))
    expect(r.accept).toBe('application/geo+json')
  })

  test('Prefer with return=representation', () => {
    const r = parseHeaders(req('POST', { Prefer: 'return=representation' }))
    expect(r.preferTokens).toEqual([{ key: 'return', value: 'representation' }])
  })

  test('Content-Profile on PATCH', () => {
    const r = parseHeaders(req('PATCH', { 'Content-Profile': 'api' }))
    expect(r.schema).toBe('api')
  })
})
