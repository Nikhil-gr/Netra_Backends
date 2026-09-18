import { getWalkingRoute, searchDestinations } from "../services/navigationService.js";
import { successResponse } from "../utils/apiResponse.js";

export async function routeController(req, res) {
  const { start, destination } = req.navigation;
  const route = await getWalkingRoute(start, destination);
  return successResponse(res, route);
}

export async function searchController(req, res) {
  const items = await searchDestinations(req.navigationQuery);
  return successResponse(res, { items });
}
