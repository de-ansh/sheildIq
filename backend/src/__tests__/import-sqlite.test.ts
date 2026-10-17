import { describe, it, expect, afterAll } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { importSqlite } from '../db/import-sqlite.js';
import { query, run } from '../db/database.js';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'shieldiq-import-'));
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

/** An old-style SQLite file: no newer profile columns, and a SQLite-only column that Postgres doesn't have. */
function oldFile() {
  const file = path.join(dir, `old-${Date.now()}.db`);
  const db = new DatabaseSync(file);
  db.exec(`
    CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT, name TEXT, password_hash TEXT, salt TEXT, age INTEGER, income REAL,
      dependents INTEGER, marital_status TEXT, occupation TEXT, city TEXT, onboarding_completed INTEGER, legacy_flag TEXT,
      created_at TEXT, updated_at TEXT);
    CREATE TABLE saved_plans (id TEXT PRIMARY KEY, user_id TEXT, name TEXT, category TEXT, coverage_amount REAL, monthly_premium REAL,
      status TEXT, description TEXT, last_modified TEXT);
    CREATE TABLE chat_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, role TEXT, content TEXT, created_at TEXT);
    CREATE TABLE auth_attempts (key TEXT PRIMARY KEY, count INTEGER, reset_at INTEGER);
    INSERT INTO users VALUES ('USR-A', 'priya@example.com', 'Priya', 'h', 's', 41, 3200000, 2, 'Married', 'Doctor', 'Pune', 1, 'x', '2026-01-01T00:00:00.000Z', '2026-01-02T00:00:00.000Z');
    INSERT INTO users VALUES ('USR-B', 'taken@example.com', 'Old B', 'h', 's', 30, 0, 0, 'Single', '', '', 0, 'x', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z');
    INSERT INTO saved_plans VALUES ('SIQ-1', 'USR-A', 'First', 'Term', 1, 1, 'Adequate', '', '2026-02-01');
    INSERT INTO saved_plans VALUES ('SIQ-2', 'USR-B', 'Of skipped user', 'Term', 1, 1, 'Adequate', '', '2026-02-01');
    INSERT INTO chat_messages (user_id, role, content, created_at) VALUES ('USR-A', 'user', 'Q1', '2026-03-01T00:00:00.000Z'), ('USR-A', 'assistant', 'A1', '2026-03-01T00:00:00.000Z');
    INSERT INTO auth_attempts VALUES ('ip:1', 3, 0);
  `);
  db.close();
  return file;
}

describe('SQLite import', () => {
  it('copies users, plans and chats; skips email clashes; is safe to run twice', async () => {
    // Postgres already has a different account on one of the emails.
    await run(`INSERT INTO users (id, email, name, password_hash, salt, created_at, updated_at) VALUES ('USR-NEW', 'taken@example.com', 'New', 'h', 's', 'now', 'now')`);
    const file = oldFile();

    const first = await importSqlite(file);
    expect(first.skippedUsers).toEqual(['taken@example.com']);
    expect(first.imported).toMatchObject({ users: 1, saved_plans: 1, chat_messages: 2 });

    const priya = (await query('SELECT * FROM users WHERE id = $1', ['USR-A']))[0];
    expect(priya).toMatchObject({ email: 'priya@example.com', income: 3200000, onboarding_completed: 1, loan_emi: 0, dependent_details: '[]' });
    expect(await query("SELECT name FROM users WHERE email = 'taken@example.com'")).toEqual([{ name: 'New' }]); // untouched
    expect(await query("SELECT id FROM saved_plans WHERE id = 'SIQ-2'")).toEqual([]); // belonged to the skipped user
    expect(await query('SELECT key FROM auth_attempts')).toEqual([]); // counters are not copied
    expect((await query("SELECT content FROM chat_messages WHERE user_id = 'USR-A' ORDER BY id")).map(r => r.content)).toEqual(['Q1', 'A1']);

    const second = await importSqlite(file);
    expect(Object.values(second.imported).reduce((a, b) => a + b, 0)).toBe(1); // only the user row is re-applied
    expect(await query("SELECT id FROM chat_messages WHERE user_id = 'USR-A'")).toHaveLength(2);
    expect(await query("SELECT id FROM saved_plans WHERE user_id = 'USR-A'")).toHaveLength(1);
  });
});
