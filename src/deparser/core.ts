import { sql } from 'kysely'
import type { Kysely } from 'kysely'
import type { AST, OrderEntry } from '../types.js'
import type { DialectConfig, DeparseResult } from './types.js'
import { applySelect, applyReturning } from './select.js'
import { buildWhere } from './where.js'

export function deparseAST(ast: AST, config: DialectConfig): DeparseResult {
  let db: Kysely<any> = config.db
  if (ast.schema) db = db.withSchema(ast.schema)

  let compiled
  switch (ast.type) {
    case 'query':
      compiled = buildQuery(ast, config, db)
      break
    case 'insert':
      compiled = buildInsert(ast, config, db)
      break
    case 'update':
      compiled = buildUpdate(ast, config, db)
      break
    case 'delete':
      compiled = buildDelete(ast, config, db)
      break
    case 'upsert':
    case 'put':
      compiled = buildUpsert(ast, config, db)
      break
    case 'rpc':
      compiled = buildRpc(ast, config, db)
      break
    default:
      throw new Error(`Unsupported AST type: ${ast.type}`)
  }

  return { sql: compiled.sql, parameters: compiled.parameters }
}

export function applyOrder(qb: any, order?: OrderEntry[]): any {
  if (!order) return qb
  for (const o of order) {
    if (o.nullsFirst !== undefined) {
      qb = qb.orderBy(o.column, (ob: any) => {
        const b = o.direction === 'desc' ? ob.desc() : ob.asc()
        return o.nullsFirst ? b.nullsFirst() : b.nullsLast()
      })
    } else {
      qb = qb.orderBy(o.column, o.direction || 'asc')
    }
  }
  return qb
}

function applyWhere(qb: any, where: AST['where'], config: DialectConfig): any {
  if (!where || Object.keys(where).length === 0) return qb
  return qb.where((eb: any) => buildWhere(eb, where, config))
}

function buildQuery(ast: AST, config: DialectConfig, db: Kysely<any>) {
  let qb = (db as any).selectFrom(ast.from!)
  qb = applySelect(qb, ast.select, config, ast.join, ast.from)
  qb = applyWhere(qb, ast.where, config)
  qb = applyOrder(qb, ast.order)
  if (ast.limit !== undefined) qb = qb.limit(ast.limit)
  if (ast.offset !== undefined) qb = qb.offset(ast.offset)
  return qb.compile()
}

function buildInsert(ast: AST, _config: DialectConfig, db: Kysely<any>) {
  let qb = (db as any).insertInto(ast.from!)
  if (ast.values) qb = qb.values(ast.values as any)
  qb = applyReturning(qb, ast.select)
  return qb.compile()
}

function buildUpdate(ast: AST, config: DialectConfig, db: Kysely<any>) {
  let qb = (db as any).updateTable(ast.from!)
  if (ast.values) qb = qb.set(ast.values as any)
  qb = applyWhere(qb, ast.where, config)
  qb = applyReturning(qb, ast.select)
  return qb.compile()
}

function buildDelete(ast: AST, config: DialectConfig, db: Kysely<any>) {
  let qb = (db as any).deleteFrom(ast.from!)
  qb = applyWhere(qb, ast.where, config)
  qb = applyReturning(qb, ast.select)
  return qb.compile()
}

function buildUpsert(ast: AST, config: DialectConfig, db: Kysely<any>) {
  let qb = (db as any).insertInto(ast.from!).values(ast.values as any)

  if (ast.onConflict) {
    qb = qb.onConflict((oc: any) => {
      const builder = oc.column(ast.onConflict!)
      if (ast.ignoreDuplicates) return builder.doNothing()

      const vals = Array.isArray(ast.values) ? ast.values[0] : ast.values
      return builder.doUpdateSet((args: any) => {
        const result: Record<string, any> = {}
        for (const key of Object.keys(vals as object)) {
          if (key !== ast.onConflict) {
            result[key] = args.ref(`excluded.${key}`)
          }
        }
        return result
      })
    })
  }

  qb = applyReturning(qb, ast.select)
  return qb.compile()
}

function buildRpc(ast: AST, config: DialectConfig, db: Kysely<any>) {
  const fnName = ast.function!
  let fnCall

  if (ast.args && !Array.isArray(ast.args) && Object.keys(ast.args).length > 0) {
    // Named params: fn(param := val, ...)
    const entries = Object.entries(ast.args as Record<string, unknown>)
    const params = entries.map(([k, v]) => sql`${sql.raw(k)} := ${v}`)
    fnCall = sql`${sql.raw(fnName)}(${sql.join(params)})`
  } else if (Array.isArray(ast.args) && ast.args.length > 0) {
    // Positional: fn(val1, val2, ...)
    const params = (ast.args as unknown[]).map(v => sql`${v}`)
    fnCall = sql`${sql.raw(fnName)}(${sql.join(params)})`
  } else {
    fnCall = sql`${sql.raw(fnName)}()`
  }

  let qb = (db as any).selectFrom(fnCall.as(fnName))
  qb = applySelect(qb, ast.select, config)
  qb = applyWhere(qb, ast.where, config)
  qb = applyOrder(qb, ast.order)
  if (ast.limit !== undefined) qb = qb.limit(ast.limit)
  if (ast.offset !== undefined) qb = qb.offset(ast.offset)
  return qb.compile()
}
