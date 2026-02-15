import type { BodyResult } from '../types.js'

export async function parseBody(req: Request): Promise<BodyResult> {
  const method = req.method.toUpperCase()

  // GET/HEAD have no body
  if (method === 'GET' || method === 'HEAD') return {}

  const text = await req.text()
  if (!text) return {}

  const contentType = req.headers.get('Content-Type') ?? ''

  if (contentType.includes('application/json')) {
    try {
      const parsed = JSON.parse(text)
      // Return as values — disambiguation between values/args happens in resolveRpcParams
      if (Array.isArray(parsed)) {
        return { values: parsed }
      }
      return { values: parsed }
    } catch {
      throw new Error(`Invalid JSON body: ${text.slice(0, 100)}`)
    }
  }

  // Non-JSON body (text/xml/binary) — RPC only
  return { raw: text }
}
