import { ApiError } from "../utils/apiResponse.js";

/**
 * Validate guide route request body.
 * Ensures start and destination are provided and are valid strings.
 */
export default function validateGuide(req, res, next) {
  const { start, destination } = req.body;

  if (typeof start !== "string" || !start.trim()) {
    throw new ApiError(
      400,
      "INVALID_START",
      "start must be a non-empty string (e.g., 'Baneshwor').",
    );
  }

  if (typeof destination !== "string" || !destination.trim()) {
    throw new ApiError(
      400,
      "INVALID_DESTINATION",
      "destination must be a non-empty string (e.g., 'Chabahil').",
    );
  }

  if (start.trim().length > 100 || destination.trim().length > 100) {
    throw new ApiError(
      400,
      "LOCATION_NAME_TOO_LONG",
      "Location names must be at most 100 characters.",
    );
  }

  req.guideRequest = {
    start: start.trim(),
    destination: destination.trim(),
  };

  next();
}
