import type { OperatorHandler } from './types.js'

export const baseOperators: Record<string, OperatorHandler> = {
  $eq: (eb, col, val) => eb(col, '=', val),
  $neq: (eb, col, val) => eb(col, '!=', val),
  $gt: (eb, col, val) => eb(col, '>', val),
  $gte: (eb, col, val) => eb(col, '>=', val),
  $lt: (eb, col, val) => eb(col, '<', val),
  $lte: (eb, col, val) => eb(col, '<=', val),
  $like: (eb, col, val) => eb(col, 'like', val as string),
  $is: (eb, col, val) => eb(col, 'is', val as null),
  $in: (eb, col, val) => eb(col, 'in', val as any[]),
  $notIn: (eb, col, val) => eb(col, 'not in', val as any[]),
}
