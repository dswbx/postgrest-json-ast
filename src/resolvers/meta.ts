import type { HeadersResult, QueryParamsResult, Meta } from '../types.js'

export function resolveMeta(headers: HeadersResult, queryParams: QueryParamsResult, method: string): Meta {
  const meta: Meta = {}

  // From Prefer tokens
  for (const token of headers.preferTokens) {
    switch (token.key) {
      case 'count':
        meta.count = token.value
        break
      case 'missing':
        meta.missing = token.value
        break
      case 'handling':
        meta.handling = token.value
        break
      case 'tx':
        if (token.value === 'rollback') meta.rollback = true
        break
      case 'max-affected':
        meta.maxAffected = token.value
        break
      case 'timezone':
        meta.timezone = token.value
        break
    }
  }

  // HEAD request
  if (method.toUpperCase() === 'HEAD') {
    meta.head = true
  }

  // Accept header → cardinality
  if (headers.accept.includes('application/vnd.pgrst.object+json')) {
    meta.cardinality = 'one'
  }

  // Explain
  if (headers.accept.includes('application/vnd.pgrst.plan+')) {
    meta.explain = parseExplainAccept(headers.accept)
  }

  // columns param
  const columnsParam = queryParams.get('columns')
  if (columnsParam) {
    const raw = columnsParam[0]
    meta.columns = raw.split(',').map(c => c.trim().replace(/^"|"$/g, ''))
  }

  return meta
}

function parseExplainAccept(accept: string): Meta['explain'] {
  const result: NonNullable<Meta['explain']> = {}

  // Parse options from: application/vnd.pgrst.plan+format; for="..."; options=analyze|verbose;
  const optionsMatch = accept.match(/options=([^;]+)/)
  if (optionsMatch) {
    const flags = optionsMatch[1].split('|').map(f => f.trim())
    result.analyze = flags.includes('analyze')
    result.verbose = flags.includes('verbose')
    result.settings = flags.includes('settings')
    result.buffers = flags.includes('buffers')
    result.wal = flags.includes('wal')
  }

  return result
}
