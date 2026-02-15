import type { SelectResult, SelectEntry, JoinMap, JoinDef, ColumnDef, EmbedDef, AggregateFunction } from '../types.js'

const AGG_FUNCTIONS = new Set<AggregateFunction>(['count', 'sum', 'avg', 'min', 'max'])

// ── Cursor ──

type Cursor = { input: string; pos: number }

function peek(c: Cursor): string {
  return c.input[c.pos] ?? ''
}

function advance(c: Cursor, n = 1): void {
  c.pos += n
}

function isAtEnd(c: Cursor): boolean {
  return c.pos >= c.input.length
}

function startsWith(c: Cursor, str: string): boolean {
  return c.input.startsWith(str, c.pos)
}

function isLetter(ch: string): boolean {
  return /^[a-zA-Z0-9_]$/.test(ch)
}

function eatWhitespace(c: Cursor): void {
  while (!isAtEnd(c) && /\s/.test(peek(c))) {
    advance(c)
  }
}

// ── Parser ──

export function parseSelect(req: Request): SelectResult {
  const url = new URL(req.url)
  const selectParam = url.searchParams.get('select')

  if (selectParam === null || selectParam === undefined) {
    return { select: [], join: {}, embeddedAliases: new Set() }
  }

  if (selectParam === '') {
    return { select: [], join: {}, embeddedAliases: new Set() }
  }

  const join: JoinMap = {}
  const embeddedAliases = new Set<string>()

  const c: Cursor = { input: selectParam, pos: 0 }
  const select = parseQuery(c, join, embeddedAliases)

  eatWhitespace(c)
  if (!isAtEnd(c)) {
    throw new Error(`Unexpected input at position ${c.pos}: "${c.input.slice(c.pos)}"`)
  }

  return { select, join, embeddedAliases }
}

function parseQuery(c: Cursor, join: JoinMap, embeddedAliases: Set<string>): SelectEntry[] {
  const nodes: SelectEntry[] = []

  eatWhitespace(c)
  if (isAtEnd(c) || peek(c) === ')') return nodes

  nodes.push(parseNode(c, join, embeddedAliases))

  while (!isAtEnd(c)) {
    eatWhitespace(c)
    if (peek(c) !== ',') break
    advance(c) // skip comma
    eatWhitespace(c)
    nodes.push(parseNode(c, join, embeddedAliases))
  }

  return nodes
}

function parseNode(c: Cursor, join: JoinMap, embeddedAliases: Set<string>): SelectEntry {
  eatWhitespace(c)

  // Star
  if (peek(c) === '*') {
    advance(c)
    return '*'
  }

  // Spread: ...field
  if (startsWith(c, '...')) {
    advance(c, 3)
    eatWhitespace(c)
    return parseSpreadField(c, join, embeddedAliases)
  }

  // Try to parse identifier — could be alias:field or just field
  const ident = parseIdentifier(c)

  eatWhitespace(c)

  // Check for typecast before alias check — if next is :: it's not an alias
  if (startsWith(c, '::')) {
    // Not an alias — parse as field starting from this identifier
    return parseFieldFromIdent(ident, undefined, c, join, embeddedAliases)
  }

  // Check for alias: identifier ":"
  if (peek(c) === ':') {
    advance(c) // skip ':'
    eatWhitespace(c)
    const alias = ident
    return parseFieldWithAlias(alias, c, join, embeddedAliases)
  }

  // Otherwise just a field
  return parseFieldFromIdent(ident, undefined, c, join, embeddedAliases)
}

function parseSpreadField(c: Cursor, join: JoinMap, embeddedAliases: Set<string>): SelectEntry {
  const ident = parseIdentifier(c)
  eatWhitespace(c)

  // Spread must be an embed: ...table(fields) or ...table!mod(fields)
  const { hint, innerJoin } = tryParseModifiers(c)

  eatWhitespace(c)
  if (peek(c) !== '(') {
    throw new Error(`Expected "(" for spread embed at position ${c.pos}`)
  }

  const { subSelect, subJoin } = parseEmbeddedResource(c, join, embeddedAliases)
  const alias = ident

  const joinDef: JoinDef = {}
  if (innerJoin) joinDef.type = 'inner'
  if (hint) joinDef.hint = hint
  join[alias] = joinDef
  embeddedAliases.add(alias)

  const embedDef: EmbedDef = {
    spread: true,
    select: subSelect,
  }
  if (Object.keys(subJoin).length > 0) {
    embedDef.join = subJoin
  }

  return { [alias]: embedDef }
}

function parseFieldWithAlias(alias: string, c: Cursor, join: JoinMap, embeddedAliases: Set<string>): SelectEntry {
  const ident = parseIdentifier(c)
  eatWhitespace(c)
  return parseFieldFromIdent(ident, alias, c, join, embeddedAliases)
}

function parseFieldFromIdent(
  ident: string,
  alias: string | undefined,
  c: Cursor,
  join: JoinMap,
  embeddedAliases: Set<string>,
): SelectEntry {
  eatWhitespace(c)

  // Check for standalone count() — must come before embed check
  if (ident === 'count' && (isAtEnd(c) || peek(c) === ',' || peek(c) === ')' || startsWith(c, '()') || startsWith(c, '::'))) {
    return parseCountField(alias, c)
  }

  // Check for modifiers (!) or embedded resource (()
  if (peek(c) === '!' || peek(c) === '(') {
    return parseEmbedField(ident, alias, c, join, embeddedAliases)
  }

  // Non-embed field: identifier [json_path] [typecast] [aggregation] [typecast]
  return parseNonEmbedField(ident, alias, c)
}

function parseEmbedField(
  ident: string,
  alias: string | undefined,
  c: Cursor,
  join: JoinMap,
  embeddedAliases: Set<string>,
): SelectEntry {
  const { hint, innerJoin } = tryParseModifiers(c)

  eatWhitespace(c)
  if (peek(c) !== '(') {
    // Not an embed after all — treat as non-embed
    // But this shouldn't happen since we only call this when peek is ! or (
    return parseNonEmbedField(ident, alias, c)
  }

  const { subSelect, subJoin } = parseEmbeddedResource(c, join, embeddedAliases)

  const embedAlias = alias ?? ident
  const joinDef: JoinDef = {}
  if (alias) joinDef.from = ident
  if (innerJoin) joinDef.type = 'inner'
  if (hint) joinDef.hint = hint

  join[embedAlias] = joinDef
  embeddedAliases.add(embedAlias)

  const embedDef: EmbedDef = {
    select: subSelect,
  }
  if (Object.keys(subJoin).length > 0) {
    embedDef.join = subJoin
  }

  return { [embedAlias]: embedDef }
}

function tryParseModifiers(c: Cursor): { hint?: string; innerJoin?: boolean } {
  eatWhitespace(c)
  if (peek(c) !== '!') return {}

  advance(c) // skip '!'

  const mod = parseIdentifier(c)

  if (mod === 'inner') return { innerJoin: true }
  if (mod === 'left') return {} // explicit left = default

  // It's a hint
  const hint = mod
  eatWhitespace(c)

  if (peek(c) === '!') {
    advance(c)
    const joinMod = parseIdentifier(c)
    if (joinMod === 'inner') return { hint, innerJoin: true }
    if (joinMod === 'left') return { hint }
    throw new Error(`Expected "inner" or "left" after hint, got "${joinMod}" at position ${c.pos}`)
  }

  return { hint }
}

function parseEmbeddedResource(
  c: Cursor,
  parentJoin: JoinMap,
  parentAliases: Set<string>,
): { subSelect: SelectEntry[]; subJoin: JoinMap } {
  if (peek(c) !== '(') {
    throw new Error(`Expected "(" at position ${c.pos}`)
  }
  advance(c) // skip '('
  eatWhitespace(c)

  const subJoin: JoinMap = {}
  const subAliases = new Set<string>()

  if (peek(c) === ')') {
    advance(c) // empty embed → select all
    return { subSelect: ['*'], subJoin }
  }

  const subSelect = parseQuery(c, subJoin, subAliases)

  eatWhitespace(c)
  if (peek(c) !== ')') {
    throw new Error(`Expected ")" at position ${c.pos}`)
  }
  advance(c)

  return { subSelect, subJoin }
}

function parseCountField(alias: string | undefined, c: Cursor): SelectEntry {
  eatWhitespace(c)

  // Optional ()
  if (startsWith(c, '()')) {
    advance(c, 2)
  }

  eatWhitespace(c)

  // Optional typecast
  let cast: string | undefined
  if (startsWith(c, '::')) {
    advance(c, 2)
    cast = parseIdentifier(c)
  }

  const key = alias ?? 'count'
  const def: ColumnDef = { aggregate: 'count' }
  if (cast) def.cast = cast

  return { [key]: def }
}

function parseNonEmbedField(ident: string, alias: string | undefined, c: Cursor): SelectEntry {
  eatWhitespace(c)

  // JSON path
  let jsonPath: string | undefined
  let jsonAlias: string | undefined
  if (startsWith(c, '->')) {
    const { path, lastProp } = parseJsonPath(c)
    jsonPath = path
    jsonAlias = lastProp
  }

  eatWhitespace(c)

  // Pre-aggregate typecast
  let preCast: string | undefined
  let postCast: string | undefined
  if (startsWith(c, '::')) {
    advance(c, 2)
    const castIdent = parseIdentifier(c)
    eatWhitespace(c)

    // Check if there's an aggregation after — if so this is preCast
    if (peek(c) === '.' && !isAtEnd(c)) {
      const nextChar = c.input[c.pos + 1] ?? ''
      if (isLetter(nextChar)) {
        // Peek ahead to see if this is an agg function
        const saved = c.pos
        advance(c) // skip '.'
        const fnName = parseIdentifier(c)
        if (AGG_FUNCTIONS.has(fnName as AggregateFunction) && startsWith(c, '()')) {
          // It is preCast + aggregation
          preCast = castIdent
          advance(c, 2) // skip ()
          eatWhitespace(c)
          // Optional post-aggregate cast
          if (startsWith(c, '::')) {
            advance(c, 2)
            postCast = parseIdentifier(c)
          }
          return buildNonEmbedEntry(ident, alias, jsonPath, jsonAlias, preCast, fnName as AggregateFunction, postCast)
        }
        // Not an agg — restore and treat as regular cast
        c.pos = saved
      }
    }
    // No aggregation follows — this is a regular cast
    postCast = castIdent
  }

  // Aggregation (without preceding cast)
  let aggregate: AggregateFunction | undefined
  if (peek(c) === '.' && !isAtEnd(c)) {
    const nextChar = c.input[c.pos + 1] ?? ''
    if (isLetter(nextChar)) {
      const saved = c.pos
      advance(c) // skip '.'
      const fnName = parseIdentifier(c)
      if (AGG_FUNCTIONS.has(fnName as AggregateFunction) && startsWith(c, '()')) {
        aggregate = fnName as AggregateFunction
        advance(c, 2)
        eatWhitespace(c)
        // Optional post-aggregate cast
        if (startsWith(c, '::')) {
          advance(c, 2)
          postCast = parseIdentifier(c)
        }
      } else {
        // Not an agg function — restore
        c.pos = saved
      }
    }
  }

  return buildNonEmbedEntry(ident, alias, jsonPath, jsonAlias, preCast, aggregate, postCast)
}

function buildNonEmbedEntry(
  ident: string,
  alias: string | undefined,
  jsonPath: string | undefined,
  jsonAlias: string | undefined,
  preCast: string | undefined,
  aggregate: AggregateFunction | undefined,
  postCast: string | undefined,
): SelectEntry {
  const effectiveAlias = alias ?? jsonAlias

  // Simple case: no alias, no cast, no aggregate, no json path
  if (!effectiveAlias && !preCast && !postCast && !aggregate && !jsonPath) {
    return ident
  }

  const key = effectiveAlias ?? ident
  const def: ColumnDef = {}

  // Set column if different from key
  if (ident !== key) {
    def.column = ident
  }

  // For aggregates, always include column if it exists (even if same as key)
  if (aggregate && !def.column && ident === key) {
    def.column = ident
  }

  if (jsonPath) {
    if (!def.column) def.column = ident
    def.path = jsonPath
  }
  if (preCast) def.preCast = preCast
  if (aggregate) def.aggregate = aggregate
  if (postCast) def.cast = postCast

  return { [key]: def }
}

function parseJsonPath(c: Cursor): { path: string; lastProp: string } {
  const parts: string[] = []
  let lastProp = ''

  while (startsWith(c, '->')) {
    advance(c, 2) // skip ->

    // Check for ->> (text extraction)
    if (peek(c) === '>') {
      advance(c) // skip extra >
    }

    const prop = parseIdentifier(c)
    parts.push(prop)
    lastProp = prop
  }

  const jsonPath = '$.' + parts.join('.')
  return { path: jsonPath, lastProp }
}

function parseIdentifier(c: Cursor): string {
  eatWhitespace(c)

  // Quoted identifier
  if (peek(c) === '"') {
    advance(c) // skip opening quote
    let name = ''
    while (!isAtEnd(c) && peek(c) !== '"') {
      name += peek(c)
      advance(c)
    }
    if (isAtEnd(c)) {
      throw new Error(`Missing closing quote at position ${c.pos}`)
    }
    advance(c) // skip closing quote
    return name
  }

  // Unquoted identifier
  let name = ''
  while (!isAtEnd(c) && isLetter(peek(c))) {
    name += peek(c)
    advance(c)
  }

  if (name === '') {
    throw new Error(`Expected identifier at position ${c.pos}`)
  }

  return name
}
