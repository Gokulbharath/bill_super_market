import fs from 'node:fs';
import path from 'node:path';
import { db, resetDatabase } from './db.js';

const migrationDir = path.resolve(process.cwd(), 'server/database/migrations');

type MigrationRow = { name: string };

function hasLegacySchema() {
  const hasProducts = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'products'").get();
  if (!hasProducts) return false;
  const columns = db.prepare('PRAGMA table_info(products)').all() as Array<{ name: string }>;
  return !columns.some((column) => column.name === 'name_english');
}

export function runMigrations() {
  if (!fs.existsSync(migrationDir)) {
    fs.mkdirSync(migrationDir, { recursive: true });
  }

  if (hasLegacySchema()) {
    resetDatabase();
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL
    );
  `);

  const files = fs.readdirSync(migrationDir).filter((file) => file.endsWith('.sql')).sort();
  for (const file of files) {
    const migrationName = file;
    const alreadyApplied = db.prepare('SELECT name FROM schema_migrations WHERE name = ?').get(migrationName) as MigrationRow | undefined;
    if (alreadyApplied) continue;
    const sql = fs.readFileSync(path.join(migrationDir, file), 'utf8');
    db.exec(sql);
    db.prepare('INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)').run(migrationName, new Date().toISOString());
  }
}
