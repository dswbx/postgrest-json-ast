import type { HeadersResult, PreferToken } from '../types.js'

export function parseHeaders(req: Request): HeadersResult {
  const method = req.method.toUpperCase()

  // Schema from Accept-Profile (GET/HEAD) or Content-Profile (POST/PATCH/DELETE)
  let schema: string | undefined
  if (method === 'GET' || method === 'HEAD') {
    schema = req.headers.get('Accept-Profile') ?? undefined
  } else {
    schema = req.headers.get('Content-Profile') ?? undefined
  }

  // Tokenize Prefer header(s) — may appear multiple times
  const preferTokens: PreferToken[] = []
  const preferValues: string[] = []

  // Collect all Prefer header values
  const preferHeader = req.headers.get('Prefer')
  if (preferHeader) {
    preferValues.push(preferHeader)
  }

  for (const raw of preferValues) {
    const tokens = raw.split(',').map(t => t.trim()).filter(Boolean)
    for (const token of tokens) {
      const eqIdx = token.indexOf('=')
      if (eqIdx === -1) continue

      const key = token.slice(0, eqIdx).trim()
      const value = token.slice(eqIdx + 1).trim()

      if (key === 'max-affected') {
        preferTokens.push({ key: 'max-affected', value: Number(value) })
      } else {
        preferTokens.push({ key, value } as PreferToken)
      }
    }
  }

  const accept = req.headers.get('Accept') ?? 'application/json'

  return { schema, preferTokens, accept }
}
