import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

export function openDb(dbPath) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS voters (
      voter_id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS votes (
      voter_id TEXT NOT NULL,
      nickname_id TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      answer TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (voter_id, nickname_id)
    );
    CREATE TABLE IF NOT EXISTS suggestions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      voter_id TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      nickname TEXT NOT NULL,
      normalized TEXT NOT NULL,
      source_url TEXT NULL,
      where_heard TEXT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_votes_lookup ON votes (entity_id, nickname_id);
    CREATE INDEX IF NOT EXISTS idx_suggestions_entity ON suggestions (entity_id, status);
  `);
  return db;
}
