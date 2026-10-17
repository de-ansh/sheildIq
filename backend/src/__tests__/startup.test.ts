import { describe, it, expect } from 'vitest';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Boots the real server the way production does (`.env` in the working directory),
// to catch config that is read before dotenv has loaded.
describe('server startup', () => {
  it('applies CORS_ORIGIN from .env', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'shieldiq-env-'));
    const port = 5600 + Math.floor(Math.random() * 300);
    fs.writeFileSync(
      path.join(dir, '.env'),
      `PORT=${port}\nCORS_ORIGIN=https://app.example.com\nPGLITE_DIR=memory://\n`
    );
    const tsx = path.resolve('node_modules/.bin/tsx');
    // A clean env so the test's own NODE_ENV/CORS_ORIGIN cannot mask what .env provides.
    const server = spawn(tsx, [path.resolve('src/server.ts')], { cwd: dir, env: { PATH: process.env.PATH ?? '' } });
    try {
      let res: Response | null = null;
      for (let i = 0; i < 60 && !res; i++) {
        try {
          res = await fetch(`http://localhost:${port}/api/v1/health`, { headers: { Origin: 'https://app.example.com' } });
        } catch {
          await new Promise(r => setTimeout(r, 250));
        }
      }
      expect(res?.status).toBe(200);
      expect(res?.headers.get('access-control-allow-origin')).toBe('https://app.example.com');
    } finally {
      server.kill();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }, 30_000);
});
