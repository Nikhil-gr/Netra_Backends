import { ApiError } from "../utils/apiResponse.js";

// Simple in-memory cache to store previous lookups (reduces external API hits)
const geocodeCache = new Map();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Geocode a location name using OpenStreetMap Nominatim.
 * Returns the first matching place with latitude and longitude.
 *
 * @param {string} locationName
 * @returns {Promise<{ name: string, latitude: number, longitude: number }>}
 */
export async function geocodeLocation(locationName) {
  if (typeof locationName !== "string" || !locationName.trim()) {
    throw new ApiError(
      400,
      "INVALID_LOCATION",
      "A valid location name is required.",
    );
  }

  const normalizedQuery = locationName.trim().toLowerCase();

  // 1. Check in-memory cache
  if (geocodeCache.has(normalizedQuery)) {
    const cachedEntry = geocodeCache.get(normalizedQuery);
    if (Date.now() - cachedEntry.timestamp < CACHE_TTL_MS) {
      return cachedEntry.data;
    }
    geocodeCache.delete(normalizedQuery);
  }

  const query = encodeURIComponent(locationName.trim());
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${query}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Accept-Language": "en",
        // Required by Nominatim: Set your app name and contact email/URL here
        "User-Agent": "MyGeoApp/1.0 (contact@myapp.com)",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      console.error(
        `Nominatim request failed: HTTP ${response.status} ${response.statusText}`,
      );

      if (response.status === 429) {
        throw new ApiError(
          429,
          "GEOCODING_RATE_LIMIT",
          "Geocoding rate limit exceeded (1 req/sec max). Please try again in a moment.",
        );
      }

      throw new ApiError(
        502,
        "GEOCODING_SERVICE_ERROR",
        "Location lookup service is currently unavailable.",
      );
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      throw new ApiError(
        404,
        "LOCATION_NOT_FOUND",
        "No matching location was found for the provided place name.",
      );
    }

    const match = data[0];
    const latitude = Number(match.lat);
    const longitude = Number(match.lon);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new ApiError(
        502,
        "GEOCODING_INVALID_RESPONSE",
        "The location service returned invalid coordinates.",
      );
    }

    const result = {
      name: match.display_name || locationName.trim(),
      latitude,
      longitude,
    };

    // 2. Save result to cache
    geocodeCache.set(normalizedQuery, {
      data: result,
      timestamp: Date.now(),
    });

    return result;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error?.name === "AbortError") {
      throw new ApiError(
        504,
        "GEOCODING_TIMEOUT",
        "Location lookup timed out. Please try again.",
      );
    }

    console.error("Geocoding service error:", error);
    throw new ApiError(
      502,
      "GEOCODING_SERVICE_ERROR",
      "Unable to geocode the provided location.",
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
