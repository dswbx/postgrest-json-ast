import type { AST, TranslatorConfig } from './types.js'
import { translate } from './translate.js'

export { translate } from './translate.js'
export type {
  AST,
  ASTType,
  SelectEntry,
  ColumnDef,
  EmbedDef,
  JoinDef,
  JoinMap,
  Where,
  OrderEntry,
  Meta,
  TextSearchValue,
  ExplainOptions,
  AggregateFunction,
  RouteResult,
  HeadersResult,
  SelectResult,
  BodyResult,
  QueryParamsResult,
  PreferToken,
  FiltersResult,
  TransformsResult,
  RpcResult,
  UpsertResult,
  TranslatorConfig,
} from './types.js'

// Re-export parsers for direct use / testing
export { parseRoute } from './parsers/route.js'
export { parseHeaders } from './parsers/headers.js'
export { parseSelect } from './parsers/select.js'
export { parseBody } from './parsers/body.js'
export { parseQueryParams } from './parsers/query-params.js'

// Re-export resolvers
export { resolveType } from './resolvers/type.js'
export { resolveFilters } from './resolvers/filters.js'
export { resolveTransforms } from './resolvers/transforms.js'
export { resolveMeta } from './resolvers/meta.js'
export { resolveRpcParams } from './resolvers/rpc-params.js'
export { resolveUpsertParams } from './resolvers/upsert-params.js'

// Re-export utils
export { OPERATORS, isFilter, parseOperator, RESERVED_KEYS } from './utils/operators.js'
export { parseInList, parseArrayLiteral, coerceValue } from './utils/values.js'

/**
 * Create a translator with optional config overrides.
 */
export function createTranslator(config?: TranslatorConfig) {
  return {
    translate: (req: Request) => translate(req, config),
  }
}
