import type { QueryParamsResult } from '../types.js'

export function parseQueryParams(req: Request): QueryParamsResult {
  const url = new URL(req.url)
  const result: QueryParamsResult = new Map()

  for (const [key, value] of url.searchParams.entries()) {
    const existing = result.get(key) ?? []
    existing.push(value)
    result.set(key, existing)
  }

  return result
}
