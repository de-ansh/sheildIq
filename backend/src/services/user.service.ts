import crypto from 'node:crypto';
import { getDatabase, hashPassword, generateSalt } from '../db/database.js';

export interface UserProfileData {
  id: string;
  name: string;
  email: string;
  age: number;
  income: number;
  dependents: number;
  maritalStatus: 'Single' | 'Married';
  occupation: string;
  city: string;
  isLoggedIn: boolean;
}

export interface SavedPlanData {
  id: string;
  name: string;
  category: string;
  coverageAmount: number;
  monthlyPremium: number;
  status: 'Adequate' | 'Gap Detected' | 'Incomplete' | 'Archived';
  description: string;
  lastModified: string;
}

export type ProfileUpdate = Partial<
  Pick<UserProfileData, 'name' | 'age' | 'income' | 'dependents' | 'maritalStatus' | 'occupation' | 'city'>
>;

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 30 * 60 * 1000;

// Maps camelCase profile fields to their DB columns; also acts as the update whitelist.
const PROFILE_COLUMNS: Record<keyof ProfileUpdate, string> = {
  name: 'name',
  age: 'age',
  income: 'income',
  dependents: 'dependents',
  maritalStatus: 'marital_status',
  occupation: 'occupation',
  city: 'city',
};

type UserRow = Record<string, string | number>;

function toProfile(row: UserRow): UserProfileData {
  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    age: Number(row.age),
    income: Number(row.income),
    dependents: Number(row.dependents),
    maritalStatus: row.marital_status as UserProfileData['maritalStatus'],
    occupation: String(row.occupation),
    city: String(row.city),
    isLoggedIn: true,
  };
}

function toPlan(row: UserRow): SavedPlanData {
  return {
    id: String(row.id),
    name: String(row.name),
    category: String(row.category),
    coverageAmount: Number(row.coverage_amount),
    monthlyPremium: Number(row.monthly_premium),
    status: row.status as SavedPlanData['status'],
    description: String(row.description),
    lastModified: String(row.last_modified),
  };
}

function audit(userId: string | null, action: string, details?: string) {
  getDatabase()
    .prepare('INSERT INTO audit_logs (id, user_id, action, details, timestamp) VALUES (?, ?, ?, ?, ?)')
    .run(crypto.randomUUID(), userId, action, details ?? null, new Date().toISOString());
}

// Only a hash of the token is stored, so a leaked DB cannot be replayed as live sessions.
const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

// Used when the email is unknown so login takes the same time either way (no user enumeration).
const DUMMY_SALT = generateSalt();
const DUMMY_HASH = hashPassword(crypto.randomBytes(16).toString('hex'), DUMMY_SALT);

function createSession(userId: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  const db = getDatabase();
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(new Date(now).toISOString());
  db.prepare('INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
    .run(hashToken(token), userId, new Date(now + SESSION_TTL_MS).toISOString(), new Date(now).toISOString());
  return token;
}

function setPassword(userId: string, password: string) {
  const salt = generateSalt();
  getDatabase()
    .prepare('UPDATE users SET password_hash = ?, salt = ?, updated_at = ? WHERE id = ?')
    .run(hashPassword(password, salt), salt, new Date().toISOString(), userId);
}

export class UserService {
  static register(email: string, password: string, name: string): { token: string; user: UserProfileData } | null {
    const db = getDatabase();
    const normalized = email.toLowerCase();
    if (db.prepare('SELECT id FROM users WHERE email = ?').get(normalized)) return null;

    const id = `USR-${crypto.randomUUID()}`;
    const salt = generateSalt();
    const now = new Date().toISOString();
    db.prepare(
      'INSERT INTO users (id, email, name, password_hash, salt, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(id, normalized, name, hashPassword(password, salt), salt, now, now);
    audit(id, 'REGISTER');

    return { token: createSession(id), user: UserService.getUserProfile(id)! };
  }

  static login(email: string, password: string): { token: string; user: UserProfileData } | null {
    const row = getDatabase().prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase()) as
      | UserRow
      | undefined;
    const expected = Buffer.from(row ? String(row.password_hash) : DUMMY_HASH, 'hex');
    const actual = Buffer.from(hashPassword(password, row ? String(row.salt) : DUMMY_SALT), 'hex');
    if (!crypto.timingSafeEqual(expected, actual) || !row) {
      if (!row) return null;
      audit(String(row.id), 'LOGIN_FAILED');
      return null;
    }

    audit(String(row.id), 'LOGIN');
    return { token: createSession(String(row.id)), user: toProfile(row) };
  }

  /** Returns a one-time reset token, or null for unknown emails (callers must not reveal which). */
  static requestPasswordReset(email: string): string | null {
    const db = getDatabase();
    const row = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase()) as UserRow | undefined;
    if (!row) return null;
    const userId = String(row.id);
    const token = crypto.randomBytes(32).toString('hex');
    // One live reset link per user: issuing a new one invalidates older links.
    db.prepare('DELETE FROM password_resets WHERE user_id = ? OR expires_at < ?').run(userId, new Date().toISOString());
    db.prepare('INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
      .run(hashToken(token), userId, new Date(Date.now() + RESET_TTL_MS).toISOString());
    audit(userId, 'PASSWORD_RESET_REQUESTED');
    return token;
  }

  static resetPassword(token: string, newPassword: string): boolean {
    const db = getDatabase();
    const row = db.prepare('SELECT user_id, expires_at FROM password_resets WHERE token_hash = ?').get(hashToken(token)) as
      | UserRow
      | undefined;
    db.prepare('DELETE FROM password_resets WHERE token_hash = ?').run(hashToken(token));
    if (!row || new Date(String(row.expires_at)).getTime() < Date.now()) return false;
    const userId = String(row.user_id);
    setPassword(userId, newPassword);
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
    audit(userId, 'PASSWORD_RESET');
    return true;
  }

  /** Changes the password and signs out every other session. */
  static changePassword(userId: string, currentToken: string, currentPassword: string, newPassword: string): boolean {
    const row = getDatabase().prepare('SELECT password_hash, salt FROM users WHERE id = ?').get(userId) as UserRow | undefined;
    if (!row) return false;
    const expected = Buffer.from(String(row.password_hash), 'hex');
    const actual = Buffer.from(hashPassword(currentPassword, String(row.salt)), 'hex');
    if (!crypto.timingSafeEqual(expected, actual)) {
      audit(userId, 'PASSWORD_CHANGE_FAILED');
      return false;
    }
    setPassword(userId, newPassword);
    getDatabase().prepare('DELETE FROM sessions WHERE user_id = ? AND token != ?').run(userId, hashToken(currentToken));
    audit(userId, 'PASSWORD_CHANGE');
    return true;
  }

  static logoutAll(userId: string): void {
    getDatabase().prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
    audit(userId, 'LOGOUT_ALL');
  }

  /** Counts an attempt for `key`; returns seconds to wait if over `max` in the window, else null. */
  static hitRateLimit(key: string, max: number, windowMs: number): number | null {
    const db = getDatabase();
    const now = Date.now();
    db.prepare('DELETE FROM auth_attempts WHERE reset_at < ?').run(now);
    db.prepare(
      `INSERT INTO auth_attempts (key, count, reset_at) VALUES (?, 1, ?)
       ON CONFLICT(key) DO UPDATE SET count = count + 1`
    ).run(key, now + windowMs);
    const row = db.prepare('SELECT count, reset_at FROM auth_attempts WHERE key = ?').get(key) as UserRow;
    return Number(row.count) > max ? Math.ceil((Number(row.reset_at) - now) / 1000) : null;
  }

  static logout(token: string): void {
    getDatabase().prepare('DELETE FROM sessions WHERE token = ?').run(hashToken(token));
  }

  /** Returns the user id for a live session token, or null. */
  static resolveSession(token: string): string | null {
    const row = getDatabase().prepare('SELECT user_id, expires_at FROM sessions WHERE token = ?').get(hashToken(token)) as
      | UserRow
      | undefined;
    if (!row) return null;
    if (new Date(String(row.expires_at)).getTime() < Date.now()) {
      UserService.logout(token);
      return null;
    }
    return String(row.user_id);
  }

  static getUserProfile(userId: string): UserProfileData | null {
    const row = getDatabase().prepare('SELECT * FROM users WHERE id = ?').get(userId) as UserRow | undefined;
    return row ? toProfile(row) : null;
  }

  static updateUserProfile(userId: string, data: ProfileUpdate): UserProfileData | null {
    const entries = Object.entries(data).filter(
      ([key, value]) => value !== undefined && key in PROFILE_COLUMNS
    ) as [keyof ProfileUpdate, string | number][];

    if (entries.length > 0) {
      const sets = entries.map(([key]) => `${PROFILE_COLUMNS[key]} = ?`).join(', ');
      getDatabase()
        .prepare(`UPDATE users SET ${sets}, updated_at = ? WHERE id = ?`)
        .run(...entries.map(([, value]) => value), new Date().toISOString(), userId);
      audit(userId, 'PROFILE_UPDATE', entries.map(([key]) => key).join(','));
    }
    return UserService.getUserProfile(userId);
  }

  static listPlans(userId: string): SavedPlanData[] {
    return (
      getDatabase()
        .prepare('SELECT * FROM saved_plans WHERE user_id = ? ORDER BY last_modified DESC')
        .all(userId) as UserRow[]
    ).map(toPlan);
  }

  static createPlan(userId: string, plan: Omit<SavedPlanData, 'id' | 'lastModified'>): SavedPlanData {
    const id = `SIQ-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const lastModified = new Date().toISOString().split('T')[0];
    getDatabase()
      .prepare(
        `INSERT INTO saved_plans (id, user_id, name, category, coverage_amount, monthly_premium, status, description, last_modified)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(id, userId, plan.name, plan.category, plan.coverageAmount, plan.monthlyPremium, plan.status, plan.description, lastModified);
    audit(userId, 'PLAN_CREATE', id);
    return { ...plan, id, lastModified };
  }

  /** Deletes only if the plan belongs to the user. */
  static deletePlan(userId: string, planId: string): boolean {
    const result = getDatabase().prepare('DELETE FROM saved_plans WHERE id = ? AND user_id = ?').run(planId, userId);
    if (result.changes > 0) audit(userId, 'PLAN_DELETE', planId);
    return result.changes > 0;
  }
}
