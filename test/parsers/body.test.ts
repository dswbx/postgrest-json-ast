import { describe, test, expect } from 'bun:test'
import { parseBody } from '../../src/parsers/body.js'

function req(method: string, body?: string, contentType?: string) {
  const headers: Record<string, string> = {}
  if (contentType) headers['Content-Type'] = contentType
  return new Request('http://localhost/rest/v1/t', {
    method,
    body,
    headers,
  })
}

describe('parseBody', () => {
  test('GET has no body', async () => {
    expect(await parseBody(req('GET'))).toEqual({})
  })

  test('HEAD has no body', async () => {
    expect(await parseBody(req('HEAD'))).toEqual({})
  })

  test('empty POST body', async () => {
    expect(await parseBody(req('POST', '', 'application/json'))).toEqual({})
  })

  test('JSON object body', async () => {
    const r = await parseBody(req('POST', '{"name":"test","price":99}', 'application/json'))
    expect(r.values).toEqual({ name: 'test', price: 99 })
  })

  test('JSON array body', async () => {
    const r = await parseBody(req('POST', '[{"id":1},{"id":2}]', 'application/json'))
    expect(r.values).toEqual([{ id: 1 }, { id: 2 }])
  })

  test('non-JSON body → raw', async () => {
    const r = await parseBody(req('POST', 'hello world', 'text/plain'))
    expect(r.raw).toBe('hello world')
  })

  test('invalid JSON throws', async () => {
    expect(parseBody(req('POST', '{invalid', 'application/json'))).rejects.toThrow()
  })

  test('PATCH with JSON body', async () => {
    const r = await parseBody(req('PATCH', '{"price":799}', 'application/json'))
    expect(r.values).toEqual({ price: 799 })
  })

  test('DELETE has no body', async () => {
    const r = await parseBody(req('DELETE', '{"id":1}', 'application/json'))
    // DELETE does read body if present (not GET/HEAD)
    expect(r.values).toEqual({ id: 1 })
  })

  test('application/xml content type → raw', async () => {
    const r = await parseBody(req('POST', '<data>hello</data>', 'application/xml'))
    expect(r.raw).toBe('<data>hello</data>')
  })
})
