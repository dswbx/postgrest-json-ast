import type { QueryParamsResult, HeadersResult, UpsertResult } from '../types.js'

export function resolveUpsertParams(
  queryParams: QueryParamsResult,
  headers: HeadersResult,
): UpsertResult {
  const onConflictParam = queryParams.get('on_conflict')
  const onConflict = onConflictParam ? onConflictParam[0] : undefined

  const resolution = headers.preferTokens.find(t => t.key === 'resolution')
  const ignoreDuplicates = resolution?.value === 'ignore-duplicates'

  return { onConflict, ignoreDuplicates }
}
