import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from '@/server/db/schema'

export type AppDatabase = ReturnType<typeof drizzle<typeof schema>>

let sqlite: Database.Database | null = null
let db: AppDatabase | null = null

export function dataDir(): string {
  return process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(process.cwd(), 'data')
}

export function resetDbForTests(): void {
  sqlite?.close()
  sqlite = null
  db = null
}

export function getSqlite(): Database.Database {
  if (sqlite) return sqlite
  const dir = dataDir()
  fs.mkdirSync(dir, { recursive: true })
  sqlite = new Database(path.join(dir, 'careerdesk.sqlite'))
  sqlite.pragma('foreign_keys = ON')
  migrate(sqlite)
  ensureDefaults(sqlite)
  return sqlite
}

export function getDb(): AppDatabase {
  if (!db) db = drizzle(getSqlite(), { schema })
  return db
}

function migrate(database: Database.Database): void {
  database.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    id TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL
  )`)
  const dir = path.join(process.cwd(), 'src/server/db/migrations')
  const files = fs.readdirSync(dir).filter((name) => name.endsWith('.sql')).sort()
  const applied = new Set(
    database.prepare('SELECT id FROM schema_migrations').all().map((row) => (row as { id: string }).id),
  )
  const insert = database.prepare('INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)')
  for (const file of files) {
    if (applied.has(file)) continue
    const sql = fs.readFileSync(path.join(dir, file), 'utf8')
    database.exec(sql)
    insert.run(file, new Date().toISOString())
  }
}

function ensureDefaults(database: Database.Database): void {
  database.prepare(`INSERT INTO profile (
    id, name, headline, years, location, phone, email, links, summary, education, skills_json
  ) VALUES (1, '', '', '', '', '', '', '', '', '', '[]') ON CONFLICT(id) DO NOTHING`).run()
  database.prepare(`INSERT INTO settings (id, sync_interval_days, last_master_sync_at)
    VALUES (1, 7, NULL) ON CONFLICT(id) DO NOTHING`).run()
  const master = database.prepare(`SELECT id FROM resumes WHERE type = 'master'`).get()
  if (!master) {
    database.prepare(`INSERT INTO resumes (id, type, job_id, summary, updated_at) VALUES (?, 'master', NULL, '', ?)`)
      .run(crypto.randomUUID(), new Date().toISOString())
  }
}
