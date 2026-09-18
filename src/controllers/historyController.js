import History from '../models/History.js';
import { isDatabaseConnected } from '../config/db.js';
import { validateAnalysisFields } from '../middleware/validateAnalyze.js';
import { validateResult } from '../services/geminiService.js';
import { MODES } from '../utils/buildPrompt.js';
import { ApiError, successResponse } from '../utils/apiResponse.js';

function requireDatabase() {
  if (!isDatabaseConnected()) {
    throw new ApiError(503, 'HISTORY_UNAVAILABLE', 'History is unavailable. Connect MongoDB and try again.');
  }
}

export async function getHistory(req, res) {
  const { limit = '20', page = '1', mode } = req.query;
  if (typeof limit !== 'string' || !/^\d+$/.test(limit) || Number(limit) < 1 || Number(limit) > 100 ||
      typeof page !== 'string' || !/^\d+$/.test(page) || Number(page) < 1 || Number(page) > 10000) {
    throw new ApiError(400, 'INVALID_PAGINATION', 'limit must be 1–100 and page must be 1–10000.');
  }
  if (mode !== undefined && (typeof mode !== 'string' || !MODES.includes(mode))) {
    throw new ApiError(400, 'INVALID_MODE', 'mode must be describe, read, find, or assist.');
  }
  requireDatabase();
  try {
    const items = await History.find(mode ? { mode } : {})
      .sort({ createdAt: -1, _id: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit)).maxTimeMS(5000).lean();
    return successResponse(res, { items, page: Number(page), limit: Number(limit) });
  } catch {
    throw new ApiError(503, 'HISTORY_UNAVAILABLE', 'History could not be loaded. Please try again.');
  }
}

export async function createHistory(req, res) {
  if (!req.is('application/json')) {
    throw new ApiError(415, 'JSON_REQUIRED', 'Send application/json to save a history result.');
  }
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    throw new ApiError(400, 'INVALID_BODY', 'Send a JSON object with mode, query, language, and result.');
  }
  const fields = validateAnalysisFields(req.body);
  let result;
  try {
    result = validateResult(fields.mode, req.body.result);
  } catch {
    throw new ApiError(400, 'INVALID_RESULT', 'result must match the selected mode response schema.');
  }
  if (fields.mode === 'find') result.object = fields.query;
  requireDatabase();
  try {
    const record = await History.create({ ...fields, result });
    return successResponse(res, record, 201);
  } catch {
    throw new ApiError(503, 'HISTORY_UNAVAILABLE', 'History could not be saved. Please try again.');
  }
}
