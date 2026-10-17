import { Router } from 'express';
import { authRouter } from './auth.routes.js';
import { profileRouter } from './profile.routes.js';
import { strategyRouter } from './strategy.routes.js';
import { aiRouter } from './ai.routes.js';
import { plansRouter } from './plans.routes.js';

/** Everything under /api/v1 except the stateless calculators (actuarial) and the policy catalogue. */
export const apiRouter: Router = Router().use(authRouter, profileRouter, strategyRouter, aiRouter, plansRouter);
