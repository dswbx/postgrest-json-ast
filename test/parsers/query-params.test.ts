import { describe, test, expect } from 'bun:test'
import { parseQueryParams } from '../../src/parsers/query-params.js'

function req(qs: string) {
  return new Request(`http://localhost/rest/v1/t?${qs}`)
}

describe('parseQueryParams', () => {
  test('single param', () => {
    const r = parseQueryParams(req('select=id'))
    expect(r.get('select')).toEqual(['id'])
  })

  test('multiple params', () => {
    const r = parseQueryParams(req('select=id&status=eq.active'))
    expect(r.get('select')).toEqual(['id'])
    expect(r.get('status')).toEqual(['eq.active'])
  })

  test('repeated key', () => {
    const r = parseQueryParams(req('price=gte.100&price=lte.500'))
    expect(r.get('price')).toEqual(['gte.100', 'lte.500'])
  })

  test('no params', () => {
    const r = parseQueryParams(new Request('http://localhost/rest/v1/t'))
    expect(r.size).toBe(0)
  })
})
