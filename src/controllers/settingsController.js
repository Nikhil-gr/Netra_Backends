import Settings from "../models/Settings.js";
import { requireDatabase, requireObjectId } from "../utils/crudGuards.js";
import { ApiError, successResponse } from "../utils/apiResponse.js";

function normalizeSettings(settings) {
  const value = settings.toObject ? settings.toObject() : { ...settings };
  const autoSpeak = value.autoSpeak ?? value.voiceEnabled ?? true;
  return { ...value, autoSpeak, voiceEnabled: autoSpeak };
}

function settingsUpdates(body = {}) {
  const { language, speechRate, autoSpeak, voiceEnabled, vibrationEnabled } =
    body;
  const updates = {};
  if (language !== undefined) {
    if (typeof language !== "string" || !["en", "ne"].includes(language))
      throw new ApiError(400, "INVALID_LANGUAGE", "language must be en or ne.");
    updates.language = language;
  }
  if (speechRate !== undefined) {
    if (!Number.isFinite(speechRate) || speechRate < 0.5 || speechRate > 2)
      throw new ApiError(
        400,
        "INVALID_SPEECH_RATE",
        "speechRate must be between 0.5 and 2.",
      );
    updates.speechRate = speechRate;
  }
  if (autoSpeak !== undefined && typeof autoSpeak !== "boolean")
    throw new ApiError(
      400,
      "INVALID_AUTO_SPEAK",
      "autoSpeak must be true or false.",
    );
  if (voiceEnabled !== undefined && typeof voiceEnabled !== "boolean")
    throw new ApiError(
      400,
      "INVALID_AUTO_SPEAK",
      "voiceEnabled must be true or false.",
    );
  // Canonical autoSpeak wins if both legacy and canonical fields are supplied.
  const spoken = autoSpeak ?? voiceEnabled;
  if (spoken !== undefined) {
    updates.autoSpeak = spoken;
    updates.voiceEnabled = spoken;
  }
  if (vibrationEnabled !== undefined) {
    if (typeof vibrationEnabled !== "boolean")
      throw new ApiError(
        400,
        "INVALID_VIBRATION",
        "vibrationEnabled must be true or false.",
      );
    updates.vibrationEnabled = vibrationEnabled;
  }
  return updates;
}

export async function createSettings(req, res) {
  requireDatabase();
  const { userId } = req.body ?? {};
  if (userId !== undefined && String(userId) !== req.user.id)
    throw new ApiError(
      403,
      "SETTINGS_ACCESS_DENIED",
      "You can only save your own settings.",
    );
  const updates = settingsUpdates(req.body);
  try {
    const settings = await Settings.create({ userId: req.user.id, ...updates });
    return successResponse(res, normalizeSettings(settings), 201);
  } catch (error) {
    if (error?.code === 11000)
      throw new ApiError(
        409,
        "SETTINGS_ALREADY_EXIST",
        "Settings already exist for this user.",
      );
    throw error;
  }
}

export async function getSettings(req, res) {
  requireDatabase();
  const filter = { userId: req.user.id };
  const settings = await Settings.find(filter)
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  return successResponse(res, settings.map(normalizeSettings));
}

export async function getSettingsById(req, res) {
  requireDatabase();
  requireObjectId(req.params.id);
  const settings = await Settings.findById(req.params.id).lean();
  if (!settings)
    throw new ApiError(404, "SETTINGS_NOT_FOUND", "Settings not found.");
  if (String(settings.userId) !== req.user.id)
    throw new ApiError(
      403,
      "SETTINGS_ACCESS_DENIED",
      "You can only view your own settings.",
    );
  return successResponse(res, normalizeSettings(settings));
}

export async function updateSettings(req, res) {
  requireDatabase();
  requireObjectId(req.params.id);
  const updates = settingsUpdates(req.body);
  const existing = await Settings.findById(req.params.id);
  if (!existing)
    throw new ApiError(404, "SETTINGS_NOT_FOUND", "Settings not found.");
  if (String(existing.userId) !== req.user.id)
    throw new ApiError(
      403,
      "SETTINGS_ACCESS_DENIED",
      "You can only update your own settings.",
    );
  const settings = await Settings.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });
  if (!settings)
    throw new ApiError(404, "SETTINGS_NOT_FOUND", "Settings not found.");
  return successResponse(res, normalizeSettings(settings));
}

export async function getSettingsForUser(req, res) {
  requireDatabase();
  requireObjectId(req.params.userId);
  if (req.params.userId !== req.user.id)
    throw new ApiError(
      403,
      "SETTINGS_ACCESS_DENIED",
      "You can only view your own settings.",
    );
  const settings = await Settings.findOne({ userId: req.params.userId }).lean();
  if (!settings)
    throw new ApiError(404, "SETTINGS_NOT_FOUND", "Settings not found.");
  return successResponse(res, normalizeSettings(settings));
}

export async function upsertSettingsForUser(req, res) {
  requireDatabase();
  requireObjectId(req.params.userId);
  if (req.params.userId !== req.user.id)
    throw new ApiError(
      403,
      "SETTINGS_ACCESS_DENIED",
      "You can only update your own settings.",
    );
  const updates = settingsUpdates(req.body);
  const settings = await Settings.findOneAndUpdate(
    { userId: req.params.userId },
    { $set: updates, $setOnInsert: { userId: req.params.userId } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );
  return successResponse(res, normalizeSettings(settings));
}

export async function deleteSettings(req, res) {
  requireDatabase();
  requireObjectId(req.params.id);
  const settings = await Settings.findOneAndDelete({
    _id: req.params.id,
    userId: req.user.id,
  });
  if (!settings)
    throw new ApiError(404, "SETTINGS_NOT_FOUND", "Settings not found.");
  return successResponse(res, { deleted: true });
}
