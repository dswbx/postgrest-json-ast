import { describe, test, expect } from 'bun:test'
import { parseRoute } from '../../src/parsers/route.js'

function req(path: string) {
  return new Request(`http://localhost${path}`)
}

describe('parseRoute', () => {
  test('simple table', () => {
    expect(parseRoute(req('/rest/v1/products'))).toEqual({
      from: 'products',
      isRpc: false,
    })
  })

  test('rpc function', () => {
    expect(parseRoute(req('/rest/v1/rpc/calculate_discount'))).toEqual({
      function: 'calculate_discount',
      isRpc: true,
    })
  })

  test('trailing slash', () => {
    expect(parseRoute(req('/rest/v1/products/'))).toEqual({
      from: 'products',
      isRpc: false,
    })
  })

  test('URL-encoded name', () => {
    expect(parseRoute(req('/rest/v1/my%20table'))).toEqual({
      from: 'my table',
      isRpc: false,
    })
  })

  test('custom base path', () => {
    expect(parseRoute(req('/api/v2/users'), '/api/v2')).toEqual({
      from: 'users',
      isRpc: false,
    })
  })

  test('query params ignored', () => {
    expect(parseRoute(req('/rest/v1/products?select=id'))).toEqual({
      from: 'products',
      isRpc: false,
    })
  })
})
