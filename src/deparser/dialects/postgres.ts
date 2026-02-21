import {
  Kysely, DummyDriver,
  PostgresAdapter, PostgresIntrospector, PostgresQueryCompiler,
  sql,
} from 'kysely'
import { jsonArrayFrom, jsonObjectFrom } from 'kysely/helpers/postgres'
import type { DialectConfig, OperatorHandler } from '../types.js'
import type { TextSearchValue } from '../../types.js'
import { baseOperators } from '../operators.js'

const db = new Kysely<any>({
  dialect: {
    createAdapter: () => new PostgresAdapter(),
    createDriver: () => new DummyDriver(),
    createIntrospector: (db) => new PostgresIntrospector(db),
    createQueryCompiler: () => new PostgresQueryCompiler(),
  },
})

const pgOperators: Record<string, OperatorHandler> = {
  $ilike: (eb, col, val) => eb(col, 'ilike', val as string),
  $regex: (_eb, col, val) => sql`${sql.ref(col)} ~ ${val}` as any,
  $iregex: (_eb, col, val) => sql`${sql.ref(col)} ~* ${val}` as any,
  $contains: (_eb, col, val) => sql`${sql.ref(col)} @> ${val}` as any,
  $containedBy: (_eb, col, val) => sql`${sql.ref(col)} <@ ${val}` as any,
  $overlaps: (_eb, col, val) => sql`${sql.ref(col)} && ${val}` as any,
  $rangeLt: (_eb, col, val) => sql`${sql.ref(col)} << ${val}` as any,
  $rangeGt: (_eb, col, val) => sql`${sql.ref(col)} >> ${val}` as any,
  $rangeGte: (_eb, col, val) => sql`${sql.ref(col)} &< ${val}` as any,
  $rangeLte: (_eb, col, val) => sql`${sql.ref(col)} &> ${val}` as any,
  $rangeAdjacent: (_eb, col, val) => sql`${sql.ref(col)} -|- ${val}` as any,
  $isDistinct: (_eb, col, val) => sql`${sql.ref(col)} is distinct from ${val}` as any,
  $textSearch: (_eb, col, val) => {
    const ts = val as TextSearchValue
    const config = ts.config || 'english'
    let fn = 'to_tsquery'
    if (ts.type === 'plain') fn = 'plainto_tsquery'
    else if (ts.type === 'phrase') fn = 'phraseto_tsquery'
    else if (ts.type === 'websearch') fn = 'websearch_to_tsquery'
    return sql`to_tsvector(${config}, ${sql.ref(col)}) @@ ${sql.raw(fn)}(${config}, ${ts.query})` as any
  },
  // Quantified operators
  $eqAny: (_eb, col, val) => sql`${sql.ref(col)} = any(${val})` as any,
  $neqAny: (_eb, col, val) => sql`${sql.ref(col)} != any(${val})` as any,
  $gtAny: (_eb, col, val) => sql`${sql.ref(col)} > any(${val})` as any,
  $gteAny: (_eb, col, val) => sql`${sql.ref(col)} >= any(${val})` as any,
  $ltAny: (_eb, col, val) => sql`${sql.ref(col)} < any(${val})` as any,
  $lteAny: (_eb, col, val) => sql`${sql.ref(col)} <= any(${val})` as any,
  $likeAny: (_eb, col, val) => sql`${sql.ref(col)} like any(${val})` as any,
  $ilikeAny: (_eb, col, val) => sql`${sql.ref(col)} ilike any(${val})` as any,
  $eqAll: (_eb, col, val) => sql`${sql.ref(col)} = all(${val})` as any,
  $neqAll: (_eb, col, val) => sql`${sql.ref(col)} != all(${val})` as any,
  $gtAll: (_eb, col, val) => sql`${sql.ref(col)} > all(${val})` as any,
  $gteAll: (_eb, col, val) => sql`${sql.ref(col)} >= all(${val})` as any,
  $ltAll: (_eb, col, val) => sql`${sql.ref(col)} < all(${val})` as any,
  $lteAll: (_eb, col, val) => sql`${sql.ref(col)} <= all(${val})` as any,
  $likeAll: (_eb, col, val) => sql`${sql.ref(col)} like all(${val})` as any,
  $ilikeAll: (_eb, col, val) => sql`${sql.ref(col)} ilike all(${val})` as any,
}

function pgJsonPath(column: string, path: string): any {
  const parts = path.replace(/^\$\./, '').split('.')
  if (parts.length === 0) return sql.ref(column)
  const arrows = parts.map((p, i) => {
    const op = i === parts.length - 1 ? '->>' : '->'
    return `${op}'${p}'`
  }).join('')
  return sql`${sql.ref(column)}${sql.raw(arrows)}`
}

export const postgresConfig: DialectConfig = {
  db,
  operators: { ...baseOperators, ...pgOperators },
  jsonArrayFrom,
  jsonObjectFrom,
  jsonPath: pgJsonPath,
}
