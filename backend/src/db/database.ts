import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';

let dbInstance: DatabaseSync | null = null;

export function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

export function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function initDatabase(dbPath?: string): DatabaseSync {
  if (dbInstance) {
    return dbInstance;
  }

  const resolvedPath =
    dbPath ||
    process.env.DATABASE_PATH ||
    (process.env.NODE_ENV === 'test'
      ? ':memory:'
      : path.join(process.cwd(), 'data', 'shieldiq.db'));

  if (resolvedPath !== ':memory:') {
    const dir = path.dirname(resolvedPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new DatabaseSync(resolvedPath);

  // Enable foreign keys and WAL mode for persistent database
  db.exec('PRAGMA foreign_keys = ON;');
  if (resolvedPath !== ':memory:') {
    db.exec('PRAGMA journal_mode = WAL;');
  }

  // Schema creation
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      age INTEGER NOT NULL DEFAULT 34,
      income REAL NOT NULL DEFAULT 145000,
      dependents INTEGER NOT NULL DEFAULT 2,
      marital_status TEXT NOT NULL DEFAULT 'Married',
      occupation TEXT NOT NULL DEFAULT 'Senior Systems Architect',
      city TEXT NOT NULL DEFAULT 'San Francisco, CA',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS saved_plans (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      coverage_amount REAL NOT NULL,
      monthly_premium REAL NOT NULL,
      status TEXT NOT NULL,
      description TEXT NOT NULL,
      last_modified TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS auth_attempts (
      key TEXT PRIMARY KEY,
      count INTEGER NOT NULL,
      reset_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      details TEXT,
      timestamp TEXT NOT NULL
    );
  `);

  // Financial profile collected at onboarding. ALTER keeps existing databases working.
  const profileColumns: [string, string][] = [
    ['city_tier', "TEXT NOT NULL DEFAULT 'Tier 1 (Metro)'"],
    ['home_loan', 'REAL NOT NULL DEFAULT 0'],
    ['other_loans', 'REAL NOT NULL DEFAULT 0'],
    ['monthly_expenses', 'REAL NOT NULL DEFAULT 0'],
    ['existing_life_cover', 'REAL NOT NULL DEFAULT 0'],
    ['existing_health_cover', 'REAL NOT NULL DEFAULT 0'],
    ['employer_benefits', "TEXT NOT NULL DEFAULT '[]'"],
    ['lifestyle_risks', "TEXT NOT NULL DEFAULT '[]'"],
    ['onboarding_completed', 'INTEGER NOT NULL DEFAULT 0'],
  ];
  const existingColumns = new Set(
    (db.prepare('PRAGMA table_info(users)').all() as { name: string }[]).map(c => c.name)
  );
  for (const [column, definition] of profileColumns) {
    if (!existingColumns.has(column)) db.exec(`ALTER TABLE users ADD COLUMN ${column} ${definition}`);
  }

  // Databases created before the financial profile existed hold the old USD-era demo persona; upgrade it once.
  if (process.env.NODE_ENV !== 'production') {
    db.prepare(
      `UPDATE users SET income = 2400000, city = 'Bengaluru, KA', city_tier = 'Tier 1 (Metro)', home_loan = 4500000,
         other_loans = 500000, monthly_expenses = 85000, existing_life_cover = 15000000, existing_health_cover = 500000,
         employer_benefits = '["Group Term Life","OPD Benefits"]', onboarding_completed = 1
       WHERE id = 'USR-7701' AND onboarding_completed = 0 AND income = 145000`
    ).run();
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_cache (
      cache_key TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_strategies (
      user_id TEXT PRIMARY KEY,
      profile_hash TEXT NOT NULL,
      provider TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Seed default demo user if not present
  const checkUserStmt = db.prepare('SELECT id FROM users WHERE email = ?');
  const existingUser = checkUserStmt.get('alex.vance@shieldiq.internal');

  // Demo account has a published password, so never create it in production.
  if (!existingUser && process.env.NODE_ENV !== 'production') {
    const salt = generateSalt();
    const passwordHash = hashPassword('Password123!', salt);
    const now = new Date().toISOString();

    const insertUserStmt = db.prepare(`
      INSERT INTO users (
        id, email, name, password_hash, salt, age, income, dependents, marital_status, occupation, city, created_at, updated_at,
        city_tier, home_loan, other_loans, monthly_expenses, existing_life_cover, existing_health_cover,
        employer_benefits, lifestyle_risks, onboarding_completed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);

    insertUserStmt.run(
      'USR-7701',
      'alex.vance@shieldiq.internal',
      'Alex Vance',
      passwordHash,
      salt,
      34,
      2400000, // ₹24L annual gross income
      2,
      'Married',
      'Senior Systems Architect',
      'Bengaluru, KA',
      now,
      now,
      'Tier 1 (Metro)',
      4500000, // home loan
      500000, // other loans
      85000, // monthly expenses
      15000000, // ₹1.5 Cr term cover
      500000, // ₹5L health cover
      JSON.stringify(['Group Term Life', 'OPD Benefits']),
      JSON.stringify([])
    );

    // Seed default saved plans for demo user
    const insertPlanStmt = db.prepare(`
      INSERT INTO saved_plans (id, user_id, name, category, coverage_amount, monthly_premium, status, description, last_modified)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const initialPlans = [
      {
        id: 'SIQ-992-X',
        userId: 'USR-7701',
        name: 'FY26 Core Comprehensive Portfolio',
        category: 'OmniShield Bundle',
        coverageAmount: 2750000,
        monthlyPremium: 450,
        status: 'Adequate',
        description: 'Primary deployed portfolio combining pure term life, health floater, and critical illness indemnity.',
        lastModified: '2026-10-14',
      },
      {
        id: 'SIQ-104-Y',
        userId: 'USR-7701',
        name: 'Retirement Acceleration Strategy',
        category: 'Term Life Max',
        coverageAmount: 3500000,
        monthlyPremium: 580,
        status: 'Incomplete',
        description: 'Exploratory setup testing increasing term riders with mortgage debt clearance.',
        lastModified: '2026-09-28',
      },
      {
        id: 'SIQ-882-B',
        userId: 'USR-7701',
        name: 'Disability & Trauma Shield v2',
        category: 'Critical Illness',
        coverageAmount: 1200000,
        monthlyPremium: 165,
        status: 'Adequate',
        description: 'Standalone disability income continuity for tech lead occupational hazards.',
        lastModified: '2026-08-15',
      },
      {
        id: 'SIQ-045-Z',
        userId: 'USR-7701',
        name: 'Tier 1 Metro Health Floater',
        category: 'Health Floater',
        coverageAmount: 1000000,
        monthlyPremium: 280,
        status: 'Gap Detected',
        description: 'Super top-up model with $25k deductible; identified 15% co-pay exposure.',
        lastModified: '2026-07-02',
      },
      {
        id: 'SIQ-012-A',
        userId: 'USR-7701',
        name: 'FY25 Archive - Baseline Term',
        category: 'Term Life',
        coverageAmount: 1500000,
        monthlyPremium: 145,
        status: 'Archived',
        description: 'Legacy individual life policy prior to dependents addition.',
        lastModified: '2025-12-20',
      },
    ];

    for (const plan of initialPlans) {
      insertPlanStmt.run(
        plan.id,
        plan.userId,
        plan.name,
        plan.category,
        plan.coverageAmount,
        plan.monthlyPremium,
        plan.status,
        plan.description,
        plan.lastModified
      );
    }
  }

  dbInstance = db;
  return db;
}

export function getDatabase(): DatabaseSync {
  if (!dbInstance) {
    return initDatabase();
  }
  return dbInstance;
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
