import { rateLimit } from "express-rate-limit";
import { errorResponse } from "../utils/apiResponse.js";

export const analyzeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (req, res) =>
    errorResponse(
      res,
      429,
      "RATE_LIMITED",
      "Too many analysis requests. Try again in a minute.",
    ),
});

export const historyLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (req, res) =>
    errorResponse(
      res,
      429,
      "RATE_LIMITED",
      "Too many history requests. Try again in a minute.",
    ),
});

export const guideLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (req, res) =>
    errorResponse(
      res,
      429,
      "RATE_LIMITED",
      "Too many route requests. Try again in a minute.",
    ),
});

export const navigationLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (req, res) =>
    errorResponse(
      res,
      429,
      "NAVIGATION_RATE_LIMITED",
      "Too many navigation requests. Try again in a minute.",
    ),
});

export const crudLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (req, res) => errorResponse(res, 429, 'RATE_LIMITED', 'Too many requests. Try again in a minute.'),
});

export const sosLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (req, res) => errorResponse(res, 429, 'SOS_RATE_LIMITED', 'Too many SOS triggers. Try again in a minute.'),
});

export const parentalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (req, res) => errorResponse(res, 429, 'RATE_LIMITED', 'Too many parental requests. Try again in a minute.'),
});

export const trackingLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (req, res) => errorResponse(res, 429, 'TRACKING_RATE_LIMITED', 'Too many location updates. Try again in a minute.'),
});
