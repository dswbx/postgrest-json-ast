import type { QueryParamsResult, FiltersResult, Where } from '../types.js'
import { RESERVED_KEYS, parseOperator } from '../utils/operators.js'
import { parseInList, parseArrayLiteral, coerceValue } from '../utils/values.js'

export function resolveFilters(
  queryParams: QueryParamsResult,
  embeddedAliases: Set<string>,
): FiltersResult {
  const where: Where = {}
  const embeddedWheres: Record<string, Where> = {}

  for (const [key, values] of queryParams) {
    if (RESERVED_KEYS.has(key)) continue

    // Check for embedded prefix: "alias.column" or "alias.or" etc.
    const dotIdx = key.indexOf('.')
    if (dotIdx > 0) {
      const prefix = key.slice(0, dotIdx)
      const rest = key.slice(dotIdx + 1)
      if (embeddedAliases.has(prefix)) {
        // Skip embedded transform keys — handled by resolveTransforms
        if (rest === 'order' || rest === 'limit' || rest === 'offset') continue
        if (!embeddedWheres[prefix]) embeddedWheres[prefix] = {}
        processFilterKey(rest, values, embeddedWheres[prefix])
        continue
      }
    }

    // Top-level filter
    processFilterKey(key, values, where)
  }

  return { where, embeddedWheres }
}

function processFilterKey(key: string, values: string[], where: Where): void {
  if (key === 'or' || key === 'and') {
    // Logical group
    const parsed = values.map(v => parseLogicalGroup(v))
    const flattened = parsed.length === 1 ? parsed[0] : parsed.flat()
    where[`$${key}`] = flattened
    return
  }

  if (key === 'not.or' || key === 'not.and') {
    const logicKey = key.slice(4) // "or" or "and"
    const parsed = values.map(v => parseLogicalGroup(v))
    const flattened = parsed.length === 1 ? parsed[0] : parsed.flat()
    where['$not'] = { [`$${logicKey}`]: flattened }
    return
  }

  // Column filter — may have multiple values (AND semantics)
  for (const value of values) {
    const parsed = parseFilterValue(value)
    if (!where[key]) {
      where[key] = parsed
    } else {
      // Merge into existing — AND semantics
      Object.assign(where[key] as object, parsed)
    }
  }
}

function parseFilterValue(value: string): Record<string, unknown> {
  let remaining = value
  let negated = false

  // Check for not. prefix
  if (remaining.startsWith('not.')) {
    negated = true
    remaining = remaining.slice(4)
  }

  // Split operator from value at first dot
  const dotIdx = remaining.indexOf('.')
  let opStr: string
  let valStr: string

  if (dotIdx === -1) {
    // No dot — operator only (e.g. "is" without value? shouldn't happen, but handle)
    opStr = remaining
    valStr = ''
  } else {
    opStr = remaining.slice(0, dotIdx)
    valStr = remaining.slice(dotIdx + 1)
  }

  // Handle quantified operators: eq(any), like(all), etc.
  // The opStr might be "eq(any)" — check if valStr starts with the actual value
  // Actually opStr is everything before first dot, so "eq(any)" is opStr, rest is valStr
  // But for "in.(1,2,3)", opStr="in" and valStr="(1,2,3)"

  const opResult = parseOperator(opStr)
  if (!opResult) {
    throw new Error(`Unknown operator: "${opStr}"`)
  }

  const { astOp, ftsType, ftsConfig } = opResult

  // Special case: not.in → $notIn
  if (negated && astOp === '$in') {
    return { '$notIn': parseFilterOperandValue(astOp, valStr) }
  }

  const operand = astOp === '$textSearch'
    ? buildTextSearchValue(valStr, ftsType, ftsConfig)
    : parseFilterOperandValue(astOp, valStr)

  if (negated) {
    return { '$not': { [astOp]: operand } }
  }

  return { [astOp]: operand }
}

function parseFilterOperandValue(astOp: string, valStr: string): unknown {
  // in / notIn: (v1,v2,v3)
  if (astOp === '$in' || astOp === '$notIn') {
    return parseInList(valStr)
  }

  // Array operators that take {} array literals or quantified operators
  if (astOp.endsWith('Any') || astOp.endsWith('All')) {
    if (valStr.startsWith('{')) {
      return parseArrayLiteral(valStr)
    }
    return parseInList(valStr)
  }

  // contains/containedBy/overlaps: can be {} array literal or JSON or range string
  if (astOp === '$contains' || astOp === '$containedBy' || astOp === '$overlaps') {
    if (valStr.startsWith('{')) {
      // Could be array literal or JSON object
      try {
        const parsed = JSON.parse(valStr)
        if (typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed
        }
      } catch {
        // Not JSON — parse as array literal
      }
      return parseArrayLiteral(valStr)
    }
    // Range string or JSON
    if (valStr.startsWith('[') || valStr.startsWith('(')) {
      return valStr // range string passed through
    }
    return coerceValue(valStr)
  }

  // Range operators: pass through as string
  if (astOp.startsWith('$range')) {
    return valStr
  }

  // is operator: true/false/null
  if (astOp === '$is') {
    return coerceValue(valStr)
  }

  // Default: coerce scalar
  return coerceValue(valStr)
}

function buildTextSearchValue(
  valStr: string,
  ftsType: string | undefined,
  ftsConfig: string | undefined,
): Record<string, unknown> {
  const result: Record<string, unknown> = { query: valStr }
  if (ftsType) result.type = ftsType
  if (ftsConfig) result.config = ftsConfig
  return result
}

/**
 * Parse a logical group expression: (expr1,expr2,and(expr3,expr4))
 * Returns array of where objects.
 */
function parseLogicalGroup(raw: string): Where[] {
  // Strip outer parens
  let inner = raw
  if (inner.startsWith('(') && inner.endsWith(')')) {
    inner = inner.slice(1, -1)
  }

  const exprs = splitLogicalExpressions(inner)
  return exprs.map(expr => parseSingleLogicalExpr(expr))
}

/**
 * Split comma-separated expressions respecting nested parens.
 */
function splitLogicalExpressions(input: string): string[] {
  const result: string[] = []
  let depth = 0
  let current = ''

  for (const ch of input) {
    if (ch === '(') depth++
    else if (ch === ')') depth--

    if (ch === ',' && depth === 0) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }

  if (current.trim()) result.push(current.trim())
  return result
}

/**
 * Parse a single expression inside or/and group.
 * Formats:
 *   column.operator.value
 *   not.column.operator.value
 *   and(...)
 *   or(...)
 *   not.and(...)
 *   not.or(...)
 */
function parseSingleLogicalExpr(expr: string): Where {
  // Check for nested and/or
  if (expr.startsWith('and(') && expr.endsWith(')')) {
    const inner = expr.slice(4, -1)
    return { '$and': splitLogicalExpressions(inner).map(e => parseSingleLogicalExpr(e)) }
  }
  if (expr.startsWith('or(') && expr.endsWith(')')) {
    const inner = expr.slice(3, -1)
    return { '$or': splitLogicalExpressions(inner).map(e => parseSingleLogicalExpr(e)) }
  }
  if (expr.startsWith('not.and(') && expr.endsWith(')')) {
    const inner = expr.slice(8, -1)
    return { '$not': { '$and': splitLogicalExpressions(inner).map(e => parseSingleLogicalExpr(e)) } }
  }
  if (expr.startsWith('not.or(') && expr.endsWith(')')) {
    const inner = expr.slice(7, -1)
    return { '$not': { '$or': splitLogicalExpressions(inner).map(e => parseSingleLogicalExpr(e)) } }
  }

  // Column filter: column.operator.value or not.column.operator.value
  let remaining = expr
  let negated = false

  if (remaining.startsWith('not.')) {
    negated = true
    remaining = remaining.slice(4)
  }

  // Split: column.operator.value — first dot separates column, rest is operator.value
  const firstDot = remaining.indexOf('.')
  if (firstDot === -1) {
    throw new Error(`Invalid filter expression: "${expr}"`)
  }

  const column = remaining.slice(0, firstDot)
  const operatorAndValue = remaining.slice(firstDot + 1)

  const parsed = parseFilterValue(negated ? `not.${operatorAndValue}` : operatorAndValue)
  return { [column]: parsed }
}
