import { ApiError } from "../utils/apiResponse.js";

function isValidLatitude(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= -90 && value <= 90;
}

function isValidLongitude(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= -180 && value <= 180;
}

function parseCoordinate(value, label) {
  if (!value || typeof value !== "object") {
    throw new ApiError(
      400,
      "INVALID_COORDINATES",
      `${label} must include latitude and longitude.`,
    );
  }
  const { latitude, longitude } = value;
  if (!isValidLatitude(latitude)) {
    throw new ApiError(
      400,
      "INVALID_COORDINATES",
      `${label}.latitude must be a number between -90 and 90.`,
    );
  }
  if (!isValidLongitude(longitude)) {
    throw new ApiError(
      400,
      "INVALID_COORDINATES",
      `${label}.longitude must be a number between -180 and 180.`,
    );
  }
  return { latitude, longitude };
}

export default function validateNavigationRoute(req, res, next) {
  const { start, destination } = req.body ?? {};
  req.navigation = {
    start: parseCoordinate(start, "start"),
    destination: parseCoordinate(destination, "destination"),
  };
  next();
}

export function validateNavigationSearch(req, res, next) {
  const { q } = req.query ?? {};
  if (typeof q !== "string" || !q.trim()) {
    throw new ApiError(400, "INVALID_QUERY", "q must be a non-empty search query.");
  }
  if (q.trim().length > 200) {
    throw new ApiError(400, "INVALID_QUERY", "q must be at most 200 characters.");
  }
  req.navigationQuery = q.trim();
  next();
}
