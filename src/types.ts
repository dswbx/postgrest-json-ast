// ── AST Output Types ──

export type ASTType = 'query' | 'insert' | 'update' | 'delete' | 'upsert' | 'put' | 'rpc'

export type ColumnDef = {
  column?: string
  cast?: string
  preCast?: string
  aggregate?: AggregateFunction
  path?: string
}

export type EmbedDef = {
  select?: SelectEntry[]
  where?: Where
  order?: OrderEntry[]
  limit?: number
  offset?: number
  spread?: boolean
  join?: JoinMap
}

export type SelectEntry = string | Record<string, ColumnDef | EmbedDef>

export type JoinDef = {
  from?: string
  type?: 'inner' | 'left'
  hint?: string
}

export type JoinMap = Record<string, JoinDef>

export type WhereValue =
  | { [op: string]: unknown }

export type Where = Record<string, unknown>

export type OrderEntry = {
  column: string
  direction?: 'asc' | 'desc'
  nullsFirst?: boolean
}

export type TextSearchValue = {
  query: string
  type?: 'plain' | 'phrase' | 'websearch'
  config?: string
}

export type ExplainOptions = {
  analyze?: boolean
  verbose?: boolean
  settings?: boolean
  buffers?: boolean
  wal?: boolean
}

export type Meta = {
  cardinality?: 'one' | 'maybe' | 'many'
  count?: 'exact' | 'planned' | 'estimated'
  head?: boolean
  maxAffected?: number
  rollback?: boolean
  missing?: 'null' | 'default'
  handling?: 'strict' | 'lenient'
  timezone?: string
  columns?: string[]
  stripNulls?: boolean
  explain?: ExplainOptions
  headers?: Record<string, string>
}

export type AST = {
  type: ASTType
  from?: string
  function?: string
  schema?: string
  join?: JoinMap
  select?: SelectEntry[]
  where?: Where
  values?: object | object[]
  args?: object | unknown[]
  order?: OrderEntry[]
  limit?: number
  offset?: number
  group?: string[]
  onConflict?: string
  ignoreDuplicates?: boolean
  httpMethod?: 'GET' | 'POST'
  paramsType?: 'named' | 'positional'
  inputType?: 'json' | 'text' | 'binary' | 'xml'
  $meta?: Meta
}

// ── Aggregate functions ──

export type AggregateFunction = 'count' | 'sum' | 'avg' | 'min' | 'max'

// ── Phase 1 Intermediate Types ──

export type RouteResult = {
  from?: string
  function?: string
  isRpc: boolean
}

export type PreferToken =
  | { key: 'count'; value: 'exact' | 'planned' | 'estimated' }
  | { key: 'resolution'; value: 'merge-duplicates' | 'ignore-duplicates' }
  | { key: 'return'; value: 'minimal' | 'headers-only' | 'representation' }
  | { key: 'tx'; value: 'commit' | 'rollback' }
  | { key: 'missing'; value: 'default' | 'null' }
  | { key: 'handling'; value: 'strict' | 'lenient' }
  | { key: 'max-affected'; value: number }
  | { key: 'timezone'; value: string }
  | { key: 'params'; value: 'single-object' | 'multiple-objects' }

export type HeadersResult = {
  schema?: string
  preferTokens: PreferToken[]
  accept: string
}

export type SelectResult = {
  select: SelectEntry[]
  join: JoinMap
  embeddedAliases: Set<string>
}

export type BodyResult = {
  values?: object | object[]
  args?: object
  raw?: string
}

export type QueryParamsResult = Map<string, string[]>

// ── Phase 2 Result Types ──

export type FiltersResult = {
  where: Where
  embeddedWheres: Record<string, Where>
}

export type TransformsResult = {
  order?: OrderEntry[]
  limit?: number
  offset?: number
  embeddedTransforms: Record<string, { order?: OrderEntry[]; limit?: number; offset?: number }>
}

export type RpcResult = {
  args?: object | unknown[]
  httpMethod?: 'GET' | 'POST'
  paramsType?: 'named' | 'positional'
  inputType?: 'json' | 'text' | 'binary' | 'xml'
}

export type UpsertResult = {
  onConflict?: string
  ignoreDuplicates: boolean
}

// ── Translator Config ──

export type TranslatorConfig = {
  parseRoute?: (req: Request) => RouteResult
  parseHeaders?: (req: Request) => HeadersResult
  parseSelect?: (req: Request) => SelectResult
  parseBody?: (req: Request) => Promise<BodyResult>
  parseQueryParams?: (req: Request) => QueryParamsResult
  resolveType?: (route: RouteResult, method: string, headers: HeadersResult) => ASTType
  resolveFilters?: (queryParams: QueryParamsResult, embeddedAliases: Set<string>) => FiltersResult
  resolveTransforms?: (queryParams: QueryParamsResult, embeddedAliases: Set<string>) => TransformsResult
  resolveMeta?: (headers: HeadersResult, queryParams: QueryParamsResult, method: string) => Meta
  resolveRpcParams?: (route: RouteResult, method: string, queryParams: QueryParamsResult, body: BodyResult) => RpcResult
  resolveUpsertParams?: (queryParams: QueryParamsResult, headers: HeadersResult) => UpsertResult
  basePath?: string
}
