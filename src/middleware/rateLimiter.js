import { rateLimit } from 'express-rate-limit';
import { errorResponse } from '../utils/apiResponse.js';

export const analyzeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (req, res) => errorResponse(res, 429, 'RATE_LIMITED', 'Too many analysis requests. Try again in a minute.'),
});

export const historyLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (req, res) => errorResponse(res, 429, 'RATE_LIMITED', 'Too many history requests. Try again in a minute.'),
});
