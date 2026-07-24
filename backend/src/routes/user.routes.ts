import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { UserService } from '../services/user.service.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
});

// POST /api/v1/auth/login
router.post('/auth/login', (req: Request, res: Response) => {
  const parse = loginSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Invalid login payload', details: parse.error.format() });
    return;
  }
  const user = UserService.authenticate(parse.data.email, parse.data.name);
  res.json({ success: true, user });
});

// GET /api/v1/user/profile
router.get('/user/profile', (_req: Request, res: Response) => {
  const user = UserService.getUserProfile();
  res.json({ success: true, user });
});

// POST /api/v1/user/onboarding
router.post('/user/onboarding', (req: Request, res: Response) => {
  const result = UserService.processOnboarding(req.body);
  res.json(result);
});

export const userRouter = router;
