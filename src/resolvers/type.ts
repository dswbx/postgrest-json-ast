import type { ASTType, RouteResult, HeadersResult } from '../types.js'

export function resolveType(route: RouteResult, method: string, headers: HeadersResult): ASTType {
  const m = method.toUpperCase()

  if (route.isRpc) return 'rpc'

  switch (m) {
    case 'GET':
    case 'HEAD':
      return 'query'

    case 'POST': {
      // Check for upsert via resolution Prefer token
      const resolution = headers.preferTokens.find(t => t.key === 'resolution')
      if (resolution) return 'upsert'
      return 'insert'
    }

    case 'PATCH':
      return 'update'

    case 'DELETE':
      return 'delete'

    default:
      return 'query'
  }
}
