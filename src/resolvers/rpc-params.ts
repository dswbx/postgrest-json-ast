import type { RouteResult, QueryParamsResult, BodyResult, RpcResult } from '../types.js'
import { isFilter, RESERVED_KEYS } from '../utils/operators.js'
import { coerceValue } from '../utils/values.js'

export function resolveRpcParams(
  route: RouteResult,
  method: string,
  queryParams: QueryParamsResult,
  body: BodyResult,
): RpcResult {
  if (!route.isRpc) return {}

  const m = method.toUpperCase()

  if (m === 'POST') {
    const result: RpcResult = { httpMethod: 'POST' }

    if (body.values) {
      if (Array.isArray(body.values)) {
        result.args = body.values
        result.paramsType = 'positional'
      } else {
        result.args = body.values
        result.paramsType = 'named'
      }
      result.inputType = 'json'
    } else if (body.raw !== undefined) {
      result.args = { _raw: body.raw } // pass raw as special key
      result.inputType = 'text'
    }

    return result
  }

  // GET RPC
  const args: Record<string, unknown> = {}

  for (const [key, values] of queryParams) {
    if (RESERVED_KEYS.has(key)) continue

    const val = values[0]

    // Use isFilter heuristic to separate args from filters
    if (!isFilter(val)) {
      args[key] = coerceValue(val)
    }
    // Filters are handled by resolveFilters
  }

  const result: RpcResult = {
    httpMethod: 'GET',
    paramsType: 'named',
    inputType: 'json',
  }

  if (Object.keys(args).length > 0) {
    result.args = args
  }

  return result
}
