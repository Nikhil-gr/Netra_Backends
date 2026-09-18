import Settings from '../models/Settings.js';
import { requireDatabase, requireObjectId } from '../utils/crudGuards.js';
import { ApiError, successResponse } from '../utils/apiResponse.js';

export async function createSettings(req, res) {
  requireDatabase();
  const { userId, language, voiceEnabled, vibrationEnabled } = req.body ?? {};
  requireObjectId(userId);
  if (language !== undefined && typeof language !== 'string') {
    throw new ApiError(400, 'INVALID_LANGUAGE', 'language must be a string.');
  }
  const settings = await Settings.create({ userId, language, voiceEnabled, vibrationEnabled });
  return successResponse(res, settings, 201);
}

export async function getSettings(req, res) {
  requireDatabase();
  const filter = {};
  if (req.query.userId) { requireObjectId(req.query.userId); filter.userId = req.query.userId; }
  const settings = await Settings.find(filter).sort({ createdAt: -1 }).limit(100).lean();
  return successResponse(res, settings);
}

export async function getSettingsById(req, res) {
  requireDatabase();
  requireObjectId(req.params.id);
  const settings = await Settings.findById(req.params.id).lean();
  if (!settings) throw new ApiError(404, 'SETTINGS_NOT_FOUND', 'Settings not found.');
  return successResponse(res, settings);
}

export async function updateSettings(req, res) {
  requireDatabase();
  requireObjectId(req.params.id);
  const { language, voiceEnabled, vibrationEnabled } = req.body ?? {};
  const updates = {};
  if (language !== undefined) updates.language = language;
  if (voiceEnabled !== undefined) updates.voiceEnabled = voiceEnabled;
  if (vibrationEnabled !== undefined) updates.vibrationEnabled = vibrationEnabled;
  const settings = await Settings.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  if (!settings) throw new ApiError(404, 'SETTINGS_NOT_FOUND', 'Settings not found.');
  return successResponse(res, settings);
}

export async function deleteSettings(req, res) {
  requireDatabase();
  requireObjectId(req.params.id);
  const settings = await Settings.findByIdAndDelete(req.params.id);
  if (!settings) throw new ApiError(404, 'SETTINGS_NOT_FOUND', 'Settings not found.');
  return successResponse(res, { deleted: true });
}
