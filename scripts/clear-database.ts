/**
 * Database reset helper.
 *
 * Usage:
 *   npm run db:clear
 *   npm run db:clear:all
 */

import Database from 'better-sqlite3'
import path from 'path'
import { existsSync, unlinkSync } from 'fs'

type TableRow = { name: string }
type CountRow = { count: number }

const PRESERVED_USERNAMES = ['admin', 'librarian'] as const

function resolveDatabasePath(): string {
  const rawPath = process.env.DATABASE_PATH || path.join('data', 'library.db')
  return path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath)
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`
}

const dbPath = resolveDatabasePath()
const args = new Set(process.argv.slice(2))
const deleteAll = args.has('--all') || args.has('-a')

console.log('DB clear helper\n')
console.log(`Database path: ${dbPath}`)

if (!existsSync(dbPath)) {
  console.log('Database file does not exist, nothing to clear.')
  process.exit(0)
}

if (deleteAll) {
  console.log('\nDeleting database file...')
  try {
    unlinkSync(dbPath)
    console.log('Database file deleted.')
    console.log('It will be recreated on next app startup.')
    process.exit(0)
  } catch (error) {
    console.error('Failed to delete database file:', error)
    process.exit(1)
  }
}

const db = new Database(dbPath)
db.pragma('foreign_keys = OFF')

try {
  const tables = db.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all() as TableRow[]

  console.log('\nClearing table data and keeping schema...')
  console.log(`Found ${tables.length} tables`)

  for (const table of tables) {
    const tableName = table.name
    const quotedTableName = quoteIdentifier(tableName)

    if (tableName === 'users') {
      const placeholders = PRESERVED_USERNAMES.map(() => '?').join(', ')
      const removableCount = db.prepare(`
        SELECT COUNT(*) AS count
        FROM ${quotedTableName}
        WHERE username NOT IN (${placeholders})
      `).get(...PRESERVED_USERNAMES) as CountRow

      if (removableCount.count > 0) {
        db.prepare(`
          DELETE FROM ${quotedTableName}
          WHERE username NOT IN (${placeholders})
        `).run(...PRESERVED_USERNAMES)
      }

      console.log(`${tableName}: cleared ${removableCount.count} rows, kept ${PRESERVED_USERNAMES.join(' / ')}`)
    } else {
      const rowCount = db.prepare(`
        SELECT COUNT(*) AS count
        FROM ${quotedTableName}
      `).get() as CountRow

      if (rowCount.count > 0) {
        db.exec(`DELETE FROM ${quotedTableName}`)
      }

      console.log(`${tableName}: cleared ${rowCount.count} rows`)
    }

    try {
      db.prepare(`DELETE FROM sqlite_sequence WHERE name = ?`).run(tableName)
    } catch {
      // ignore
    }
  }

  db.pragma('foreign_keys = ON')

  console.log('\nRemaining rows after clear:')
  for (const table of tables) {
    const tableName = table.name
    const quotedTableName = quoteIdentifier(tableName)
    const rowCount = db.prepare(`
      SELECT COUNT(*) AS count
      FROM ${quotedTableName}
    `).get() as CountRow
    console.log(`  - ${tableName}: ${rowCount.count}`)
  }

  console.log('\nDatabase clear completed.')
  console.log('Next step: run npm run db:generate')
} catch (error) {
  console.error('Failed to clear database:', error)
  process.exitCode = 1
} finally {
  db.close()
}
