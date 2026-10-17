import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { one, query, run } from '../db/database.js';
import { resetAuthRateLimit } from '../routes/user.routes.js';
import { UserService } from '../services/user.service.js';

const sessionCookie = (res: request.Response) => {
  const cookies = res.headers['set-cookie'] as unknown as string[];
  return { Cookie: cookies[0].split(';')[0] };
};


/** A Gemini Interactions server-sent-events stream that emits the given text pieces. */
const geminiStream = (pieces: string[]) =>
  new Response(
    [
      { event_type: 'step.start', step: { type: 'thought' } },
      ...pieces.map(text => ({ event_type: 'step.delta', delta: { type: 'text', text } })),
      { event_type: 'interaction.completed', interaction: { status: 'completed' } },
    ].map(e => `event: ${e.event_type}\ndata: ${JSON.stringify(e)}\n\n`).join('') + 'event: done\ndata: [DONE]\n\n',
    { status: 200, headers: { 'Content-Type': 'text/event-stream' } }
  );
/** Parses an SSE response body into its JSON events. */
const sse = (text: string) => text.split('\n\n').filter(b => b.startsWith('data: ')).map(b => JSON.parse(b.slice(6)));

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

  it('POST /api/v1/policies/compare names the clearest wording, not the first item', async () => {
    const res = await request(app).post('/api/v1/policies/compare').send({ policyIds: ['HL-FLOATER', 'TL-BASIC'] });
    expect(res.body.data.comparedCount).toBe(2);
    expect(res.body.data.recommendation).toContain('Pure Level Term');
    expect(res.body.data.recommendation).toContain('clarity 95/100');
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
    expect(await one('SELECT token FROM sessions WHERE token = $1', [token])).toBeUndefined();
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
    // Accepting the disclaimer is stored once and survives a fresh profile load.
    expect(upd.body.user.disclaimerAcknowledgedAt).toBeNull();
    const ack = (await request(app).post('/api/v1/user/disclaimer').set(auth)).body.user.disclaimerAcknowledgedAt;
    expect(Date.now() - Date.parse(ack)).toBeLessThan(5000);
    expect((await request(app).post('/api/v1/user/disclaimer').set(auth)).body.user.disclaimerAcknowledgedAt).toBe(ack);
    expect((await request(app).get('/api/v1/user/profile').set(auth)).body.user.disclaimerAcknowledgedAt).toBe(ack);
    expect((await request(app).post('/api/v1/user/disclaimer')).status).toBe(401);
    // Saving the profile stamps the review date; changing the password does not.
    const reviewedAt = upd.body.user.profileReviewedAt;
    expect(Date.now() - Date.parse(reviewedAt)).toBeLessThan(5000);
    await request(app).post('/api/v1/auth/change-password').set(auth).send({ currentPassword: 'longenough', newPassword: 'longenough-2' });
    expect((await request(app).get('/api/v1/user/profile').set(auth)).body.user.profileReviewedAt).toBe(reviewedAt);

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
      .send({ name: 'Test Plan', coverageAmount: 100, monthlyPremium: 10, snapshot: { score: 100, lifeGap: 0, healthGap: 0, annualPremium: 0 } });
    expect(created.status).toBe(201);
    const id = created.body.data.id;
    // The snapshot comes from the server's own strategy, not the request body, and is listed back.
    const strategy = (await request(app).get('/api/v1/strategy').set(alex)).body.data;
    expect(created.body.data.snapshot).toEqual({
      score: strategy.score, lifeGap: strategy.life.gap, healthGap: strategy.health.gap, annualPremium: strategy.affordability.estimatedAnnualPremium,
    });
    expect(strategy.score).toBeLessThan(100);
    const listed = (await request(app).get('/api/v1/plans').set(alex)).body.data;
    expect(listed[0]).toMatchObject({ id, snapshot: created.body.data.snapshot });
    expect(listed.at(-1).snapshot).toBeNull(); // seeded plans predate snapshots

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
    const token = (await UserService.requestPasswordReset('reset@example.com'))!;

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
  beforeEach(async () => {
    await resetAuthRateLimit();
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

  it('chat streams the answer, saves the turn, and sends it back as context next time', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(geminiStream(['Buy term ', 'cover first.', '\n---\n- Why term?\n2. How much?']))
      .mockResolvedValueOnce(geminiStream(['Because it is cheap.']));
    vi.stubGlobal('fetch', fetchMock);
    const auth = await onboarded('chat@example.com');

    const res = await request(app).post('/api/v1/ai/chat').set(auth).send({ message: 'Prepay loan or buy term?' });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/event-stream/);
    const events = sse(res.text);
    expect(events.filter(e => 'delta' in e).map(e => e.delta).join('')).toMatch(/^Buy term cover first\./);
    expect(events.at(-1)).toMatchObject({ done: true, provider: 'gemini', reply: { answer: 'Buy term cover first.', suggestedQuestions: ['Why term?', 'How much?'] } });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toMatchObject({ stream: true, store: false, generation_config: { thinking_level: 'minimal' } });
    expect(body.input).toContain('"homeLoan": 4000000');
    expect(body.input).toContain('USER: Prepay loan or buy term?');
    expect(body.input).not.toMatch(/Rohan|chat@example\.com/);
    // Official insurer records ride along so the chat can compare insurers, citing only those figures.
    expect(body.input).toContain('"insurer":"LIC","claimsHandled":869086,"paidByNumberPct":97.59');
    expect(body.input).toContain('"insurer":"Star Health"');
    expect(body.input).toMatch(/IRDAI FY 2024-25/);
    expect(body.input).toMatch(/never attach them to a named insurer/);

    // History is stored server-side, survives a reload (GET), and feeds the next question.
    expect((await request(app).get('/api/v1/ai/chat').set(auth)).body.messages).toMatchObject([
      { role: 'user', content: 'Prepay loan or buy term?' }, { role: 'assistant', content: 'Buy term cover first.' },
    ]);
    await request(app).post('/api/v1/ai/chat').set(auth).send({ message: 'Why?' });
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).input).toContain('SHIELDIQ: Buy term cover first.\n\nUSER: Why?');
    expect((await request(app).get('/api/v1/user/export').set(auth)).body.chatHistory).toHaveLength(4);

    expect((await request(app).delete('/api/v1/ai/chat').set(auth)).status).toBe(200);
    expect((await request(app).get('/api/v1/ai/chat').set(auth)).body.messages).toEqual([]);
    expect((await request(app).post('/api/v1/ai/chat').set(auth).send({ message: '' })).status).toBe(400);
    expect((await request(app).get('/api/v1/ai/chat')).status).toBe(401);
  });

  it('chat falls back before the first word, but reports a mid-answer failure without saving it', async () => {
    process.env.OPENAI_API_KEY = 'o';
    const openai = new Response('data: {"choices":[{"delta":{"content":"From OpenAI."}}]}\n\ndata: [DONE]\n\n', { status: 200 });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response('overloaded', { status: 503 })).mockResolvedValueOnce(openai));
    const auth = await onboarded('chat-fallback@example.com');
    const ok = sse((await request(app).post('/api/v1/ai/chat').set(auth).send({ message: 'hi' })).text);
    expect(ok.at(-1)).toMatchObject({ done: true, provider: 'openai', reply: { answer: 'From OpenAI.' } });

    const broken = new Response(
      'data: {"event_type":"step.delta","delta":{"type":"text","text":"Half an "}}\n\ndata: {"event_type":"error","error":{"message":"boom"}}\n\n',
      { status: 200 }
    );
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(broken));
    const failed = sse((await request(app).post('/api/v1/ai/chat').set(auth).send({ message: 'again' })).text);
    expect(failed[0]).toEqual({ delta: 'Half an ' });
    expect(failed.at(-1)).toEqual({ error: 'The answer was interrupted. Please try again.' });
    expect((await request(app).get('/api/v1/ai/chat').set(auth)).body.messages).toHaveLength(2); // only the first turn
  });

  it('chat requires onboarding', async () => {
    vi.stubGlobal('fetch', gemini({}));
    const reg = await request(app).post('/api/v1/auth/register').send({ email: 'notyet@example.com', password: 'longenough', name: 'N' });
    const res = await request(app).post('/api/v1/ai/chat').set(sessionCookie(reg)).send({ message: 'hello' });
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
      homeLoan: 3000000, otherLoans: null, monthlyExpenses: 60000, existingLifeCover: 5000000, existingHealthCover: null, liquidSavings: null, spouseIncome: null, dependentDetails: [], parentsHealthCover: null, loanEmi: null, homeLoanYearsLeft: null, existingCiCover: null, existingPaCover: null,
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
    expect(res.body.disclaimer).toMatch(/not insurer quotes/);
    // Official IRDAI claim records ride along; no invented per-plan ratios or fictional insurers remain.
    expect(res.body.insurerRecords.source).toMatchObject({ publisher: 'IRDAI', period: 'FY 2024-25' });
    expect(res.body.insurerRecords.life.find((r: { insurer: string }) => r.insurer === 'LIC')).toMatchObject({ paidByNumberPct: 97.59 });
    expect(res.body.insurerRecords.health.length).toBeGreaterThan(0);
    expect(JSON.stringify(res.body.data)).not.toMatch(/claimSettlementRatio|\(sample\)/);
    expect((await request(app).get('/api/v1/policies')).body.count).toBe(16);
  });
});

describe('AI cost controls', () => {
  const env = { ...process.env };
  beforeEach(async () => {
    await resetAuthRateLimit();
    process.env.GEMINI_API_KEY = 'test-key';
    delete process.env.OPENAI_API_KEY;
  });
  afterEach(() => {
    process.env = { ...env };
    vi.unstubAllGlobals();
  });

  const reply = (payload: unknown) =>
    vi.fn().mockImplementation(async () =>
      new Response(JSON.stringify({ status: 'completed', steps: [{ type: 'model_output', content: [{ type: 'text', text: JSON.stringify(payload) }] }] }), { status: 200 })
    );

  let seq = 0;
  const onboarded = async () => {
    const reg = await request(app).post('/api/v1/auth/register').send({ email: `cost${++seq}@example.com`, password: 'longenough', name: 'C' });
    const auth = sessionCookie(reg);
    await request(app).post('/api/v1/user/onboarding').set(auth).send({ age: 30, income: 1500000, dependents: 1, cityTier: 'Tier 1 (Metro)', monthlyExpenses: 50000 });
    await resetAuthRateLimit(); // registration attempts share the limiter table; start each check clean
    return auth;
  };
  const chat = (auth: Record<string, string>) => request(app).post('/api/v1/ai/chat').set(auth).send({ message: 'hi' });
  const chatReply = () => vi.fn().mockImplementation(async () => geminiStream(['ok']));

  it('stops all users once the app-wide daily cap is reached', async () => {
    process.env.AI_DAILY_CALL_LIMIT = '2';
    const fetchMock = chatReply();
    vi.stubGlobal('fetch', fetchMock);
    const [a, b, c] = [await onboarded(), await onboarded(), await onboarded()];

    expect((await chat(a)).status).toBe(200);
    expect((await chat(b)).status).toBe(200);
    const blocked = await chat(c);
    expect(blocked.status).toBe(429);
    expect(blocked.body.error).toMatch(/today/);
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('limits one network across accounts and features', async () => {
    process.env.AI_IP_HOURLY_LIMIT = '2';
    vi.stubGlobal('fetch', chatReply());
    const a = await onboarded();
    const b = await onboarded();
    expect((await chat(a)).status).toBe(200);
    expect((await chat(b)).status).toBe(200);
    const blocked = await chat(a);
    expect(blocked.status).toBe(429);
    expect(blocked.body.error).toMatch(/network/);
  });

  it('does not charge cached answers against any limit', async () => {
    process.env.AI_IP_HOURLY_LIMIT = '1';
    const fetchMock = reply({ summary: 's', drivers: [{ factor: 'Income', effect: 'e' }], whatIfs: [] });
    vi.stubGlobal('fetch', fetchMock);
    const auth = await onboarded();
    const payload = { screen: 'life-calculator', inputs: { income: 1 }, result: { cover: 2 } };

    expect((await request(app).post('/api/v1/ai/explain').set(auth).send(payload)).status).toBe(200);
    expect((await request(app).post('/api/v1/ai/explain').set(auth).send(payload)).status).toBe(200); // cache hit
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((await request(app).post('/api/v1/ai/explain').set(auth).send({ ...payload, inputs: { income: 9 } })).status).toBe(429);
  });

  it('rejects PDFs over 4 MB before calling the provider', async () => {
    const fetchMock = reply({});
    vi.stubGlobal('fetch', fetchMock);
    const auth = await onboarded();
    const big = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(4 * 1024 * 1024 + 10, 0x20)]).toString('base64');
    const res = await request(app).post('/api/v1/ai/policy-analysis').set(auth).send({ filename: 'big.pdf', data: big });
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('Upload route checks login before reading the body', () => {
  // Refused before the body is read: a 401, or a reset if the server closes while the client is still sending.
  const refusedUnread = async (body: string) => {
    try {
      const res = await request(app).post('/api/v1/ai/policy-analysis').set('Content-Type', 'application/json').send(body);
      return res.status;
    } catch (err) {
      return (err as NodeJS.ErrnoException).code;
    }
  };

  it('refuses anonymous uploads without parsing them', async () => {
    // A broken body proves the parser never ran: parsing it would answer 400.
    expect([401, 'ECONNRESET']).toContain(await refusedUnread('{"filename": "x.pdf", "data": ' + 'A'.repeat(1024 * 1024)));
    // Buffering an oversized body would answer 413.
    expect([401, 'ECONNRESET']).toContain(await refusedUnread(JSON.stringify({ filename: 'x.pdf', data: 'A'.repeat(7 * 1024 * 1024) })));
  });

  it('still accepts large bodies for signed-in users and small limits elsewhere', async () => {
    await resetAuthRateLimit();
    const reg = await request(app).post('/api/v1/auth/register').send({ email: 'upload@example.com', password: 'longenough', name: 'U' });
    const auth = sessionCookie(reg);
    // 1 MB of valid JSON passes the parser and reaches validation (bad base64 -> 400 from our schema, not 413).
    const res = await request(app).post('/api/v1/ai/policy-analysis').set(auth).send({ filename: 'x.pdf', data: '!'.repeat(1024 * 1024) });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/PDF up to 4 MB/);
    // Other routes keep the 50 KB cap.
    const big = await request(app).put('/api/v1/user/profile').set(auth).send({ occupation: 'x'.repeat(60 * 1024) });
    expect(big.status).toBe(413);
  });
});

describe('Per-account login limit', () => {
  // Clearing only the per-IP counters simulates an attacker rotating through many IP addresses.
  const newIp = () => run("DELETE FROM auth_attempts WHERE key LIKE 'ip:%'");
  const login = (email: string, password: string) => request(app).post('/api/v1/auth/login').send({ email, password });

  beforeEach(() => resetAuthRateLimit());

  it('locks one account after 10 failed passwords, even from different IPs', async () => {
    await request(app).post('/api/v1/auth/register').send({ email: 'target@example.com', password: 'correct-horse', name: 'T' });
    for (let i = 0; i < 10; i++) {
      newIp();
      expect((await login('Target@Example.com', `wrong-${i}`)).status).toBe(401);
    }
    newIp();
    const locked = await login('target@example.com', 'correct-horse');
    expect(locked.status).toBe(429);
    expect(Number(locked.headers['retry-after'])).toBeGreaterThan(0);

    // Other accounts are unaffected.
    newIp();
    expect((await login('alex.vance@shieldiq.internal', 'Password123!')).status).toBe(200);
  });

  it('does not count successful logins', async () => {
    await request(app).post('/api/v1/auth/register').send({ email: 'regular@example.com', password: 'correct-horse', name: 'R' });
    for (let i = 0; i < 12; i++) {
      newIp();
      expect((await login('regular@example.com', 'correct-horse')).status).toBe(200);
    }
  });
});

describe('Account export and deletion', () => {
  beforeEach(() => resetAuthRateLimit());

  const setup = async (email: string) => {
    const reg = await request(app).post('/api/v1/auth/register').send({ email, password: 'my-password-1', name: 'Erase Me' });
    const auth = sessionCookie(reg);
    await request(app).post('/api/v1/user/onboarding').set(auth).send({ age: 40, income: 2000000, dependents: 1, cityTier: 'Tier 1 (Metro)', monthlyExpenses: 70000 });
    await request(app).post('/api/v1/plans').set(auth).send({ name: 'My plan', coverageAmount: 100, monthlyPremium: 1 });
    return { auth, userId: reg.body.user.id as string };
  };

  it('exports everything held about the user, without secrets', async () => {
    const { auth } = await setup('export@example.com');
    const res = await request(app).get('/api/v1/user/export').set(auth);
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toMatch(/attachment; filename="shieldiq-data-/);
    expect(res.body.profile).toMatchObject({ email: 'export@example.com', income: 2000000 });
    expect(res.body.savedPlans).toHaveLength(1);
    expect(JSON.stringify(res.body)).not.toMatch(/password_hash|salt|"token"/);
    expect((await request(app).get('/api/v1/user/export')).status).toBe(401);
  });

  it('deletes the account and all its data only with the right password', async () => {
    const { auth, userId } = await setup('erase@example.com');

    const wrong = await request(app).delete('/api/v1/user/account').set(auth).send({ password: 'not-it' });
    expect(wrong.status).toBe(400);
    expect((await request(app).get('/api/v1/user/profile').set(auth)).status).toBe(200);

    const res = await request(app).delete('/api/v1/user/account').set(auth).send({ password: 'my-password-1' });
    expect(res.status).toBe(200);
    expect((res.headers['set-cookie'] as unknown as string[])[0]).toMatch(/siq_session=;/);

    for (const table of ['users', 'sessions', 'saved_plans', 'password_resets', 'ai_strategies', 'audit_logs', 'chat_messages']) {
      const col = table === 'users' ? 'id' : 'user_id';
      expect(await query(`SELECT 1 FROM ${table} WHERE ${col} = $1`, [userId])).toEqual([]);
    }
    expect(await query("SELECT 1 FROM audit_logs WHERE action = 'ACCOUNT_DELETED' AND user_id IS NULL")).not.toEqual([]);
    expect((await request(app).get('/api/v1/user/profile').set(auth)).status).toBe(401);
    expect((await request(app).post('/api/v1/auth/login').send({ email: 'erase@example.com', password: 'my-password-1' })).status).toBe(401);
    // The email is free to register again.
    expect((await request(app).post('/api/v1/auth/register').send({ email: 'erase@example.com', password: 'another-pass', name: 'New' })).status).toBe(201);
  });
});

describe('AI cache retention', () => {
  const env = { ...process.env };
  beforeEach(async () => {
    await resetAuthRateLimit();
    process.env.GEMINI_API_KEY = 'test-key';
  });
  afterEach(() => {
    process.env = { ...env };
    vi.unstubAllGlobals();
  });

  it('drops cached explanations older than 30 days when new ones are stored', async () => {
    const old = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
    const recent = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const insert = 'INSERT INTO ai_cache (cache_key, provider, payload, created_at) VALUES ($1, $2, $3, $4)';
    await run(insert, ['old-entry', 'gemini', '{}', old]);
    await run(insert, ['recent-entry', 'gemini', '{}', recent]);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      status: 'completed', steps: [{ type: 'model_output', content: [{ type: 'text', text: JSON.stringify({ summary: 's', drivers: [{ factor: 'f', effect: 'e' }], whatIfs: [] }) }] }],
    }), { status: 200 })));
    const reg = await request(app).post('/api/v1/auth/register').send({ email: 'retention@example.com', password: 'longenough', name: 'R' });
    const auth = sessionCookie(reg);
    await request(app).post('/api/v1/user/onboarding').set(auth).send({ age: 30, income: 1500000, dependents: 0, cityTier: 'Tier 2 (Emerging Metro)', monthlyExpenses: 40000 });
    await resetAuthRateLimit();
    expect((await request(app).post('/api/v1/ai/explain').set(auth).send({ screen: 'health-planner', inputs: { a: 1 }, result: { b: 2 } })).status).toBe(200);

    const keys = (await query<{ cache_key: string }>('SELECT cache_key FROM ai_cache')).map(r => r.cache_key);
    expect(keys).not.toContain('old-entry');
    expect(keys).toContain('recent-entry');
  });
});

describe('Dependents list via the API', () => {
  beforeEach(() => resetAuthRateLimit());

  it('saves the list, derives the stored count, and rejects bad entries', async () => {
    const reg = await request(app).post('/api/v1/auth/register').send({ email: 'deps@example.com', password: 'longenough', name: 'D' });
    const auth = sessionCookie(reg);
    const res = await request(app).post('/api/v1/user/onboarding').set(auth).send({
      age: 38, income: 2500000, dependents: 0, maritalStatus: 'Married', spouseIncome: 0, cityTier: 'Tier 1 (Metro)', monthlyExpenses: 90000,
      dependentDetails: [{ relation: 'child', age: 6 }, { relation: 'parent', age: 67 }, { relation: 'sibling', age: 19 }],
      parentsHealthCover: 300000,
    });
    expect(res.status).toBe(200);
    expect(res.body.user.dependentDetails).toHaveLength(3);
    expect(res.body.user.dependents).toBe(4); // 3 listed + non-earning spouse
    const s = (await request(app).get('/api/v1/strategy').set(auth)).body.data;
    expect(s.household).toMatchObject({ children: 1, parents: 1, siblings: 1, dependents: 4 });
    expect(s.parentsHealth.existing).toBe(300000);
    expect(s.life.educationCorpus).toBe(2 * 2500000);

    const bad = await request(app).put('/api/v1/user/profile').set(auth).send({ dependentDetails: [{ relation: 'cousin', age: 10 }] });
    expect(bad.status).toBe(400);
  });
});
