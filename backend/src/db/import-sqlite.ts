/**
 * One-off import of a pre-Postgres SQLite database into the current database.
 *
 *   DATABASE_URL=postgres://shieldiq:shieldiq-dev@localhost:5432/shieldiq pnpm exec tsx src/db/import-sqlite.ts data/shieldiq.db
 *
 * Safe to re-run: nothing in Postgres is deleted, and rows already imported are not duplicated.
 * Users present in both (same id) take the SQLite version, which holds the real history; a different account
 * that already uses the same email in Postgres is skipped and reported, together with everything it owns.
 * Login rate-limit counters are not copied (they expire within minutes anyway).
 */
import { DatabaseSync } from 'node:sqlite';
import { closeDatabase, initDatabase, query, run, type Row } from './database.js';

// Parents before children, so foreign keys are always satisfied.
const TABLES = ['users', 'sessions', 'saved_plans', 'password_resets', 'audit_logs', 'ai_cache', 'ai_strategies', 'chat_messages'] as const;
type Table = (typeof TABLES)[number];

/** Rows identified by these keys are skipped when already present; users are updated instead. */
const KEY: Record<Table, string[]> = {
  users: ['id'],
  sessions: ['token'],
  saved_plans: ['id'],
  password_resets: ['token_hash'],
  audit_logs: ['id'],
  ai_cache: ['cache_key'],
  ai_strategies: ['user_id'],
  // No natural key (ids are re-generated so the Postgres sequence stays correct): an identical message is a duplicate.
  chat_messages: ['user_id', 'role', 'content', 'created_at'],
};

export interface ImportReport {
  imported: Record<string, number>;
  skippedUsers: string[];
}

export async function importSqlite(file: string): Promise<ImportReport> {
  await initDatabase(); // creates the schema if this database is new
  const sqlite = new DatabaseSync(file, { readOnly: true });
  const sqliteTables = new Set(
    (sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[]).map(t => t.name)
  );
  const report: ImportReport = { imported: {}, skippedUsers: [] };
  const importedUsers = new Set<string>();

  for (const table of TABLES) {
    report.imported[table] = 0;
    if (!sqliteTables.has(table)) continue;
    // Old files may predate some columns, and some SQLite-only columns have no Postgres counterpart.
    const pgColumns = new Set(
      (await query<{ column_name: string }>('SELECT column_name FROM information_schema.columns WHERE table_name = $1', [table])).map(c => c.column_name)
    );
    const columns = (sqlite.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[])
      .map(c => c.name)
      .filter(c => pgColumns.has(c) && !(table === 'chat_messages' && c === 'id'));
    // rowid order keeps saved plans and chat messages in the order they were written.
    const rows = sqlite.prepare(`SELECT ${columns.join(', ')} FROM ${table} ORDER BY rowid`).all() as Row[];

    for (const row of rows) {
      if (table === 'users') {
        const clash = await query('SELECT id FROM users WHERE email = $1 AND id <> $2', [row.email, row.id]);
        if (clash.length) {
          report.skippedUsers.push(String(row.email));
          continue;
        }
        importedUsers.add(String(row.id));
      } else if ('user_id' in row && row.user_id !== null && table !== 'audit_logs' && !importedUsers.has(String(row.user_id))) {
        continue; // belongs to a skipped (or missing) user
      }

      const values = columns.map(c => row[c]);
      const params = columns.map((_, i) => `$${i + 1}`);
      const key = KEY[table];
      let sql: string;
      if (table === 'users') {
        const updates = columns.filter(c => c !== 'id').map(c => `${c} = excluded.${c}`).join(', ');
        sql = `INSERT INTO users (${columns.join(', ')}) VALUES (${params.join(', ')}) ON CONFLICT (id) DO UPDATE SET ${updates}`;
      } else if (table === 'chat_messages') {
        const match = key.map(k => `${k} = $${columns.indexOf(k) + 1}`).join(' AND ');
        sql = `INSERT INTO chat_messages (${columns.join(', ')}) SELECT ${params.join(', ')}
               WHERE NOT EXISTS (SELECT 1 FROM chat_messages WHERE ${match})`;
      } else {
        sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${params.join(', ')}) ON CONFLICT (${key.join(', ')}) DO NOTHING`;
      }
      report.imported[table] += await run(sql, values);
    }
  }
  sqlite.close();
  return report;
}

// Command-line entry point.
if (import.meta.url === `file://${process.argv[1]}`) {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: tsx src/db/import-sqlite.ts <path to shieldiq.db>');
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) console.warn('DATABASE_URL is not set: importing into the embedded dev database (data/pglite).');
  const report = await importSqlite(file);
  await closeDatabase();
  console.log('Rows imported:', report.imported);
  if (report.skippedUsers.length) console.log('Skipped (email already used by another account):', report.skippedUsers);
}
