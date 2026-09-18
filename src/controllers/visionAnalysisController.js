import VisionAnalysis from '../models/VisionAnalysis.js';
import { requireDatabase, requireObjectId } from '../utils/crudGuards.js';
import { ApiError, successResponse } from '../utils/apiResponse.js';

export async function createVisionAnalysis(req, res) {
  requireDatabase();
  const { userId, journeyId, description } = req.body ?? {};
  requireObjectId(userId);
  if (journeyId !== undefined && journeyId !== null) requireObjectId(journeyId);
  if (typeof description !== 'string' || !description.trim()) {
    throw new ApiError(400, 'DESCRIPTION_REQUIRED', 'description is required.');
  }
  const analysis = await VisionAnalysis.create({
    userId,
    journeyId: journeyId || undefined,
    description: description.trim(),
  });
  return successResponse(res, analysis, 201);
}

export async function getVisionAnalyses(req, res) {
  requireDatabase();
  const filter = {};
  if (req.query.userId) { requireObjectId(req.query.userId); filter.userId = req.query.userId; }
  if (req.query.journeyId) { requireObjectId(req.query.journeyId); filter.journeyId = req.query.journeyId; }
  const analyses = await VisionAnalysis.find(filter).sort({ createdAt: -1 }).limit(100).lean();
  return successResponse(res, analyses);
}

export async function getVisionAnalysisById(req, res) {
  requireDatabase();
  requireObjectId(req.params.id);
  const analysis = await VisionAnalysis.findById(req.params.id).lean();
  if (!analysis) throw new ApiError(404, 'VISION_ANALYSIS_NOT_FOUND', 'Vision analysis not found.');
  return successResponse(res, analysis);
}

export async function updateVisionAnalysis(req, res) {
  requireDatabase();
  requireObjectId(req.params.id);
  const { description, journeyId } = req.body ?? {};
  const updates = {};
  if (description !== undefined) {
    if (typeof description !== 'string' || !description.trim()) {
      throw new ApiError(400, 'DESCRIPTION_REQUIRED', 'description must be non-empty text.');
    }
    updates.description = description.trim();
  }
  if (journeyId !== undefined) {
    if (journeyId !== null) requireObjectId(journeyId);
    updates.journeyId = journeyId;
  }
  const analysis = await VisionAnalysis.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  if (!analysis) throw new ApiError(404, 'VISION_ANALYSIS_NOT_FOUND', 'Vision analysis not found.');
  return successResponse(res, analysis);
}

export async function deleteVisionAnalysis(req, res) {
  requireDatabase();
  requireObjectId(req.params.id);
  const analysis = await VisionAnalysis.findByIdAndDelete(req.params.id);
  if (!analysis) throw new ApiError(404, 'VISION_ANALYSIS_NOT_FOUND', 'Vision analysis not found.');
  return successResponse(res, { deleted: true });
}
