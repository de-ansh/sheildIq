// Must stay the first import: app.ts reads CORS_ORIGIN and TRUST_PROXY when it loads.
import 'dotenv/config';
import { app } from './app.js';

const PORT = process.env.PORT || 5001;

const server = app.listen(PORT, () => {
  console.log(`🛡️ ShieldIQ Actuarial Intelligence Backend running at http://localhost:${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
