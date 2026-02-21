import {
  Kysely, DummyDriver,
  SqliteAdapter, SqliteIntrospector, SqliteQueryCompiler,
  sql,
} from 'kysely'
import { jsonArrayFrom, jsonObjectFrom } from 'kysely/helpers/sqlite'
import type { DialectConfig } from '../types.js'
import { baseOperators } from '../operators.js'

const db = new Kysely<any>({
  dialect: {
    createAdapter: () => new SqliteAdapter(),
    createDriver: () => new DummyDriver(),
    createIntrospector: (db) => new SqliteIntrospector(db),
    createQueryCompiler: () => new SqliteQueryCompiler(),
  },
})

function sqliteJsonPath(column: string, path: string): any {
  return sql`json_extract(${sql.ref(column)}, ${path})`
}

export const sqliteConfig: DialectConfig = {
  db,
  operators: { ...baseOperators },
  jsonArrayFrom,
  jsonObjectFrom,
  jsonPath: sqliteJsonPath,
}
