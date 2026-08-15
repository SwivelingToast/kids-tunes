import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH ?? path.join(__dirname, '../../data/jukebox.db');
const DEFAULT_PIN = '1234';

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Each file in migrations/ runs once, tracked by filename in
// schema_migrations - lets the schema evolve across build steps without a
// migration framework.
function runMigrations() {
  db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at INTEGER NOT NULL)');

  const migrationsDir = path.join(__dirname, 'migrations');
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  const applied = new Set(
    db
      .prepare<[], { version: string }>('SELECT version FROM schema_migrations')
      .all()
      .map((r) => r.version),
  );

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = readFileSync(path.join(migrationsDir, file), 'utf8');
    db.transaction(() => {
      db.exec(sql);
      db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)').run(file, Date.now());
    })();
  }
}

function seedSettings() {
  const existing = db.prepare('SELECT id FROM settings WHERE id = 1').get();
  if (existing) return;
  const pinHash = bcrypt.hashSync(DEFAULT_PIN, 10);
  db.prepare('INSERT INTO settings (id, pin_hash, spotify_connected, updated_at) VALUES (1, ?, 0, ?)').run(
    pinHash,
    Date.now(),
  );
  // eslint-disable-next-line no-console
  console.log(`Seeded default PIN "${DEFAULT_PIN}" - change it from the parent Change PIN tab.`);
}

export function initDb() {
  runMigrations();
  seedSettings();
}
