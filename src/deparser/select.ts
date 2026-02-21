import { sql } from 'kysely'
import type { DialectConfig } from './types.js'
import type { SelectEntry, ColumnDef, EmbedDef, JoinMap } from '../types.js'
import { buildWhere } from './where.js'
import { applyOrder } from './core.js'

function isEmbedDef(def: ColumnDef | EmbedDef): def is EmbedDef {
  return 'select' in def || 'spread' in def || 'join' in def
}

export function applySelect(
  qb: any,
  select: SelectEntry[] | undefined,
  config: DialectConfig,
  joinMap?: JoinMap,
  parentTable?: string
): any {
  if (!select || select.length === 0) return qb.selectAll()

  for (const entry of select) {
    if (typeof entry === 'string') {
      qb = entry === '*' ? qb.selectAll() : qb.select(entry)
    } else {
      for (const [alias, def] of Object.entries(entry)) {
        if (isEmbedDef(def)) {
          qb = applyEmbed(qb, alias, def as EmbedDef, config, joinMap, parentTable)
        } else {
          qb = applyColumnDef(qb, alias, def as ColumnDef, config)
        }
      }
    }
  }

  return qb
}

export function applyReturning(qb: any, select?: SelectEntry[]): any {
  if (!select || select.length === 0) return qb

  for (const entry of select) {
    if (typeof entry === 'string') {
      qb = entry === '*' ? qb.returningAll() : qb.returning(entry)
    } else {
      for (const [alias, def] of Object.entries(entry)) {
        if (isEmbedDef(def)) continue
        const col = (def as ColumnDef).column || alias
        qb = qb.returning(col)
      }
    }
  }

  return qb
}

function applyColumnDef(qb: any, alias: string, def: ColumnDef, config: DialectConfig): any {
  return qb.select((eb: any) => {
    let expr: any

    if (def.aggregate === 'count' && !def.column && !def.path) {
      expr = eb.fn.countAll()
    } else {
      const col = def.column || alias

      expr = def.path ? config.jsonPath(col, def.path) : sql.ref(col)

      if (def.preCast) {
        expr = sql`cast(${expr} as ${sql.raw(def.preCast)})`
      }

      if (def.aggregate) {
        expr = sql`${sql.raw(def.aggregate)}(${expr})`
      }
    }

    if (def.cast) {
      expr = sql`cast(${expr} as ${sql.raw(def.cast)})`
    }

    return expr.as(alias)
  })
}

function applyEmbed(
  qb: any,
  alias: string,
  embed: EmbedDef,
  config: DialectConfig,
  joinMap?: JoinMap,
  parentTable?: string
): any {
  return qb.select((eb: any) => {
    const joinDef = joinMap?.[alias]
    const targetTable = joinDef?.from || alias

    let sub = eb.selectFrom(targetTable)

    sub = applySelect(sub, embed.select, config, embed.join, targetTable)

    if (embed.where && Object.keys(embed.where).length > 0) {
      sub = sub.where((eb2: any) => buildWhere(eb2, embed.where!, config))
    }

    if (parentTable) {
      const fkColumn = joinDef?.hint || `${parentTable}_id`
      sub = sub.whereRef(`${targetTable}.${fkColumn}`, '=', `${parentTable}.id`)
    }

    sub = applyOrder(sub, embed.order)
    if (embed.limit !== undefined) sub = sub.limit(embed.limit)
    if (embed.offset !== undefined) sub = sub.offset(embed.offset)

    const jsonHelper = embed.spread ? config.jsonObjectFrom : config.jsonArrayFrom
    return jsonHelper(sub).as(alias)
  })
}
