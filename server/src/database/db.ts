import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import 'dotenv/config';

const databasePath = process.env.DATABASE_PATH
  ? path.resolve(process.cwd(), process.env.DATABASE_PATH)
  : path.resolve(process.cwd(), 'server/database/sree-super-market.db');

fs.mkdirSync(path.dirname(databasePath), { recursive: true });

export let db = new Database(databasePath);
db.pragma('foreign_keys = ON');

export function resetDatabase() {
  db.close();
  if (fs.existsSync(databasePath)) {
    fs.rmSync(databasePath, { force: true });
  }
  db = new Database(databasePath);
  db.pragma('foreign_keys = ON');
}

export function getDatabasePath() {
  return databasePath;
}
