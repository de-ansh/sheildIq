// Must stay the first import: app.ts reads CORS_ORIGIN and TRUST_PROXY when it loads.
import 'dotenv/config';
import { app } from './app.js';
import { closeDatabase, initDatabase } from './db/database.js';
import { log } from './log.js';

const PORT = process.env.PORT || 5001;

// Connect and create the schema before taking traffic, so a bad DATABASE_URL fails at startup, not on first login.
try {
  await initDatabase();
} catch (err) {
  log('error', 'could not open the database', { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
}

const server = app.listen(PORT, () => {
  log('info', 'server started', { port: Number(PORT), database: process.env.DATABASE_URL ? 'postgres' : 'embedded' });
});

process.on('SIGTERM', () => {
  log('info', 'SIGTERM received, closing HTTP server');
  server.close(async () => {
    await closeDatabase();
    log('info', 'HTTP server closed');
  });
});
