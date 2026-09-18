import { ApiError } from "../utils/apiResponse.js";
import { normalizeManeuver, buildInstruction } from "../utils/navigation.js";

const ORS_DIRECTIONS_URL =
  "https://api.openrouteservice.org/v2/directions/foot-walking";
const ORS_GEOCODE_URL = "https://api.openrouteservice.org/geocode/search";
const REQUEST_TIMEOUT_MS = 10000;

function requireApiKey() {
  const apiKey = process.env.OPENROUTESERVICE_API_KEY?.trim();
  if (!apiKey) {
    throw new ApiError(
      503,
      "NAVIGATION_UNAVAILABLE",
      "Navigation is not configured. Set OPENROUTESERVICE_API_KEY on the backend.",
    );
  }
  return apiKey;
}

// A single attempt with a hard timeout - no automatic retries, so a flaky
// provider response never silently multiplies API quota usage.
async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json, application/geo+json" },
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new ApiError(
        504,
        "NAVIGATION_TIMEOUT",
        "The navigation service timed out. Please try again.",
      );
    }
    throw new ApiError(
      502,
      "NAVIGATION_UNAVAILABLE",
      "Unable to reach the navigation service.",
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function getWalkingRoute(start, destination) {
  const apiKey = requireApiKey();
  const url =
    `${ORS_DIRECTIONS_URL}?api_key=${apiKey}&` +
    `start=${start.longitude},${start.latitude}&` +
    `end=${destination.longitude},${destination.latitude}`;

  const response = await fetchWithTimeout(url);

  if (response.status === 429) {
    throw new ApiError(
      429,
      "NAVIGATION_RATE_LIMITED",
      "Navigation is rate limited. Please try again shortly.",
    );
  }
  if (response.status === 401 || response.status === 403) {
    console.error(
      `OpenRouteService authentication failed: HTTP ${response.status}`,
    );
    throw new ApiError(
      503,
      "NAVIGATION_UNAVAILABLE",
      "Navigation is unavailable. Check the backend routing configuration.",
    );
  }
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const orsCode = errorBody?.error?.code;
    if (response.status === 404 || orsCode === 2003 || orsCode === 2010) {
      throw new ApiError(
        404,
        "ROUTE_NOT_FOUND",
        "No walking route was found between these two points.",
      );
    }
    console.error(`OpenRouteService directions error: HTTP ${response.status}`);
    throw new ApiError(
      502,
      "NAVIGATION_UNAVAILABLE",
      "The navigation service returned an error. Please try again.",
    );
  }

  const data = await response.json();
  const feature = data.features?.[0];
  if (!feature) {
    throw new ApiError(
      404,
      "ROUTE_NOT_FOUND",
      "No walking route was found between these two points.",
    );
  }

  const coordinates = feature.geometry?.coordinates ?? [];
  const segment = feature.properties?.segments?.[0] ?? {};
  const rawSteps = Array.isArray(segment.steps) ? segment.steps : [];

  const geometry = coordinates
    .filter((point) => Array.isArray(point) && point.length >= 2)
    .map(([longitude, latitude]) => ({ latitude, longitude }));

  const steps = rawSteps.map((step, index) => {
    const maneuver = normalizeManeuver(step.type);
    const wayPointIndex = Array.isArray(step.way_points)
      ? step.way_points[0]
      : undefined;
    const point = coordinates[wayPointIndex] ?? coordinates[coordinates.length - 1] ?? [];
    return {
      id: `step-${index}`,
      instruction: buildInstruction(maneuver, step.name),
      maneuver,
      distanceMeters: Math.round(step.distance ?? 0),
      durationSeconds: Math.round(step.duration ?? 0),
      latitude: point[1] ?? null,
      longitude: point[0] ?? null,
    };
  });

  return {
    provider: "openrouteservice",
    distanceMeters: Math.round(segment.distance ?? 0),
    durationSeconds: Math.round(segment.duration ?? 0),
    geometry,
    steps,
  };
}

export async function searchDestinations(query) {
  const apiKey = requireApiKey();
  const url =
    `${ORS_GEOCODE_URL}?api_key=${apiKey}&` +
    `text=${encodeURIComponent(query)}&size=5`;

  const response = await fetchWithTimeout(url);

  if (response.status === 429) {
    throw new ApiError(
      429,
      "NAVIGATION_RATE_LIMITED",
      "Search is rate limited. Please try again shortly.",
    );
  }
  if (response.status === 401 || response.status === 403) {
    console.error(
      `OpenRouteService authentication failed: HTTP ${response.status}`,
    );
    throw new ApiError(
      503,
      "NAVIGATION_UNAVAILABLE",
      "Search is unavailable. Check the backend routing configuration.",
    );
  }
  if (!response.ok) {
    console.error(`OpenRouteService geocoding error: HTTP ${response.status}`);
    throw new ApiError(
      502,
      "NAVIGATION_UNAVAILABLE",
      "The search service returned an error. Please try again.",
    );
  }

  const data = await response.json();
  const features = Array.isArray(data.features) ? data.features : [];

  return features
    .slice(0, 5)
    .map((feature, index) => {
      const [longitude, latitude] = feature.geometry?.coordinates ?? [];
      const props = feature.properties ?? {};
      return {
        id: props.id !== undefined ? String(props.id) : `result-${index}`,
        name: props.name ?? query,
        label: props.label ?? props.name ?? query,
        latitude,
        longitude,
      };
    })
    .filter(
      (item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude),
    );
}
