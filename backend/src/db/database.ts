import path from 'node:path';
import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { shouldSeedDemo } from '../config.js';

const scrypt = promisify(crypto.scrypt) as (password: string, salt: string, keylen: number) => Promise<Buffer>;

/** Sync form, for one-off startup work only (demo seed). Request handlers use hashPasswordAsync. */
export function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

/** Same algorithm and output as hashPassword, computed off the event loop so other requests keep flowing. */
export async function hashPasswordAsync(password: string, salt: string): Promise<string> {
  return (await scrypt(password, salt, 64)).toString('hex');
}

export function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

export type Row = Record<string, unknown>;

/** The one thing the app needs from a database: run SQL with $1-style parameters. */
interface Driver {
  query(sql: string, params?: unknown[]): Promise<{ rows: Row[]; affected: number }>;
  exec(sql: string): Promise<void>;
  close(): Promise<void>;
}

/**
 * Postgres when DATABASE_URL is set (Docker, production). Otherwise PGlite, the same Postgres compiled to run
 * in-process: in memory for tests, in ./data/pglite for `pnpm dev`, so neither needs a database server.
 */
async function connect(): Promise<Driver> {
  if (process.env.DATABASE_URL) {
    const { default: pg } = await import('pg');
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: Number(process.env.DATABASE_POOL_SIZE) || 10 });
    return {
      query: async (sql, params) => {
        const r = await pool.query(sql, params as unknown[]);
        return { rows: r.rows, affected: r.rowCount ?? 0 };
      },
      exec: async sql => void (await pool.query(sql)),
      close: () => pool.end(),
    };
  }
  // A dev-only dependency: production images must set DATABASE_URL.
  const { PGlite } = await import('@electric-sql/pglite').catch(() => {
    throw new Error('DATABASE_URL is not set. Point it at Postgres (see docker-compose.yml).');
  });
  const dataDir = process.env.PGLITE_DIR || (process.env.NODE_ENV === 'test' ? 'memory://' : path.join(process.cwd(), 'data', 'pglite'));
  const db = new PGlite(dataDir);
  return {
    query: async (sql, params) => {
      const r = await db.query<Row>(sql, params as unknown[]);
      return { rows: r.rows, affected: r.affectedRows ?? 0 };
    },
    exec: async sql => void (await db.exec(sql)),
    close: () => db.close(),
  };
}

let ready: Promise<Driver> | null = null;

/** Connects, creates the schema and seeds the demo account (development only). Safe to call repeatedly. */
export function initDatabase(): Promise<Driver> {
  ready ??= connect().then(async driver => {
    await migrate(driver);
    if (shouldSeedDemo()) await seedDemo(driver);
    return driver;
  });
  // A failed start must be retryable, not cached forever.
  ready.catch(() => (ready = null));
  return ready;
}

export async function closeDatabase(): Promise<void> {
  if (!ready) return;
  const driver = await ready.catch(() => null);
  ready = null;
  await driver?.close();
}

/** All rows of a query. */
export async function query<T = Row>(sql: string, params: unknown[] = []): Promise<T[]> {
  return (await (await initDatabase()).query(sql, params)).rows as T[];
}

/** The first row, or undefined. */
export async function one<T = Row>(sql: string, params: unknown[] = []): Promise<T | undefined> {
  return (await query<T>(sql, params))[0];
}

/** Runs a write and returns how many rows it changed. */
export async function run(sql: string, params: unknown[] = []): Promise<number> {
  return (await (await initDatabase()).query(sql, params)).affected;
}

// Times are ISO-8601 text (as the API returns them); money is DOUBLE PRECISION; lists are JSON text.
// New columns go in with ADD COLUMN IF NOT EXISTS so existing databases upgrade in place.
async function migrate(db: Driver) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      age INTEGER NOT NULL DEFAULT 30,
      income DOUBLE PRECISION NOT NULL DEFAULT 0,
      dependents INTEGER NOT NULL DEFAULT 0,
      marital_status TEXT NOT NULL DEFAULT 'Single',
      occupation TEXT NOT NULL DEFAULT '',
      city TEXT NOT NULL DEFAULT '',
      city_tier TEXT NOT NULL DEFAULT 'Tier 1 (Metro)',
      home_loan DOUBLE PRECISION NOT NULL DEFAULT 0,
      other_loans DOUBLE PRECISION NOT NULL DEFAULT 0,
      monthly_expenses DOUBLE PRECISION NOT NULL DEFAULT 0,
      existing_life_cover DOUBLE PRECISION NOT NULL DEFAULT 0,
      existing_health_cover DOUBLE PRECISION NOT NULL DEFAULT 0,
      liquid_savings DOUBLE PRECISION NOT NULL DEFAULT 0,
      spouse_income DOUBLE PRECISION NOT NULL DEFAULT 0,
      dependent_details TEXT NOT NULL DEFAULT '[]',
      parents_health_cover DOUBLE PRECISION NOT NULL DEFAULT 0,
      loan_emi DOUBLE PRECISION NOT NULL DEFAULT 0,
      home_loan_years_left INTEGER NOT NULL DEFAULT 0,
      existing_ci_cover DOUBLE PRECISION NOT NULL DEFAULT 0,
      existing_pa_cover DOUBLE PRECISION NOT NULL DEFAULT 0,
      employer_benefits TEXT NOT NULL DEFAULT '[]',
      lifestyle_risks TEXT NOT NULL DEFAULT '[]',
      onboarding_completed INTEGER NOT NULL DEFAULT 0,
      profile_reviewed_at TEXT,
      disclaimer_acknowledged_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS saved_plans (
      id TEXT PRIMARY KEY,
      seq BIGSERIAL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      coverage_amount DOUBLE PRECISION NOT NULL,
      monthly_premium DOUBLE PRECISION NOT NULL,
      status TEXT NOT NULL,
      description TEXT NOT NULL,
      last_modified TEXT NOT NULL,
      snapshot TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_saved_plans_user ON saved_plans(user_id);

    CREATE TABLE IF NOT EXISTS password_resets (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS auth_attempts (
      key TEXT PRIMARY KEY,
      count INTEGER NOT NULL,
      reset_at BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      details TEXT,
      timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_cache (
      cache_key TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_strategies (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      profile_hash TEXT NOT NULL,
      provider TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id BIGSERIAL PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id, id);

    -- Added after the first Postgres release: existing databases gain the column in place.
    ALTER TABLE users ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'en';
  `);
}

const DEMO_ID = 'USR-7701';

async function seedDemo(db: Driver) {
  const now = new Date().toISOString();
  const salt = generateSalt();
  // ON CONFLICT: several instances starting together must not race to create it.
  const created = await db.query(
    `INSERT INTO users (
       id, email, name, password_hash, salt, age, income, dependents, marital_status, occupation, city, city_tier,
       home_loan, other_loans, monthly_expenses, existing_life_cover, existing_health_cover, liquid_savings,
       loan_emi, home_loan_years_left, employer_benefits, lifestyle_risks, onboarding_completed, created_at, updated_at
     ) VALUES ($1, $2, $3, $4, $5, 34, 2400000, 2, 'Married', 'Senior Systems Architect', 'Bengaluru, KA', 'Tier 1 (Metro)',
       4500000, 500000, 85000, 15000000, 500000, 1000000, 45000, 15, $6, '[]', 1, $7, $7)
     ON CONFLICT (email) DO NOTHING`,
    [DEMO_ID, 'alex.vance@shieldiq.internal', 'Alex Vance', hashPassword('Password123!', salt), salt, JSON.stringify(['Group Term Life', 'OPD Benefits']), now]
  );
  if (created.affected === 0) return;

  const plans: [string, string, string, number, number, string, string, string][] = [
    ['SIQ-992-X', 'FY26 Core Comprehensive Portfolio', 'OmniShield Bundle', 2750000, 450, 'Adequate', 'Primary deployed portfolio combining pure term life, health floater, and critical illness indemnity.', '2026-10-14'],
    ['SIQ-104-Y', 'Retirement Acceleration Strategy', 'Term Life Max', 3500000, 580, 'Incomplete', 'Exploratory setup testing increasing term riders with mortgage debt clearance.', '2026-09-28'],
    ['SIQ-882-B', 'Disability & Trauma Shield v2', 'Critical Illness', 1200000, 165, 'Adequate', 'Standalone disability income continuity for tech lead occupational hazards.', '2026-08-15'],
    ['SIQ-045-Z', 'Tier 1 Metro Health Floater', 'Health Floater', 1000000, 280, 'Gap Detected', 'Super top-up model with ₹25,000 deductible; identified 15% co-pay exposure.', '2026-07-02'],
    ['SIQ-012-A', 'FY25 Archive - Baseline Term', 'Term Life', 1500000, 145, 'Archived', 'Legacy individual life policy prior to dependents addition.', '2025-12-20'],
  ];
  for (const [id, name, category, cover, premium, status, description, lastModified] of plans) {
    await db.query(
      `INSERT INTO saved_plans (id, user_id, name, category, coverage_amount, monthly_premium, status, description, last_modified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO NOTHING`,
      [id, DEMO_ID, name, category, cover, premium, status, description, lastModified]
    );
  }
}
