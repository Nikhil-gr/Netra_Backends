import { MODES } from "../utils/buildPrompt.js";
import { ApiError } from "../utils/apiResponse.js";

export function validateAnalysisFields(body = {}) {
  const { mode, query = "", language = "en" } = body;
  if (typeof mode !== "string" || !MODES.includes(mode)) {
    throw new ApiError(
      400,
      "INVALID_MODE",
      "mode must be describe, read, find, or assist.",
    );
  }
  if (typeof query !== "string" || query.length > 200) {
    throw new ApiError(
      400,
      "INVALID_QUERY",
      "query must be text of at most 200 characters.",
    );
  }
  if (mode === "find" && !query.trim()) {
    throw new ApiError(
      400,
      "QUERY_REQUIRED",
      "query is required in find mode.",
    );
  }
  if (typeof language !== "string" || !["en", "ne"].includes(language)) {
    throw new ApiError(400, "INVALID_LANGUAGE", "language must be en or ne.");
  }
  return { mode, query: query.trim(), language };
}

export default function validateAnalyze(req, res, next) {
  if (!req.file?.buffer?.length) {
    throw new ApiError(
      400,
      "IMAGE_REQUIRED",
      "Upload one image using the image field.",
    );
  }
  const fields = validateAnalysisFields(req.body);
  const saveHistory = req.body.saveHistory ?? "true";
  if (!["true", "false"].includes(saveHistory)) {
    throw new ApiError(
      400,
      "INVALID_SAVE_HISTORY",
      "saveHistory must be true or false.",
    );
  }
  req.analysis = { ...fields, saveHistory: saveHistory === "true" };
  next();
}
