import { ApiError } from "../utils/apiResponse.js";

/**
 * Get a walking route between two coordinates using OpenRouteService.
 * API Key can be obtained at https://openrouteservice.org/
 * @param {number} startLat - Start latitude
 * @param {number} startLng - Start longitude
 * @param {number} destLat - Destination latitude
 * @param {number} destLng - Destination longitude
 * @returns {Promise<{distance: number, duration: number, steps: Array}>}
 */
export async function getWalkingRoute(startLat, startLng, destLat, destLng) {
  const apiKey = process.env.ROUTING_API_KEY;
  if (!apiKey) {
    throw new ApiError(
      500,
      "ROUTING_API_NOT_CONFIGURED",
      "Routing service is not configured. Please contact support.",
    );
  }

  // Validate coordinates
  if (
    typeof startLat !== "number" ||
    typeof startLng !== "number" ||
    typeof destLat !== "number" ||
    typeof destLng !== "number"
  ) {
    throw new ApiError(
      400,
      "INVALID_COORDINATES",
      "Invalid coordinates provided.",
    );
  }

  if (
    Math.abs(startLat) > 90 ||
    Math.abs(startLng) > 180 ||
    Math.abs(destLat) > 90 ||
    Math.abs(destLng) > 180
  ) {
    throw new ApiError(
      400,
      "COORDINATES_OUT_OF_RANGE",
      "Coordinates are out of valid range.",
    );
  }

  // Check if start and destination are the same
  if (
    Math.abs(startLat - destLat) < 0.0001 &&
    Math.abs(startLng - destLng) < 0.0001
  ) {
    throw new ApiError(
      400,
      "SAME_LOCATION",
      "Start and destination are the same location.",
    );
  }

  // Fixed endpoint profile name: foot-walking
  const url =
    "https://api.openrouteservice.org/v2/directions/foot-walking?" +
    `api_key=${apiKey}&` +
    `start=${startLng},${startLat}&` +
    `end=${destLng},${destLat}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept:
          "application/json, application/geo+json, application/gpx+xml, img/png; q=0.2",
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });

    if (response.status === 401 || response.status === 403) {
      console.error(`ORS Authentication Failed [HTTP ${response.status}]`);
      throw new ApiError(
        500,
        "ROUTING_API_AUTH_ERROR",
        "Routing service authentication failed. Check ROUTING_API_KEY in your .env file.",
      );
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`ORS Error Response [HTTP ${response.status}]:`, errorData);

      if (response.status === 404 || errorData?.error?.code === 2003) {
        throw new ApiError(
          400,
          "NO_ROUTE_FOUND",
          "No walking route found between the two locations. They may be too far apart or in unreachable areas.",
        );
      }

      throw new ApiError(
        502,
        "ROUTING_SERVICE_ERROR",
        "Routing service returned an error. Please try again.",
      );
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      throw new ApiError(
        400,
        "NO_ROUTE_FOUND",
        "No walking route found between the two locations.",
      );
    }

    const feature = data.features[0];
    const segment = feature.properties?.segments?.[0] || {};
    const distance = segment.distance || 0;
    const duration = Math.round(segment.duration || 0); // ORS provides duration in seconds

    // Extract steps from segment steps
    const steps = [];
    if (segment.steps && Array.isArray(segment.steps)) {
      const coordinates = feature.geometry?.coordinates || [];

      for (const step of segment.steps) {
        if (step.instruction && Array.isArray(step.way_points)) {
          const wayPointIndex = step.way_points[0];
          const wayPoint = coordinates[wayPointIndex];

          if (wayPoint) {
            steps.push({
              instruction: step.instruction,
              latitude: wayPoint[1],
              longitude: wayPoint[0],
            });
          }
        }
      }
    }

    return {
      distance: Math.round(distance),
      duration,
      steps,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;

    if (error?.name === "AbortError") {
      throw new ApiError(
        504,
        "ROUTING_TIMEOUT",
        "Routing service request timed out. Please try again.",
      );
    }

    console.error("Routing error:", error.message);
    throw new ApiError(
      502,
      "ROUTING_ERROR",
      "Failed to fetch route. Please try again.",
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
