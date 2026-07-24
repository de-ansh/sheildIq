import { app } from './app.js';
import dotenv from 'dotenv';
dotenv.config();
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
