import 'dotenv/config';
import mongoose from 'mongoose';
import app from './app.js';
import { connectDatabase } from './config/db.js';

const port = Number(process.env.PORT || 5000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('PORT must be an integer between 1 and 65535.');
  process.exit(1);
}

const server = app.listen(port, () => {
  console.info(`Netra API listening on http://localhost:${port}/api/v1`);
  if (!process.env.GEMINI_API_KEY?.trim()) {
    console.warn('GEMINI_API_KEY is unset. Health works; analysis requires an API key.');
  }
  void connectDatabase();
});

server.on('error', (error) => {
  console.error(error.code === 'EADDRINUSE' ? 'Port is already in use. Change PORT in .env.' : 'Server failed to start.');
  process.exit(1);
});

let shuttingDown = false;
function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  console.info('Shutting down Netra API.');
  const timeout = setTimeout(() => process.exit(1), 10000);
  timeout.unref();
  server.close(async () => {
    try {
      await mongoose.disconnect();
      clearTimeout(timeout);
      process.exit(0);
    } catch {
      process.exit(1);
    }
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
