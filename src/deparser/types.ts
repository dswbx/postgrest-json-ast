import type { Kysely, Expression, ExpressionBuilder, RawBuilder, SqlBool } from 'kysely'

export type Dialect = 'postgres' | 'sqlite'

export type OperatorHandler = (
  eb: ExpressionBuilder<any, any>,
  column: string,
  value: unknown
) => Expression<SqlBool>

export type DialectConfig = {
  db: Kysely<any>
  operators: Record<string, OperatorHandler>
  jsonArrayFrom: (expr: any) => any
  jsonObjectFrom: (expr: any) => any
  jsonPath: (column: string, path: string) => RawBuilder<unknown>
}

export type DeparseResult = {
  sql: string
  parameters: readonly unknown[]
}
