// Must stay the first import: app.ts reads CORS_ORIGIN and TRUST_PROXY when it loads.
import 'dotenv/config';
import { app } from './app.js';
import { closeDatabase, initDatabase } from './db/database.js';

const PORT = process.env.PORT || 5001;

// Connect and create the schema before taking traffic, so a bad DATABASE_URL fails at startup, not on first login.
try {
  await initDatabase();
} catch (err) {
  console.error('[ShieldIQ] Could not open the database:', err instanceof Error ? err.message : err);
  process.exit(1);
}

const server = app.listen(PORT, () => {
  console.log(`🛡️ ShieldIQ Actuarial Intelligence Backend running at http://localhost:${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(async () => {
    await closeDatabase();
    console.log('HTTP server closed');
  });
});
