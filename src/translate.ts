import type { AST, SelectEntry, EmbedDef, TranslatorConfig } from './types.js'
import { parseRoute as defaultParseRoute } from './parsers/route.js'
import { parseHeaders as defaultParseHeaders } from './parsers/headers.js'
import { parseSelect as defaultParseSelect } from './parsers/select.js'
import { parseBody as defaultParseBody } from './parsers/body.js'
import { parseQueryParams as defaultParseQueryParams } from './parsers/query-params.js'
import { resolveType as defaultResolveType } from './resolvers/type.js'
import { resolveFilters as defaultResolveFilters } from './resolvers/filters.js'
import { resolveTransforms as defaultResolveTransforms } from './resolvers/transforms.js'
import { resolveMeta as defaultResolveMeta } from './resolvers/meta.js'
import { resolveRpcParams as defaultResolveRpcParams } from './resolvers/rpc-params.js'
import { resolveUpsertParams as defaultResolveUpsertParams } from './resolvers/upsert-params.js'
import { isFilter, RESERVED_KEYS } from './utils/operators.js'

export async function translate(req: Request, config?: TranslatorConfig): Promise<AST> {
  const basePath = config?.basePath ?? '/rest/v1'

  const _parseRoute = config?.parseRoute ?? ((r: Request) => defaultParseRoute(r, basePath))
  const _parseHeaders = config?.parseHeaders ?? defaultParseHeaders
  const _parseSelect = config?.parseSelect ?? defaultParseSelect
  const _parseBody = config?.parseBody ?? defaultParseBody
  const _parseQueryParams = config?.parseQueryParams ?? defaultParseQueryParams
  const _resolveType = config?.resolveType ?? defaultResolveType
  const _resolveFilters = config?.resolveFilters ?? defaultResolveFilters
  const _resolveTransforms = config?.resolveTransforms ?? defaultResolveTransforms
  const _resolveMeta = config?.resolveMeta ?? defaultResolveMeta
  const _resolveRpcParams = config?.resolveRpcParams ?? defaultResolveRpcParams
  const _resolveUpsertParams = config?.resolveUpsertParams ?? defaultResolveUpsertParams

  // Phase 1 — parallel extraction
  const [route, headers, select, body, queryParams] = await Promise.all([
    _parseRoute(req),
    _parseHeaders(req),
    _parseSelect(req),
    _parseBody(req),
    _parseQueryParams(req),
  ])

  // Phase 2 — resolution
  const method = req.method
  const type = _resolveType(route, method, headers)

  // For RPC GET, filter out arg params before resolveFilters
  let filterParams = queryParams
  if (route.isRpc && method.toUpperCase() === 'GET') {
    filterParams = new Map()
    for (const [key, values] of queryParams) {
      if (RESERVED_KEYS.has(key)) {
        filterParams.set(key, values)
        continue
      }
      // Only include params that look like filters
      const filterValues = values.filter(v => isFilter(v))
      if (filterValues.length > 0) {
        filterParams.set(key, filterValues)
      }
    }
  }

  const filters = _resolveFilters(filterParams, select.embeddedAliases)
  const transforms = _resolveTransforms(queryParams, select.embeddedAliases)
  const meta = _resolveMeta(headers, queryParams, method)
  const rpc = _resolveRpcParams(route, method, queryParams, body)
  const upsert = type === 'upsert' ? _resolveUpsertParams(queryParams, headers) : undefined

  // Assemble
  return assemble(type, route, headers, select, body, filters, transforms, meta, rpc, upsert)
}

function assemble(
  type: AST['type'],
  route: Awaited<ReturnType<typeof defaultParseRoute>>,
  headers: Awaited<ReturnType<typeof defaultParseHeaders>>,
  select: Awaited<ReturnType<typeof defaultParseSelect>>,
  body: Awaited<ReturnType<typeof defaultParseBody>>,
  filters: ReturnType<typeof defaultResolveFilters>,
  transforms: ReturnType<typeof defaultResolveTransforms>,
  meta: ReturnType<typeof defaultResolveMeta>,
  rpc: ReturnType<typeof defaultResolveRpcParams>,
  upsert: ReturnType<typeof defaultResolveUpsertParams> | undefined,
): AST {
  const ast: AST = { type }

  // from / function
  if (route.isRpc) {
    ast.function = route.function
  } else {
    ast.from = route.from
  }

  // schema
  if (headers.schema) ast.schema = headers.schema

  // join
  if (Object.keys(select.join).length > 0) {
    ast.join = select.join
  }

  // select — merge embedded wheres/transforms into embed entries
  if (select.select.length > 0) {
    ast.select = mergeEmbeddedData(
      select.select,
      filters.embeddedWheres,
      transforms.embeddedTransforms,
    )
  }

  // where
  if (Object.keys(filters.where).length > 0) {
    ast.where = filters.where
  }

  // values (insert/update/upsert)
  if (type === 'insert' || type === 'update' || type === 'upsert') {
    if (body.values !== undefined) {
      ast.values = body.values
    }
  }

  // RPC fields
  if (type === 'rpc') {
    if (rpc.args !== undefined) ast.args = rpc.args
    if (rpc.httpMethod) ast.httpMethod = rpc.httpMethod
    if (rpc.paramsType) ast.paramsType = rpc.paramsType
    if (rpc.inputType) ast.inputType = rpc.inputType
  }

  // Upsert fields
  if (type === 'upsert' && upsert) {
    if (upsert.onConflict) ast.onConflict = upsert.onConflict
    ast.ignoreDuplicates = upsert.ignoreDuplicates
  }

  // transforms
  if (transforms.order) ast.order = transforms.order
  if (transforms.limit !== undefined) ast.limit = transforms.limit
  if (transforms.offset !== undefined) ast.offset = transforms.offset

  // $meta
  if (Object.keys(meta).length > 0) {
    ast.$meta = meta
  }

  return ast
}

/**
 * Merge embedded wheres and transforms into the select array's embed entries.
 */
function mergeEmbeddedData(
  selectEntries: SelectEntry[],
  embeddedWheres: Record<string, object>,
  embeddedTransforms: Record<string, { order?: any[]; limit?: number; offset?: number }>,
): SelectEntry[] {
  return selectEntries.map(entry => {
    if (typeof entry === 'string') return entry

    const key = Object.keys(entry)[0]
    const def = entry[key] as any

    // Only merge into embed entries (those with 'select')
    if (!def.select) return entry

    const embedDef: EmbedDef = { ...def }

    // Merge where
    if (embeddedWheres[key]) {
      embedDef.where = embeddedWheres[key]
    }

    // Merge transforms
    if (embeddedTransforms[key]) {
      const t = embeddedTransforms[key]
      if (t.order) embedDef.order = t.order
      if (t.limit !== undefined) embedDef.limit = t.limit
      if (t.offset !== undefined) embedDef.offset = t.offset
    }

    // Recursively merge nested embeds
    if (embedDef.select) {
      embedDef.select = mergeEmbeddedData(embedDef.select, embeddedWheres, embeddedTransforms)
    }

    return { [key]: embedDef }
  })
}
