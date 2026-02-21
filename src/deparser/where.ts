import type { ExpressionBuilder, Expression, SqlBool } from 'kysely'
import type { DialectConfig } from './types.js'
import type { Where } from '../types.js'

export function buildWhere(
  eb: ExpressionBuilder<any, any>,
  where: Where,
  config: DialectConfig
): Expression<SqlBool> {
  const conditions: Expression<SqlBool>[] = []

  for (const [key, value] of Object.entries(where)) {
    if (key === '$or') {
      const items = value as Where[]
      conditions.push(eb.or(items.map(w => buildWhere(eb, w, config))))
    } else if (key === '$and') {
      const items = value as Where[]
      conditions.push(eb.and(items.map(w => buildWhere(eb, w, config))))
    } else if (key === '$not') {
      conditions.push(eb.not(buildWhere(eb, value as Where, config)))
    } else {
      const ops = value as Record<string, unknown>
      for (const [op, opVal] of Object.entries(ops)) {
        if (op === '$not') {
          const nested = opVal as Record<string, unknown>
          for (const [nOp, nVal] of Object.entries(nested)) {
            const handler = config.operators[nOp]
            if (!handler) throw new Error(`Unsupported operator: ${nOp}`)
            conditions.push(eb.not(handler(eb, key, nVal)))
          }
        } else {
          const handler = config.operators[op]
          if (!handler) throw new Error(`Unsupported operator: ${op}`)
          conditions.push(handler(eb, key, opVal))
        }
      }
    }
  }

  return conditions.length === 1 ? conditions[0] : eb.and(conditions)
}
