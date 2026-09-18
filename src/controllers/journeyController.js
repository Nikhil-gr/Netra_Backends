import Journey from '../models/Journey.js';
import { requireDatabase, requireObjectId } from '../utils/crudGuards.js';
import { ApiError, successResponse } from '../utils/apiResponse.js';

const STATUSES = ['planned', 'active', 'completed', 'cancelled'];

export async function createJourney(req, res) {
  requireDatabase();
  const { userId, startLocation, destination, route, status, startedAt, endedAt } = req.body ?? {};
  requireObjectId(userId);
  if (!startLocation || typeof startLocation.latitude !== 'number' || typeof startLocation.longitude !== 'number') {
    throw new ApiError(400, 'START_LOCATION_REQUIRED', 'startLocation.latitude and startLocation.longitude are required.');
  }
  if (!destination || typeof destination.name !== 'string' || !destination.name.trim() ||
      typeof destination.latitude !== 'number' || typeof destination.longitude !== 'number') {
    throw new ApiError(400, 'DESTINATION_REQUIRED', 'destination.name, latitude, and longitude are required.');
  }
  if (status !== undefined && !STATUSES.includes(status)) {
    throw new ApiError(400, 'INVALID_STATUS', 'status must be planned, active, completed, or cancelled.');
  }
  const journey = await Journey.create({ userId, startLocation, destination, route, status, startedAt, endedAt });
  return successResponse(res, journey, 201);
}

export async function getJourneys(req, res) {
  requireDatabase();
  const filter = {};
  if (req.query.userId) {
    requireObjectId(req.query.userId);
    filter.userId = req.query.userId;
  }
  const journeys = await Journey.find(filter).sort({ createdAt: -1 }).limit(100).lean();
  return successResponse(res, journeys);
}

export async function getJourneyById(req, res) {
  requireDatabase();
  requireObjectId(req.params.id);
  const journey = await Journey.findById(req.params.id).lean();
  if (!journey) throw new ApiError(404, 'JOURNEY_NOT_FOUND', 'Journey not found.');
  return successResponse(res, journey);
}

export async function updateJourney(req, res) {
  requireDatabase();
  requireObjectId(req.params.id);
  const { startLocation, destination, route, status, startedAt, endedAt } = req.body ?? {};
  if (status !== undefined && !STATUSES.includes(status)) {
    throw new ApiError(400, 'INVALID_STATUS', 'status must be planned, active, completed, or cancelled.');
  }
  const updates = {};
  if (startLocation !== undefined) updates.startLocation = startLocation;
  if (destination !== undefined) updates.destination = destination;
  if (route !== undefined) updates.route = route;
  if (status !== undefined) updates.status = status;
  if (startedAt !== undefined) updates.startedAt = startedAt;
  if (endedAt !== undefined) updates.endedAt = endedAt;
  const journey = await Journey.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  if (!journey) throw new ApiError(404, 'JOURNEY_NOT_FOUND', 'Journey not found.');
  return successResponse(res, journey);
}

export async function deleteJourney(req, res) {
  requireDatabase();
  requireObjectId(req.params.id);
  const journey = await Journey.findByIdAndDelete(req.params.id);
  if (!journey) throw new ApiError(404, 'JOURNEY_NOT_FOUND', 'Journey not found.');
  return successResponse(res, { deleted: true });
}
