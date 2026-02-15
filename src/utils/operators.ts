// PostgREST operator → AST operator mapping

export const OPERATORS = new Set([
  'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
  'like', 'ilike', 'match', 'imatch',
  'is', 'isdistinct', 'in',
  'cs', 'cd', 'ov', 'sl', 'sr', 'nxl', 'nxr', 'adj',
  'fts', 'plfts', 'phfts', 'wfts',
  'not',
])

// Base operator map: postgrest name → AST $-prefixed name
const BASE_OP_MAP: Record<string, string> = {
  eq: '$eq',
  neq: '$neq',
  gt: '$gt',
  gte: '$gte',
  lt: '$lt',
  lte: '$lte',
  like: '$like',
  ilike: '$ilike',
  match: '$regex',
  imatch: '$iregex',
  is: '$is',
  isdistinct: '$isDistinct',
  in: '$in',
  cs: '$contains',
  cd: '$containedBy',
  ov: '$overlaps',
  sl: '$rangeLt',
  sr: '$rangeGt',
  nxl: '$rangeGte',
  nxr: '$rangeLte',
  adj: '$rangeAdjacent',
}

// Quantified suffix mapping
const QUANTIFIED_SUFFIX: Record<string, string> = {
  any: 'Any',
  all: 'All',
}

// FTS prefix → type mapping
const FTS_TYPE_MAP: Record<string, string | undefined> = {
  fts: undefined,    // basic — no type
  plfts: 'plain',
  phfts: 'phrase',
  wfts: 'websearch',
}

export type OperatorParseResult = {
  astOp: string
  ftsType?: string
  ftsConfig?: string
}

/**
 * Parse a PostgREST operator string (e.g. "eq", "like(any)", "plfts(english)")
 * into the AST operator name + any FTS metadata.
 */
export function parseOperator(op: string): OperatorParseResult | null {
  // Check for quantified: op(any) or op(all)
  const quantMatch = op.match(/^(\w+)\((any|all)\)$/)
  if (quantMatch) {
    const [, base, quantifier] = quantMatch
    const astBase = BASE_OP_MAP[base]
    if (astBase) {
      return { astOp: astBase + QUANTIFIED_SUFFIX[quantifier] }
    }
    return null
  }

  // Check for FTS with optional config: fts, plfts, phfts, wfts, or with (config)
  const ftsMatch = op.match(/^(p[lh]fts|wfts|fts)(?:\(([^)]+)\))?$/)
  if (ftsMatch) {
    const [, ftsOp, config] = ftsMatch
    return {
      astOp: '$textSearch',
      ftsType: FTS_TYPE_MAP[ftsOp],
      ftsConfig: config,
    }
  }

  // Simple operator
  const astOp = BASE_OP_MAP[op]
  if (astOp) return { astOp }

  return null
}

/**
 * Heuristic: does this query param value look like a PostgREST filter?
 * Used for RPC GET arg vs filter disambiguation.
 */
export function isFilter(value: string): boolean {
  const dot = value.indexOf('.')
  if (dot === -1) return false
  const prefix = value.substring(0, dot)
  // Handle quantified: like(any), eq(all), etc.
  const base = prefix.replace(/\((any|all)\)$/, '')
  // Handle negation prefix: not.eq.val → "not" is in OPERATORS
  return OPERATORS.has(base)
}

// Reserved query param keys that are not filters
export const RESERVED_KEYS = new Set([
  'select', 'order', 'limit', 'offset', 'on_conflict', 'columns',
])
