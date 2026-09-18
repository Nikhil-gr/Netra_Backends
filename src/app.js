import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import analyzeRoutes from './routes/analyzeRoutes.js';
import historyRoutes from './routes/historyRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import errorHandler from './middleware/errorHandler.js';
import { ApiError } from './utils/apiResponse.js';

const app = express();
app.disable('x-powered-by');
const origins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',').map((origin) => origin.trim()).filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || origins.includes(origin)) return callback(null, true);
    callback(new ApiError(403, 'ORIGIN_NOT_ALLOWED', 'This frontend origin is not allowed. Check CORS_ORIGIN.'));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
app.use('/api/v1/health', healthRoutes);
app.use(express.json({ limit: '256kb' }));
app.use('/api/v1/analyze', analyzeRoutes);
app.use('/api/v1/history', historyRoutes);
app.use((req, res, next) => next(new ApiError(404, 'NOT_FOUND', 'API route not found.')));
app.use(errorHandler);

export default app;
