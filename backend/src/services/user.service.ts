import crypto from 'node:crypto';
import { getDatabase, hashPassword, hashPasswordAsync, generateSalt } from '../db/database.js';
import { DEPENDENT_RELATIONS, householdOf, type CityTier, type Dependent, type StrategyProfile } from './actuarial.service.js';

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
  cityTier: CityTier;
  homeLoan: number;
  otherLoans: number;
  monthlyExpenses: number;
  existingLifeCover: number;
  existingHealthCover: number;
  liquidSavings: number;
  spouseIncome: number;
  dependentDetails: Dependent[];
  parentsHealthCover: number;
  loanEmi: number;
  homeLoanYearsLeft: number;
  existingCiCover: number;
  existingPaCover: number;
  employerBenefits: string[];
  lifestyleRisks: string[];
  onboardingCompleted: boolean;
  /** When the user last saved their financial profile (drives the yearly review prompt). */
  profileReviewedAt: string;
  /** When the user accepted the methodology & liability disclaimer; null if never. */
  disclaimerAcknowledgedAt: string | null;
  isLoggedIn: boolean;
}

/** Chat messages kept per user; older ones are deleted as new ones arrive. */
export const CHAT_HISTORY_LIMIT = 100;

export interface ChatEntry {
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
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
  /** The strategy's headline numbers when the plan was saved; null for plans saved before snapshots existed. */
  snapshot: PlanSnapshot | null;
}

export interface PlanSnapshot {
  score: number;
  lifeGap: number;
  healthGap: number;
  annualPremium: number;
}

export type ProfileUpdate = Partial<
  Pick<
    UserProfileData,
    | 'name' | 'age' | 'income' | 'dependents' | 'maritalStatus' | 'occupation' | 'city' | 'cityTier'
    | 'homeLoan' | 'otherLoans' | 'monthlyExpenses' | 'existingLifeCover' | 'existingHealthCover' | 'liquidSavings' | 'spouseIncome' | 'dependentDetails' | 'parentsHealthCover' | 'loanEmi' | 'homeLoanYearsLeft' | 'existingCiCover' | 'existingPaCover'
    | 'employerBenefits' | 'lifestyleRisks' | 'onboardingCompleted'
  >
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
  cityTier: 'city_tier',
  homeLoan: 'home_loan',
  otherLoans: 'other_loans',
  monthlyExpenses: 'monthly_expenses',
  existingLifeCover: 'existing_life_cover',
  existingHealthCover: 'existing_health_cover',
  liquidSavings: 'liquid_savings',
  spouseIncome: 'spouse_income',
  dependentDetails: 'dependent_details',
  parentsHealthCover: 'parents_health_cover',
  loanEmi: 'loan_emi',
  homeLoanYearsLeft: 'home_loan_years_left',
  existingCiCover: 'existing_ci_cover',
  existingPaCover: 'existing_pa_cover',
  employerBenefits: 'employer_benefits',
  lifestyleRisks: 'lifestyle_risks',
  onboardingCompleted: 'onboarding_completed',
};

const parseDependents = (value: unknown): Dependent[] => {
  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed)
      ? parsed.filter(d => (DEPENDENT_RELATIONS as readonly string[]).includes(d?.relation) && Number.isFinite(d?.age))
      : [];
  } catch {
    return [];
  }
};

const parseList = (value: unknown): string[] => {
  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
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
    cityTier: row.city_tier as CityTier,
    homeLoan: Number(row.home_loan),
    otherLoans: Number(row.other_loans),
    monthlyExpenses: Number(row.monthly_expenses),
    existingLifeCover: Number(row.existing_life_cover),
    existingHealthCover: Number(row.existing_health_cover),
    liquidSavings: Number(row.liquid_savings),
    spouseIncome: Number(row.spouse_income),
    dependentDetails: parseDependents(row.dependent_details),
    parentsHealthCover: Number(row.parents_health_cover),
    loanEmi: Number(row.loan_emi),
    homeLoanYearsLeft: Number(row.home_loan_years_left),
    existingCiCover: Number(row.existing_ci_cover),
    existingPaCover: Number(row.existing_pa_cover),
    employerBenefits: parseList(row.employer_benefits),
    lifestyleRisks: parseList(row.lifestyle_risks),
    onboardingCompleted: Number(row.onboarding_completed) === 1,
    profileReviewedAt: String(row.profile_reviewed_at ?? row.created_at),
    disclaimerAcknowledgedAt: row.disclaimer_acknowledged_at ? String(row.disclaimer_acknowledged_at) : null,
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
    snapshot: row.snapshot ? (JSON.parse(String(row.snapshot)) as PlanSnapshot) : null,
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

/** Constant-time check of a password against a user row's stored hash. */
async function passwordMatches(row: UserRow, password: string): Promise<boolean> {
  const expected = Buffer.from(String(row.password_hash), 'hex');
  const actual = Buffer.from(await hashPasswordAsync(password, String(row.salt)), 'hex');
  return crypto.timingSafeEqual(expected, actual);
}

async function setPassword(userId: string, password: string) {
  const salt = generateSalt();
  const hash = await hashPasswordAsync(password, salt);
  getDatabase()
    .prepare('UPDATE users SET password_hash = ?, salt = ?, updated_at = ? WHERE id = ?')
    .run(hash, salt, new Date().toISOString(), userId);
}

export class UserService {
  static async register(email: string, password: string, name: string): Promise<{ token: string; user: UserProfileData } | null> {
    const db = getDatabase();
    const normalized = email.toLowerCase();
    if (db.prepare('SELECT id FROM users WHERE email = ?').get(normalized)) return null;

    const id = `USR-${crypto.randomUUID()}`;
    const salt = generateSalt();
    const hash = await hashPasswordAsync(password, salt);
    // Re-check after the await: another request may have registered the same email meanwhile.
    if (db.prepare('SELECT id FROM users WHERE email = ?').get(normalized)) return null;
    const now = new Date().toISOString();
    // Explicit blank profile: the column defaults describe the demo persona, not a new user.
    db.prepare(
      `INSERT INTO users (id, email, name, password_hash, salt, created_at, updated_at,
        age, income, dependents, marital_status, occupation, city, onboarding_completed)
       VALUES (?, ?, ?, ?, ?, ?, ?, 30, 0, 0, 'Single', '', '', 0)`
    ).run(id, normalized, name, hash, salt, now, now);
    audit(id, 'REGISTER');

    return { token: createSession(id), user: UserService.getUserProfile(id)! };
  }

  static async login(email: string, password: string): Promise<{ token: string; user: UserProfileData } | null> {
    const row = getDatabase().prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase()) as
      | UserRow
      | undefined;
    const expected = Buffer.from(row ? String(row.password_hash) : DUMMY_HASH, 'hex');
    const actual = Buffer.from(await hashPasswordAsync(password, row ? String(row.salt) : DUMMY_SALT), 'hex');
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

  static async resetPassword(token: string, newPassword: string): Promise<boolean> {
    const db = getDatabase();
    const row = db.prepare('SELECT user_id, expires_at FROM password_resets WHERE token_hash = ?').get(hashToken(token)) as
      | UserRow
      | undefined;
    db.prepare('DELETE FROM password_resets WHERE token_hash = ?').run(hashToken(token));
    if (!row || new Date(String(row.expires_at)).getTime() < Date.now()) return false;
    const userId = String(row.user_id);
    await setPassword(userId, newPassword);
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
    audit(userId, 'PASSWORD_RESET');
    return true;
  }

  /** Changes the password and signs out every other session. */
  static async changePassword(userId: string, currentToken: string, currentPassword: string, newPassword: string): Promise<boolean> {
    const row = getDatabase().prepare('SELECT password_hash, salt FROM users WHERE id = ?').get(userId) as UserRow | undefined;
    if (!row) return false;
    if (!(await passwordMatches(row, currentPassword))) {
      audit(userId, 'PASSWORD_CHANGE_FAILED');
      return false;
    }
    await setPassword(userId, newPassword);
    getDatabase().prepare('DELETE FROM sessions WHERE user_id = ? AND token != ?').run(userId, hashToken(currentToken));
    audit(userId, 'PASSWORD_CHANGE');
    return true;
  }

  /** Everything stored about the user, for a data-access request. Never includes credentials. */
  static exportData(userId: string) {
    const profile = UserService.getUserProfile(userId);
    if (!profile) return null;
    const ai = getDatabase().prepare('SELECT provider, payload, created_at FROM ai_strategies WHERE user_id = ?').get(userId) as UserRow | undefined;
    const { isLoggedIn, ...storedProfile } = profile; // isLoggedIn is session state, not stored data
    return {
      exportedAt: new Date().toISOString(),
      profile: storedProfile,
      savedPlans: UserService.listPlans(userId),
      aiStrategy: ai ? { provider: ai.provider, createdAt: ai.created_at, strategy: JSON.parse(String(ai.payload)) } : null,
      chatHistory: UserService.listChat(userId, CHAT_HISTORY_LIMIT),
    };
  }

  /** The user's most recent chat messages, oldest first. */
  static listChat(userId: string, limit: number): ChatEntry[] {
    const rows = getDatabase()
      .prepare('SELECT role, content, created_at FROM chat_messages WHERE user_id = ? ORDER BY id DESC LIMIT ?')
      .all(userId, limit) as UserRow[];
    return rows.reverse().map(r => ({ role: r.role as ChatEntry['role'], content: String(r.content), createdAt: String(r.created_at) }));
  }

  /** Stores one question and its answer together, keeping only the newest CHAT_HISTORY_LIMIT messages. */
  static saveChatTurn(userId: string, question: string, answer: string): void {
    const db = getDatabase();
    const now = new Date().toISOString();
    const insert = db.prepare('INSERT INTO chat_messages (user_id, role, content, created_at) VALUES (?, ?, ?, ?)');
    insert.run(userId, 'user', question, now);
    insert.run(userId, 'assistant', answer, now);
    db.prepare(
      `DELETE FROM chat_messages WHERE user_id = ? AND id NOT IN
         (SELECT id FROM chat_messages WHERE user_id = ? ORDER BY id DESC LIMIT ?)`
    ).run(userId, userId, CHAT_HISTORY_LIMIT);
  }

  static clearChat(userId: string): void {
    getDatabase().prepare('DELETE FROM chat_messages WHERE user_id = ?').run(userId);
  }

  /**
   * Erases the account after confirming the password. Sessions, saved plans, reset tokens, AI strategies and chats
   * cascade from the users row; the security log and login limiter are cleared explicitly.
   */
  static async deleteAccount(userId: string, password: string): Promise<boolean> {
    const db = getDatabase();
    const row = db.prepare('SELECT email, password_hash, salt FROM users WHERE id = ?').get(userId) as UserRow | undefined;
    if (!row || !(await passwordMatches(row, password))) return false;
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    db.prepare('DELETE FROM audit_logs WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM auth_attempts WHERE key = ?').run(`login:${row.email}`);
    audit(null, 'ACCOUNT_DELETED'); // anonymous record that an erasure happened
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

  /** Like hitRateLimit but read-only: seconds to wait if `key` already has `max` attempts in its window, else null. */
  static rateLimitRetryAfter(key: string, max: number): number | null {
    const now = Date.now();
    const row = getDatabase().prepare('SELECT count, reset_at FROM auth_attempts WHERE key = ? AND reset_at >= ?').get(key, now) as UserRow | undefined;
    return row && Number(row.count) >= max ? Math.ceil((Number(row.reset_at) - now) / 1000) : null;
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
    ) as [keyof ProfileUpdate, unknown][];

    if (entries.length > 0) {
      const now = new Date().toISOString();
      const sets = entries.map(([key]) => `${PROFILE_COLUMNS[key]} = ?`).join(', ');
      const toColumnValue = (value: unknown) =>
        Array.isArray(value) ? JSON.stringify(value) : typeof value === 'boolean' ? Number(value) : (value as string | number);
      getDatabase()
        .prepare(`UPDATE users SET ${sets}, updated_at = ?, profile_reviewed_at = ? WHERE id = ?`)
        .run(...entries.map(([, value]) => toColumnValue(value)), now, now, userId);
      audit(userId, 'PROFILE_UPDATE', entries.map(([key]) => key).join(','));
    }
    const profile = UserService.getUserProfile(userId);
    // With a dependents list, the stored count is derived from it so the two never disagree.
    if (profile && profile.dependentDetails.length > 0) {
      const count = householdOf(profile).count;
      if (count !== profile.dependents) {
        getDatabase().prepare('UPDATE users SET dependents = ? WHERE id = ?').run(count, userId);
        profile.dependents = count;
      }
    }
    return profile;
  }

  /** Records acceptance of the disclaimer once; later calls keep the first time. */
  static acknowledgeDisclaimer(userId: string): UserProfileData | null {
    const changed = getDatabase()
      .prepare('UPDATE users SET disclaimer_acknowledged_at = ? WHERE id = ? AND disclaimer_acknowledged_at IS NULL')
      .run(new Date().toISOString(), userId).changes;
    if (changed) audit(userId, 'DISCLAIMER_ACKNOWLEDGED');
    return UserService.getUserProfile(userId);
  }

  /** The subset of the profile the strategy engine uses; deliberately excludes name, email and free-text city. */
  static getStrategyProfile(userId: string): StrategyProfile | null {
    const u = UserService.getUserProfile(userId);
    if (!u) return null;
    return {
      age: u.age,
      income: u.income,
      dependents: u.dependents,
      maritalStatus: u.maritalStatus,
      occupation: u.occupation,
      cityTier: u.cityTier,
      homeLoan: u.homeLoan,
      otherLoans: u.otherLoans,
      monthlyExpenses: u.monthlyExpenses,
      existingLifeCover: u.existingLifeCover,
      existingHealthCover: u.existingHealthCover,
      liquidSavings: u.liquidSavings,
      spouseIncome: u.spouseIncome,
      dependentDetails: u.dependentDetails,
      parentsHealthCover: u.parentsHealthCover,
      loanEmi: u.loanEmi,
      homeLoanYearsLeft: u.homeLoanYearsLeft,
      existingCiCover: u.existingCiCover,
      existingPaCover: u.existingPaCover,
      employerBenefits: u.employerBenefits,
      lifestyleRisks: u.lifestyleRisks,
    };
  }

  static listPlans(userId: string): SavedPlanData[] {
    return (
      getDatabase()
        .prepare('SELECT * FROM saved_plans WHERE user_id = ? ORDER BY last_modified DESC, rowid DESC')
        .all(userId) as UserRow[]
    ).map(toPlan);
  }

  static createPlan(userId: string, plan: Omit<SavedPlanData, 'id' | 'lastModified' | 'snapshot'>, snapshot: PlanSnapshot | null = null): SavedPlanData {
    const id = `SIQ-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const lastModified = new Date().toISOString().split('T')[0];
    getDatabase()
      .prepare(
        `INSERT INTO saved_plans (id, user_id, name, category, coverage_amount, monthly_premium, status, description, last_modified, snapshot)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(id, userId, plan.name, plan.category, plan.coverageAmount, plan.monthlyPremium, plan.status, plan.description, lastModified, snapshot && JSON.stringify(snapshot));
    audit(userId, 'PLAN_CREATE', id);
    return { ...plan, id, lastModified, snapshot };
  }

  /** Deletes only if the plan belongs to the user. */
  static deletePlan(userId: string, planId: string): boolean {
    const result = getDatabase().prepare('DELETE FROM saved_plans WHERE id = ? AND user_id = ?').run(planId, userId);
    if (result.changes > 0) audit(userId, 'PLAN_DELETE', planId);
    return result.changes > 0;
  }
}
