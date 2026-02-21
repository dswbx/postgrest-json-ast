import type { AST } from '../types.js'
import type { Dialect, DeparseResult, DialectConfig } from './types.js'
import { deparseAST } from './core.js'
import { postgresConfig } from './dialects/postgres.js'
import { sqliteConfig } from './dialects/sqlite.js'

export type { Dialect, DeparseResult, DialectConfig } from './types.js'
export type { OperatorHandler } from './types.js'

function getConfig(dialect: Dialect): DialectConfig {
  switch (dialect) {
    case 'postgres': return postgresConfig
    case 'sqlite': return sqliteConfig
    default: throw new Error(`Unsupported dialect: ${dialect}`)
  }
}

export function deparse(ast: AST, dialect: Dialect = 'postgres'): DeparseResult {
  return deparseAST(ast, getConfig(dialect))
}

export function createDeparser(dialect: Dialect = 'postgres') {
  const config = getConfig(dialect)
  return {
    deparse: (ast: AST) => deparseAST(ast, config),
    compile: (ast: AST) => deparseAST(ast, config),
  }
}
