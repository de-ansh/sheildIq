import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { getDatabase } from '../db/database.js';
import { resetAuthRateLimit } from '../routes/user.routes.js';
import { UserService } from '../services/user.service.js';

const sessionCookie = (res: request.Response) => {
  const cookies = res.headers['set-cookie'] as unknown as string[];
  return { Cookie: cookies[0].split(';')[0] };
};

describe('ShieldIQ REST API Endpoints', () => {
  it('GET /api/v1/health returns HTTP 200 UP status', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('UP');
    expect(res.body.service).toContain('ShieldIQ');
  });

  it('POST /api/v1/actuarial/hlv-calculator returns calculation payload', async () => {
    const res = await request(app)
      .post('/api/v1/actuarial/hlv-calculator')
      .send({ income: 120000, years: 25, inflation: 6, existingCover: 200000 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.recommendedCover).toBeGreaterThan(200000);
  });

  it('POST /api/v1/actuarial/risk-simulator runs scenario stress test', async () => {
    const res = await request(app)
      .post('/api/v1/actuarial/risk-simulator')
      .send({ scenario: 'illness', cost: 150000, years: 5, inflation: 4 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.depletionAge).toBeDefined();
  });

  it('GET /api/v1/policies returns policy catalog list', async () => {
    const res = await request(app).get('/api/v1/policies');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBeGreaterThan(0);
  });

  it('POST /api/v1/policies/compare names the highest claim ratio, not the first item', async () => {
    const res = await request(app).post('/api/v1/policies/compare').send({ policyIds: ['HL-FLOATER', 'TL-BASIC'] });
    expect(res.body.data.comparedCount).toBe(2);
    expect(res.body.data.recommendation).toContain('Pure Level Term');
    expect(res.body.data.recommendation).toContain('99.1%');
  });

  it('GET /api/v1/user/profile rejects unauthenticated requests', async () => {
    const res = await request(app).get('/api/v1/user/profile');
    expect(res.status).toBe(401);
  });
});

describe('Auth, profile and saved plans', () => {
  beforeEach(() => resetAuthRateLimit());

  const login = async (email = 'alex.vance@shieldiq.internal', password = 'Password123!') =>
    request(app).post('/api/v1/auth/login').send({ email, password });

  it('logs in the seeded demo user and rejects a wrong password', async () => {
    const ok = await login();
    expect(ok.status).toBe(200);
    expect(ok.body).not.toHaveProperty('token');
    const setCookie = (ok.headers['set-cookie'] as unknown as string[])[0];
    expect(setCookie).toMatch(/HttpOnly/);
    expect(setCookie).toMatch(/SameSite=Strict/);
    const token = sessionCookie(ok).Cookie.split('=')[1];
    expect(getDatabase().prepare('SELECT token FROM sessions WHERE token = ?').get(token)).toBeUndefined();
    expect(ok.body.user.name).toBe('Alex Vance');
    expect(ok.body.user).not.toHaveProperty('password_hash');

    const bad = await login('alex.vance@shieldiq.internal', 'wrong');
    expect(bad.status).toBe(401);
  });

  it('registers, rejects duplicates, updates profile, and logs out', async () => {
    const reg = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'New.User@example.com', password: 'longenough', name: 'New User' });
    expect(reg.status).toBe(201);
    const auth = sessionCookie(reg);

    const dup = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'new.user@example.com', password: 'longenough', name: 'Dup' });
    expect(dup.status).toBe(409);

    const upd = await request(app).put('/api/v1/user/profile').set(auth).send({ age: 41, city: 'Pune' });
    expect(upd.body.user).toMatchObject({ age: 41, city: 'Pune', email: 'new.user@example.com' });

    const onboard = await request(app)
      .post('/api/v1/user/onboarding')
      .set(auth)
      .send({ age: 41, income: 900000, dependents: 1, cityTier: 'Tier 2 (Emerging Metro)', monthlyExpenses: 40000, homeLoan: 123, lifestyleRisks: ['Tobacco/Smoking'], unknownField: 'dropped' });
    expect(onboard.body.user).toMatchObject({
      income: 900000, dependents: 1, homeLoan: 123, cityTier: 'Tier 2 (Emerging Metro)', lifestyleRisks: ['Tobacco/Smoking'], onboardingCompleted: true,
    });
    expect(onboard.body.user).not.toHaveProperty('unknownField');

    const incomplete = await request(app).post('/api/v1/user/onboarding').set(auth).send({ income: 1 });
    expect(incomplete.status).toBe(400);

    expect((await request(app).put('/api/v1/user/profile').set(auth).send({ age: 5 })).status).toBe(400);

    await request(app).post('/api/v1/auth/logout').set(auth);
    expect((await request(app).get('/api/v1/user/profile').set(auth)).status).toBe(401);
  });

  it('scopes saved plans to their owner', async () => {
    const alex = sessionCookie(await login());
    const other = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'other@example.com', password: 'longenough', name: 'Other' });
    const otherAuth = sessionCookie(other);

    const list = await request(app).get('/api/v1/plans').set(alex);
    expect(list.body.data.length).toBe(5);

    const created = await request(app)
      .post('/api/v1/plans')
      .set(alex)
      .send({ name: 'Test Plan', coverageAmount: 100, monthlyPremium: 10 });
    expect(created.status).toBe(201);
    const id = created.body.data.id;

    expect((await request(app).get('/api/v1/plans').set(otherAuth)).body.data).toEqual([]);
    expect((await request(app).delete(`/api/v1/plans/${id}`).set(otherAuth)).status).toBe(404);
    expect((await request(app).delete(`/api/v1/plans/${id}`).set(alex)).status).toBe(200);
  });

  it('rate limits repeated login attempts', async () => {
    for (let i = 0; i < 10; i++) await login('alex.vance@shieldiq.internal', 'wrong');
    const blocked = await login();
    expect(blocked.status).toBe(429);
    expect(blocked.headers['retry-after']).toBeDefined();
  });
});

describe('Password management', () => {
  beforeEach(() => resetAuthRateLimit());

  const register = (email: string, password = 'original-pass') =>
    request(app).post('/api/v1/auth/register').send({ email, password, name: 'Pw User' });
  const login = (email: string, password: string) =>
    request(app).post('/api/v1/auth/login').send({ email, password });

  it('forgot-password responds identically for known and unknown emails', async () => {
    await register('known@example.com');
    const known = await request(app).post('/api/v1/auth/forgot-password').send({ email: 'known@example.com' });
    const unknown = await request(app).post('/api/v1/auth/forgot-password').send({ email: 'nobody@example.com' });
    expect(known.status).toBe(200);
    expect(known.body).toEqual(unknown.body);
  });

  it('resets a password with a one-time token and revokes sessions', async () => {
    const reg = await register('reset@example.com');
    const token = UserService.requestPasswordReset('reset@example.com')!;

    const ok = await request(app).post('/api/v1/auth/reset-password').send({ token, password: 'brand-new-pass' });
    expect(ok.status).toBe(200);
    expect((await request(app).get('/api/v1/user/profile').set(sessionCookie(reg))).status).toBe(401);
    expect((await login('reset@example.com', 'original-pass')).status).toBe(401);
    expect((await login('reset@example.com', 'brand-new-pass')).status).toBe(200);

    const reused = await request(app).post('/api/v1/auth/reset-password').send({ token, password: 'another-pass' });
    expect(reused.status).toBe(400);
  });

  it('changes password only with the current one and keeps the current session', async () => {
    const first = sessionCookie(await register('change@example.com'));
    const second = sessionCookie(await login('change@example.com', 'original-pass'));

    const wrong = await request(app)
      .post('/api/v1/auth/change-password')
      .set(first)
      .send({ currentPassword: 'nope', newPassword: 'changed-pass' });
    expect(wrong.status).toBe(400);

    const ok = await request(app)
      .post('/api/v1/auth/change-password')
      .set(first)
      .send({ currentPassword: 'original-pass', newPassword: 'changed-pass' });
    expect(ok.status).toBe(200);
    expect((await request(app).get('/api/v1/user/profile').set(first)).status).toBe(200);
    expect((await request(app).get('/api/v1/user/profile').set(second)).status).toBe(401);
  });

  it('logout-all revokes every session', async () => {
    const a = sessionCookie(await register('all@example.com'));
    const b = sessionCookie(await login('all@example.com', 'original-pass'));
    await request(app).post('/api/v1/auth/logout-all').set(a);
    expect((await request(app).get('/api/v1/user/profile').set(a)).status).toBe(401);
    expect((await request(app).get('/api/v1/user/profile').set(b)).status).toBe(401);
  });
});

describe('Hardening', () => {
  it('does not reflect untrusted CORS origins', async () => {
    const res = await request(app).get('/api/v1/health').set('Origin', 'https://evil.example');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
    const ok = await request(app).get('/api/v1/health').set('Origin', 'http://localhost:5173');
    expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  it('returns 400 without internals for malformed JSON and sets security headers', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email":');
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).not.toMatch(/JSON|position/i);
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });
});

describe('Strategy and AI', () => {
  const ONBOARDING = {
    age: 32, income: 1800000, dependents: 1, maritalStatus: 'Married', cityTier: 'Tier 1 (Metro)', monthlyExpenses: 60000,
    homeLoan: 3000000, otherLoans: 0, existingLifeCover: 5000000, existingHealthCover: 500000,
    employerBenefits: ['Group Term Life'], lifestyleRisks: [], occupation: 'Analyst',
  };
  const env = { ...process.env };

  beforeEach(() => resetAuthRateLimit());
  afterEach(() => {
    process.env = { ...env };
    vi.unstubAllGlobals();
  });

  const onboardedUser = async (email: string) => {
    const reg = await request(app).post('/api/v1/auth/register').send({ email, password: 'longenough', name: 'Priya Sharma' });
    const auth = sessionCookie(reg);
    await request(app).post('/api/v1/user/onboarding').set(auth).send(ONBOARDING);
    return auth;
  };

  it('new accounts start blank and must onboard before a strategy is built', async () => {
    const reg = await request(app).post('/api/v1/auth/register').send({ email: 'blank@example.com', password: 'longenough', name: 'Blank' });
    expect(reg.body.user).toMatchObject({ income: 0, dependents: 0, occupation: '', onboardingCompleted: false });
    const res = await request(app).get('/api/v1/strategy').set(sessionCookie(reg));
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('ONBOARDING_REQUIRED');
  });

  it('returns a strategy computed from the stored profile', async () => {
    const auth = await onboardedUser('strategy@example.com');
    const res = await request(app).get('/api/v1/strategy').set(auth);
    expect(res.status).toBe(200);
    expect(res.body.data.life.liabilities).toBe(3000000);
    expect(res.body.data.life.existing).toBe(5000000);
    expect(res.body.data.health.existing).toBe(500000);
    expect(res.body.ai).toBeNull();
  });

  it('reports AI as unavailable when no key is configured', async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    const auth = await onboardedUser('noai@example.com');
    expect((await request(app).get('/api/v1/strategy').set(auth)).body.aiProvider).toBeNull();
    expect((await request(app).post('/api/v1/strategy/ai').set(auth)).status).toBe(503);
  });

  it('generates an AI strategy with Gemini, sends no name or email, and caches it', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    const aiPayload = {
      summary: 'Close the life gap first.',
      priorities: [{ title: 'Term cover', action: 'Buy ₹1.5 Cr term cover', rationale: 'Loans and income replacement', urgency: 'high' }],
      watchouts: [],
    };
    // Real REST shape: a thought step followed by a model_output step carrying the text.
    const geminiBody = {
      status: 'completed',
      steps: [{ type: 'thought', signature: 'x' }, { type: 'model_output', content: [{ type: 'text', text: JSON.stringify(aiPayload) }] }],
    };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(geminiBody), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const auth = await onboardedUser('gemini@example.com');
    const res = await request(app).post('/api/v1/strategy/ai').set(auth);
    expect(res.status).toBe(200);
    expect(res.body.ai.provider).toBe('gemini');
    expect(res.body.ai.strategy.priorities[0].title).toBe('Term cover');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('generativelanguage.googleapis.com');
    const body = JSON.parse(init.body);
    expect(body.store).toBe(false);
    expect(body.input).toContain('"homeLoan": 3000000');
    expect(body.input).not.toContain('Priya');
    expect(body.input).not.toContain('gemini@example.com');

    // Second request is served from cache with no provider call
    const again = await request(app).post('/api/v1/strategy/ai').set(auth);
    expect(again.body.ai.strategy.summary).toBe('Close the life gap first.');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((await request(app).get('/api/v1/strategy').set(auth)).body.ai.provider).toBe('gemini');

    // Changing the profile invalidates the cache
    await request(app).put('/api/v1/user/profile').set(auth).send({ existingLifeCover: 9000000 });
    expect((await request(app).get('/api/v1/strategy').set(auth)).body.ai).toBeNull();
  });

  it('falls back to OpenAI when Gemini fails, and rejects malformed output', async () => {
    process.env.GEMINI_API_KEY = 'g';
    process.env.OPENAI_API_KEY = 'o';
    const good = { summary: 'ok', priorities: [{ title: 't', action: 'a', rationale: 'r', urgency: 'low' }], watchouts: ['w'] };
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response('quota exceeded', { status: 429 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(good) } }] }), { status: 200 })));
    const auth = await onboardedUser('fallback@example.com');
    const res = await request(app).post('/api/v1/strategy/ai').set(auth);
    expect(res.status).toBe(200);
    expect(res.body.ai.provider).toBe('openai');

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ output_text: '{"summary": 5}' }), { status: 200 })));
    delete process.env.OPENAI_API_KEY;
    const bad = await request(app).post('/api/v1/strategy/ai').set(auth).send({ refresh: true });
    expect(bad.status).toBe(502);
    expect(JSON.stringify(bad.body)).not.toMatch(/validation|summary/);
  });

  it('plans family health cover via the calculator endpoint', async () => {
    const res = await request(app)
      .post('/api/v1/actuarial/health-plan')
      .send({ adults: 2, children: 1, cityTier: 'Tier 1 (Metro)', employerCover: 300000, existingCover: 500000, risks: [] });
    expect(res.status).toBe(200);
    expect(res.body.data.recommendedCover).toBe(1500000);
    expect(res.body.data.personalCoverNeeded).toBe(1000000);
    expect((await request(app).post('/api/v1/actuarial/health-plan').send({ adults: 0 })).status).toBe(400);
  });
});

describe('AI features', () => {
  const env = { ...process.env };
  beforeEach(() => {
    resetAuthRateLimit();
    process.env.GEMINI_API_KEY = 'test-key';
    delete process.env.OPENAI_API_KEY;
  });
  afterEach(() => {
    process.env = { ...env };
    vi.unstubAllGlobals();
  });

  // Gemini REST shape with the model's JSON as the output text
  const gemini = (payload: unknown) =>
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: 'completed', steps: [{ type: 'model_output', content: [{ type: 'text', text: JSON.stringify(payload) }] }] }), { status: 200 })
    );

  const onboarded = async (email: string) => {
    const reg = await request(app).post('/api/v1/auth/register').send({ email, password: 'longenough', name: 'Rohan Mehta' });
    const auth = sessionCookie(reg);
    await request(app).post('/api/v1/user/onboarding').set(auth).send({
      age: 35, income: 2000000, dependents: 2, maritalStatus: 'Married', cityTier: 'Tier 1 (Metro)', monthlyExpenses: 70000,
      homeLoan: 4000000, existingLifeCover: 10000000, existingHealthCover: 500000, employerBenefits: ['Group Health'],
    });
    return auth;
  };

  it('chat answers from the user profile without sending name or email', async () => {
    const fetchMock = gemini({ answer: 'Buy term cover first.', suggestedQuestions: ['Why?'] });
    vi.stubGlobal('fetch', fetchMock);
    const auth = await onboarded('chat@example.com');

    const res = await request(app).post('/api/v1/ai/chat').set(auth)
      .send({ messages: [{ role: 'user', content: 'Prepay loan or buy term?' }] });
    expect(res.status).toBe(200);
    expect(res.body.reply.answer).toBe('Buy term cover first.');
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.input).toContain('"homeLoan": 4000000');
    expect(body.input).toContain('USER: Prepay loan or buy term?');
    expect(body.input).not.toMatch(/Rohan|chat@example\.com/);
    expect(body.store).toBe(false);

    const bad = await request(app).post('/api/v1/ai/chat').set(auth)
      .send({ messages: [{ role: 'assistant', content: 'hi' }] });
    expect(bad.status).toBe(400);
  });

  it('chat requires onboarding', async () => {
    vi.stubGlobal('fetch', gemini({}));
    const reg = await request(app).post('/api/v1/auth/register').send({ email: 'notyet@example.com', password: 'longenough', name: 'N' });
    const res = await request(app).post('/api/v1/ai/chat').set(sessionCookie(reg)).send({ messages: [{ role: 'user', content: 'hello' }] });
    expect(res.status).toBe(409);
  });

  it('explain caches identical requests', async () => {
    const fetchMock = gemini({ summary: 'Mostly income replacement.', drivers: [{ factor: 'Income', effect: 'Largest share' }], whatIfs: [] });
    vi.stubGlobal('fetch', fetchMock);
    const auth = await onboarded('explain@example.com');
    const payload = { screen: 'life-calculator', inputs: { income: 2000000, years: 25 }, result: { recommendedCover: 40000000 } };

    const first = await request(app).post('/api/v1/ai/explain').set(auth).send(payload);
    const second = await request(app).post('/api/v1/ai/explain').set(auth).send(payload);
    expect(first.body.explanation.summary).toBe('Mostly income replacement.');
    expect(second.body.explanation.summary).toBe('Mostly income replacement.');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    expect((await request(app).post('/api/v1/ai/explain').set(auth).send({ ...payload, screen: 'unknown' })).status).toBe(400);
  });

  it('parse-profile drafts fields and drops unknown benefits', async () => {
    vi.stubGlobal('fetch', gemini({
      age: 32, income: 1800000, maritalStatus: 'Married', dependents: 2, occupation: 'Analyst', cityTier: 'Tier 1 (Metro)',
      homeLoan: 3000000, otherLoans: null, monthlyExpenses: 60000, existingLifeCover: 5000000, existingHealthCover: null,
      employerBenefits: ['Group Health', 'Free Lunch'], lifestyleRisks: ['Tobacco/Smoking'], notes: ['Assumed spouse is dependent.'],
    }));
    const reg = await request(app).post('/api/v1/auth/register').send({ email: 'describe@example.com', password: 'longenough', name: 'D' });
    const auth = sessionCookie(reg);

    const res = await request(app).post('/api/v1/ai/parse-profile').set(auth)
      .send({ description: "I'm 32, married, one kid, earn 18 lakh, 30L home loan." });
    expect(res.status).toBe(200);
    expect(res.body.draft).toMatchObject({ age: 32, income: 1800000, otherLoans: null, employerBenefits: ['Group Health'] });
    // Nothing is saved until onboarding is submitted
    expect((await request(app).get('/api/v1/user/profile').set(auth)).body.user.income).toBe(0);
    expect((await request(app).post('/api/v1/ai/parse-profile').set(auth).send({ description: 'too short' })).status).toBe(400);
  });

  it('policy analysis rejects non-PDFs and computes gap fit in code', async () => {
    const fetchMock = gemini({
      isInsurancePolicy: true, policyName: 'SecureCare', insurer: 'Example General', policyType: 'health', sumAssured: 500000,
      annualPremium: 21450, policyTermYears: 1, plainSummary: 'Family floater.', keyBenefits: [], exclusions: [], waitingPeriods: ['PED 24 months'],
      subLimits: ['Room rent 1% of SI'], redFlags: [],
    });
    vi.stubGlobal('fetch', fetchMock);
    const auth = await onboarded('policy@example.com');
    const pdf = Buffer.from('%PDF-1.4\nfake but well-formed header\n%%EOF').toString('base64');

    const notPdf = await request(app).post('/api/v1/ai/policy-analysis').set(auth)
      .send({ filename: 'policy.pdf', data: Buffer.from('MZ executable').toString('base64') });
    expect(notPdf.status).toBe(400);
    expect((await request(app).post('/api/v1/ai/policy-analysis').set(auth).send({ filename: 'policy.exe', data: pdf })).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();

    const res = await request(app).post('/api/v1/ai/policy-analysis').set(auth).send({ filename: 'policy.pdf', data: pdf });
    expect(res.status).toBe(200);
    expect(res.body.analysis.sumAssured).toBe(500000);
    const strategy = (await request(app).get('/api/v1/strategy').set(auth)).body.data;
    expect(res.body.fit).toMatchObject({ category: 'health', gap: strategy.health.gap, remainingGap: Math.max(0, strategy.health.gap - 500000) });
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent.input[1]).toMatchObject({ type: 'document', mime_type: 'application/pdf' });
  });

  it('flags non-portable employer health cover in the strategy', async () => {
    const auth = await onboarded('grouphealth@example.com');
    const titles = (await request(app).get('/api/v1/strategy').set(auth)).body.data.insights.map((i: { title: string }) => i.title);
    expect(titles).toContain('Employer health cover is not portable');
  });
});

describe('Plan options endpoint', () => {
  beforeEach(() => resetAuthRateLimit());

  it('requires onboarding, then returns personal quotes', async () => {
    const reg = await request(app).post('/api/v1/auth/register').send({ email: 'plans@example.com', password: 'longenough', name: 'P' });
    const auth = sessionCookie(reg);
    expect((await request(app).get('/api/v1/plan-options').set(auth)).status).toBe(409);
    await request(app).post('/api/v1/user/onboarding').set(auth).send({ age: 30, income: 1500000, dependents: 1, cityTier: 'Tier 2 (Emerging Metro)', monthlyExpenses: 50000 });
    const res = await request(app).get('/api/v1/plan-options').set(auth);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(4);
    expect(res.body.disclaimer).toMatch(/illustrative/);
    expect((await request(app).get('/api/v1/policies')).body.count).toBe(16);
  });
});
