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
        id, email, name, password_hash, salt, age, income, dependents, marital_status, occupation, city, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertUserStmt.run(
      'USR-7701',
      'alex.vance@shieldiq.internal',
      'Alex Vance',
      passwordHash,
      salt,
      34,
      145000,
      2,
      'Married',
      'Senior Systems Architect',
      'San Francisco, CA',
      now,
      now
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
