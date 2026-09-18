import { geocodeLocation } from "../services/geocodingService.js";
import { getWalkingRoute } from "../services/routingService.js";
import { formatRouteResponse } from "../utils/routeFormatter.js";
import { successResponse } from "../utils/apiResponse.js";

/**
 * Handle POST /api/guide/route
 * Geocodes start and destination, fetches walking route, and returns formatted response.
 */
export default async function guideController(req, res) {
  const { start, destination } = req.guideRequest;

  // Geocode both locations in parallel
  const [startLocation, destinationLocation] = await Promise.all([
    geocodeLocation(start),
    geocodeLocation(destination),
  ]);

  // Get walking route
  const routeData = await getWalkingRoute(
    startLocation.latitude,
    startLocation.longitude,
    destinationLocation.latitude,
    destinationLocation.longitude,
  );

  // Format and return response
  const formattedResponse = formatRouteResponse(
    startLocation,
    destinationLocation,
    routeData,
  );

  return successResponse(res, formattedResponse, 200);
}
