import crypto from 'node:crypto';
import { hashPassword, hashPasswordAsync, generateSalt, one, query, run } from '../db/database.js';
import { DEPENDENT_RELATIONS, HEALTH_CONDITIONS, householdOf, type CityTier, type Dependent, type HealthCondition, type StrategyProfile } from './actuarial.service.js';

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
  spouseAge: number;
  dependentDetails: Dependent[];
  parentsHealthCover: number;
  loanEmi: number;
  homeLoanYearsLeft: number;
  existingCiCover: number;
  existingPaCover: number;
  employerBenefits: string[];
  lifestyleRisks: string[];
  healthConditions: HealthCondition[];
  heightCm: number;
  weightKg: number;
  onboardingCompleted: boolean;
  /** When the user last saved their financial profile (drives the yearly review prompt). */
  profileReviewedAt: string;
  /** When the user accepted the methodology & liability disclaimer; null if never. */
  disclaimerAcknowledgedAt: string | null;
  /** Language for the app and AI answers. */
  language: Language;
  isLoggedIn: boolean;
}

export const LANGUAGES = ['en', 'hi'] as const;
export type Language = (typeof LANGUAGES)[number];

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
    | 'homeLoan' | 'otherLoans' | 'monthlyExpenses' | 'existingLifeCover' | 'existingHealthCover' | 'liquidSavings' | 'spouseIncome' | 'spouseAge' | 'dependentDetails' | 'parentsHealthCover' | 'loanEmi' | 'homeLoanYearsLeft' | 'existingCiCover' | 'existingPaCover'
    | 'employerBenefits' | 'lifestyleRisks' | 'healthConditions' | 'heightCm' | 'weightKg' | 'onboardingCompleted' | 'language'
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
  spouseAge: 'spouse_age',
  dependentDetails: 'dependent_details',
  parentsHealthCover: 'parents_health_cover',
  loanEmi: 'loan_emi',
  homeLoanYearsLeft: 'home_loan_years_left',
  existingCiCover: 'existing_ci_cover',
  existingPaCover: 'existing_pa_cover',
  employerBenefits: 'employer_benefits',
  lifestyleRisks: 'lifestyle_risks',
  healthConditions: 'health_conditions',
  heightCm: 'height_cm',
  weightKg: 'weight_kg',
  onboardingCompleted: 'onboarding_completed',
  language: 'language',
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

type UserRow = Record<string, unknown>;

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
    spouseAge: Number(row.spouse_age ?? 0),
    dependentDetails: parseDependents(row.dependent_details),
    parentsHealthCover: Number(row.parents_health_cover),
    loanEmi: Number(row.loan_emi),
    homeLoanYearsLeft: Number(row.home_loan_years_left),
    existingCiCover: Number(row.existing_ci_cover),
    existingPaCover: Number(row.existing_pa_cover),
    employerBenefits: parseList(row.employer_benefits),
    lifestyleRisks: parseList(row.lifestyle_risks),
    healthConditions: parseList(row.health_conditions).filter((c): c is HealthCondition => (HEALTH_CONDITIONS as readonly string[]).includes(c)),
    heightCm: Number(row.height_cm ?? 0),
    weightKg: Number(row.weight_kg ?? 0),
    onboardingCompleted: Number(row.onboarding_completed) === 1,
    profileReviewedAt: String(row.profile_reviewed_at ?? row.created_at),
    disclaimerAcknowledgedAt: row.disclaimer_acknowledged_at ? String(row.disclaimer_acknowledged_at) : null,
    language: (LANGUAGES as readonly string[]).includes(String(row.language)) ? (row.language as Language) : 'en',
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
  return run('INSERT INTO audit_logs (id, user_id, action, details, timestamp) VALUES ($1, $2, $3, $4, $5)', [
    crypto.randomUUID(), userId, action, details ?? null, new Date().toISOString(),
  ]);
}

// Only a hash of the token is stored, so a leaked DB cannot be replayed as live sessions.
const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

// Used when the email is unknown so login takes the same time either way (no user enumeration).
const DUMMY_SALT = generateSalt();
const DUMMY_HASH = hashPassword(crypto.randomBytes(16).toString('hex'), DUMMY_SALT);

async function createSession(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  await run('DELETE FROM sessions WHERE expires_at < $1', [new Date(now).toISOString()]);
  await run('INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES ($1, $2, $3, $4)', [
    hashToken(token), userId, new Date(now + SESSION_TTL_MS).toISOString(), new Date(now).toISOString(),
  ]);
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
  await run('UPDATE users SET password_hash = $1, salt = $2, updated_at = $3 WHERE id = $4', [hash, salt, new Date().toISOString(), userId]);
}

const isUniqueViolation = (err: unknown) => (err as { code?: string })?.code === '23505';

export class UserService {
  static async register(email: string, password: string, name: string): Promise<{ token: string; user: UserProfileData } | null> {
    const normalized = email.toLowerCase();
    if (await one('SELECT id FROM users WHERE email = $1', [normalized])) return null;

    const id = `USR-${crypto.randomUUID()}`;
    const salt = generateSalt();
    const hash = await hashPasswordAsync(password, salt);
    const now = new Date().toISOString();
    try {
      await run(
        'INSERT INTO users (id, email, name, password_hash, salt, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $6)',
        [id, normalized, name, hash, salt, now]
      );
    } catch (err) {
      // Two sign-ups with the same email at once: the unique index lets exactly one through.
      if (isUniqueViolation(err)) return null;
      throw err;
    }
    await audit(id, 'REGISTER');
    return { token: await createSession(id), user: (await UserService.getUserProfile(id))! };
  }

  static async login(email: string, password: string): Promise<{ token: string; user: UserProfileData } | null> {
    const row = await one<UserRow>('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    const expected = Buffer.from(row ? String(row.password_hash) : DUMMY_HASH, 'hex');
    const actual = Buffer.from(await hashPasswordAsync(password, row ? String(row.salt) : DUMMY_SALT), 'hex');
    if (!crypto.timingSafeEqual(expected, actual) || !row) {
      if (!row) return null;
      await audit(String(row.id), 'LOGIN_FAILED');
      return null;
    }

    await audit(String(row.id), 'LOGIN');
    return { token: await createSession(String(row.id)), user: toProfile(row) };
  }

  /** Returns a one-time reset token, or null for unknown emails (callers must not reveal which). */
  static async requestPasswordReset(email: string): Promise<string | null> {
    const row = await one<UserRow>('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (!row) return null;
    const userId = String(row.id);
    const token = crypto.randomBytes(32).toString('hex');
    // One live reset link per user: issuing a new one invalidates older links.
    await run('DELETE FROM password_resets WHERE user_id = $1 OR expires_at < $2', [userId, new Date().toISOString()]);
    await run('INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES ($1, $2, $3)', [
      hashToken(token), userId, new Date(Date.now() + RESET_TTL_MS).toISOString(),
    ]);
    await audit(userId, 'PASSWORD_RESET_REQUESTED');
    return token;
  }

  static async resetPassword(token: string, newPassword: string): Promise<boolean> {
    // DELETE ... RETURNING consumes the token in one step, so it can never be used twice.
    const row = await one<UserRow>('DELETE FROM password_resets WHERE token_hash = $1 RETURNING user_id, expires_at', [hashToken(token)]);
    if (!row || new Date(String(row.expires_at)).getTime() < Date.now()) return false;
    const userId = String(row.user_id);
    await setPassword(userId, newPassword);
    await run('DELETE FROM sessions WHERE user_id = $1', [userId]);
    await audit(userId, 'PASSWORD_RESET');
    return true;
  }

  /** Changes the password and signs out every other session. */
  static async changePassword(userId: string, currentToken: string, currentPassword: string, newPassword: string): Promise<boolean> {
    const row = await one<UserRow>('SELECT password_hash, salt FROM users WHERE id = $1', [userId]);
    if (!row) return false;
    if (!(await passwordMatches(row, currentPassword))) {
      await audit(userId, 'PASSWORD_CHANGE_FAILED');
      return false;
    }
    await setPassword(userId, newPassword);
    await run('DELETE FROM sessions WHERE user_id = $1 AND token != $2', [userId, hashToken(currentToken)]);
    await audit(userId, 'PASSWORD_CHANGE');
    return true;
  }

  /** Everything stored about the user, for a data-access request. Never includes credentials. */
  static async exportData(userId: string) {
    const profile = await UserService.getUserProfile(userId);
    if (!profile) return null;
    const ai = await one<UserRow>('SELECT provider, payload, created_at FROM ai_strategies WHERE user_id = $1', [userId]);
    const { isLoggedIn, ...storedProfile } = profile; // isLoggedIn is session state, not stored data
    return {
      exportedAt: new Date().toISOString(),
      profile: storedProfile,
      savedPlans: await UserService.listPlans(userId),
      aiStrategy: ai ? { provider: ai.provider, createdAt: ai.created_at, strategy: JSON.parse(String(ai.payload)) } : null,
      chatHistory: await UserService.listChat(userId, CHAT_HISTORY_LIMIT),
    };
  }

  /** The user's most recent chat messages, oldest first. */
  static async listChat(userId: string, limit: number): Promise<ChatEntry[]> {
    const rows = await query<UserRow>('SELECT role, content, created_at FROM chat_messages WHERE user_id = $1 ORDER BY id DESC LIMIT $2', [userId, limit]);
    return rows.reverse().map(r => ({ role: r.role as ChatEntry['role'], content: String(r.content), createdAt: String(r.created_at) }));
  }

  /** Stores one question and its answer together, keeping only the newest CHAT_HISTORY_LIMIT messages. */
  static async saveChatTurn(userId: string, question: string, answer: string): Promise<void> {
    // One statement, so a question is never stored without its answer.
    await run(
      `INSERT INTO chat_messages (user_id, role, content, created_at) VALUES ($1, 'user', $2, $4), ($1, 'assistant', $3, $4)`,
      [userId, question, answer, new Date().toISOString()]
    );
    await run(
      `DELETE FROM chat_messages WHERE user_id = $1 AND id NOT IN
         (SELECT id FROM chat_messages WHERE user_id = $1 ORDER BY id DESC LIMIT $2)`,
      [userId, CHAT_HISTORY_LIMIT]
    );
  }

  static async clearChat(userId: string): Promise<void> {
    await run('DELETE FROM chat_messages WHERE user_id = $1', [userId]);
  }

  /**
   * Erases the account after confirming the password. Sessions, saved plans, reset tokens, AI strategies and chats
   * cascade from the users row; the security log and login limiter are cleared explicitly.
   */
  static async deleteAccount(userId: string, password: string): Promise<boolean> {
    const row = await one<UserRow>('SELECT email, password_hash, salt FROM users WHERE id = $1', [userId]);
    if (!row || !(await passwordMatches(row, password))) return false;
    await run('DELETE FROM users WHERE id = $1', [userId]);
    await run('DELETE FROM audit_logs WHERE user_id = $1', [userId]);
    await run('DELETE FROM auth_attempts WHERE key = $1', [`login:${row.email}`]);
    await audit(null, 'ACCOUNT_DELETED'); // anonymous record that an erasure happened
    return true;
  }

  static async logoutAll(userId: string): Promise<void> {
    await run('DELETE FROM sessions WHERE user_id = $1', [userId]);
    await audit(userId, 'LOGOUT_ALL');
  }

  /** Counts an attempt for `key`; returns seconds to wait if over `max` in the window, else null. */
  static async hitRateLimit(key: string, max: number, windowMs: number): Promise<number | null> {
    const now = Date.now();
    // One atomic upsert: concurrent requests (or several app instances) can never both read a stale count.
    // An expired window restarts at 1.
    const row = (await one<UserRow>(
      `INSERT INTO auth_attempts (key, count, reset_at) VALUES ($1, 1, $2)
       ON CONFLICT (key) DO UPDATE SET
         count = CASE WHEN auth_attempts.reset_at < $3 THEN 1 ELSE auth_attempts.count + 1 END,
         reset_at = CASE WHEN auth_attempts.reset_at < $3 THEN $2 ELSE auth_attempts.reset_at END
       RETURNING count, reset_at`,
      [key, now + windowMs, now]
    ))!;
    return Number(row.count) > max ? Math.ceil((Number(row.reset_at) - now) / 1000) : null;
  }

  /** Like hitRateLimit but read-only: seconds to wait if `key` already has `max` attempts in its window, else null. */
  static async rateLimitRetryAfter(key: string, max: number): Promise<number | null> {
    const now = Date.now();
    const row = await one<UserRow>('SELECT count, reset_at FROM auth_attempts WHERE key = $1 AND reset_at >= $2', [key, now]);
    return row && Number(row.count) >= max ? Math.ceil((Number(row.reset_at) - now) / 1000) : null;
  }

  static async logout(token: string): Promise<void> {
    await run('DELETE FROM sessions WHERE token = $1', [hashToken(token)]);
  }

  /** Returns the user id for a live session token, or null. */
  static async resolveSession(token: string): Promise<string | null> {
    const row = await one<UserRow>('SELECT user_id, expires_at FROM sessions WHERE token = $1', [hashToken(token)]);
    if (!row) return null;
    if (new Date(String(row.expires_at)).getTime() < Date.now()) {
      await UserService.logout(token);
      return null;
    }
    return String(row.user_id);
  }

  static async getUserProfile(userId: string): Promise<UserProfileData | null> {
    const row = await one<UserRow>('SELECT * FROM users WHERE id = $1', [userId]);
    return row ? toProfile(row) : null;
  }

  static async updateUserProfile(userId: string, data: ProfileUpdate): Promise<UserProfileData | null> {
    const entries = Object.entries(data).filter(
      ([key, value]) => value !== undefined && key in PROFILE_COLUMNS
    ) as [keyof ProfileUpdate, unknown][];

    if (entries.length > 0) {
      const now = new Date().toISOString();
      // Column names come from the PROFILE_COLUMNS whitelist, never from the request.
      const sets = entries.map(([key], i) => `${PROFILE_COLUMNS[key]} = $${i + 1}`).join(', ');
      const n = entries.length;
      const toColumnValue = (value: unknown) =>
        Array.isArray(value) ? JSON.stringify(value) : typeof value === 'boolean' ? Number(value) : (value as string | number);
      // Only financial answers count as a review; switching language or renaming doesn't restart the yearly reminder.
      const reviewed = entries.some(([key]) => key !== 'language' && key !== 'name');
      const stamp = reviewed ? `, profile_reviewed_at = $${n + 1}` : '';
      await run(`UPDATE users SET ${sets}, updated_at = $${n + 1}${stamp} WHERE id = $${n + 2}`, [
        ...entries.map(([, value]) => toColumnValue(value)), now, userId,
      ]);
      await audit(userId, 'PROFILE_UPDATE', entries.map(([key]) => key).join(','));
    }
    const profile = await UserService.getUserProfile(userId);
    // With a dependents list, the stored count is derived from it so the two never disagree.
    if (profile && profile.dependentDetails.length > 0) {
      const count = householdOf(profile).count;
      if (count !== profile.dependents) {
        await run('UPDATE users SET dependents = $1 WHERE id = $2', [count, userId]);
        profile.dependents = count;
      }
    }
    return profile;
  }

  /** Records acceptance of the disclaimer once; later calls keep the first time. */
  static async acknowledgeDisclaimer(userId: string): Promise<UserProfileData | null> {
    const changed = await run('UPDATE users SET disclaimer_acknowledged_at = $1 WHERE id = $2 AND disclaimer_acknowledged_at IS NULL', [
      new Date().toISOString(), userId,
    ]);
    if (changed) await audit(userId, 'DISCLAIMER_ACKNOWLEDGED');
    return UserService.getUserProfile(userId);
  }

  /** The subset of the profile the strategy engine uses; deliberately excludes name, email and free-text city. */
  static toStrategyProfile(u: UserProfileData): StrategyProfile {
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
      spouseAge: u.spouseAge,
      dependentDetails: u.dependentDetails,
      parentsHealthCover: u.parentsHealthCover,
      loanEmi: u.loanEmi,
      homeLoanYearsLeft: u.homeLoanYearsLeft,
      existingCiCover: u.existingCiCover,
      existingPaCover: u.existingPaCover,
      employerBenefits: u.employerBenefits,
      lifestyleRisks: u.lifestyleRisks,
      healthConditions: u.healthConditions,
      heightCm: u.heightCm,
      weightKg: u.weightKg,
    };
  }

  static async getStrategyProfile(userId: string): Promise<StrategyProfile | null> {
    const u = await UserService.getUserProfile(userId);
    return u && UserService.toStrategyProfile(u);
  }

  static async listPlans(userId: string): Promise<SavedPlanData[]> {
    return (await query<UserRow>('SELECT * FROM saved_plans WHERE user_id = $1 ORDER BY last_modified DESC, seq DESC', [userId])).map(toPlan);
  }

  static async createPlan(userId: string, plan: Omit<SavedPlanData, 'id' | 'lastModified' | 'snapshot'>, snapshot: PlanSnapshot | null = null): Promise<SavedPlanData> {
    const id = `SIQ-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const lastModified = new Date().toISOString().split('T')[0];
    await run(
      `INSERT INTO saved_plans (id, user_id, name, category, coverage_amount, monthly_premium, status, description, last_modified, snapshot)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [id, userId, plan.name, plan.category, plan.coverageAmount, plan.monthlyPremium, plan.status, plan.description, lastModified, snapshot && JSON.stringify(snapshot)]
    );
    await audit(userId, 'PLAN_CREATE', id);
    return { ...plan, id, lastModified, snapshot };
  }

  /** Deletes only if the plan belongs to the user. */
  static async deletePlan(userId: string, planId: string): Promise<boolean> {
    const changed = await run('DELETE FROM saved_plans WHERE id = $1 AND user_id = $2', [planId, userId]);
    if (changed > 0) await audit(userId, 'PLAN_DELETE', planId);
    return changed > 0;
  }
}
