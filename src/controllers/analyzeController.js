import { processImage } from "../services/imageService.js";
import { analyzeWithGemini } from "../services/geminiService.js";
import { isDatabaseConnected } from "../config/db.js";
import History from "../models/History.js";
import VisionAnalysis from "../models/VisionAnalysis.js";
import { successResponse } from "../utils/apiResponse.js";
import { deleteImage, uploadImage } from "../services/cloudinaryService.js";

export default async function analyzeController(req, res) {
  const { mode, query, language, saveHistory, journeyId } = req.analysis;
  const userId = req.user?.id ?? null;
  let image;
  try {
    image = await processImage(req.file.buffer);
    delete req.file.buffer;
    const result = await analyzeWithGemini(image, { mode, query, language });

    const data = {
      mode,
      query,
      language,
      result,
      historySaved: false,
      historyId: null,
      imageUrl: null,
      visionAnalysisSaved: false,
      visionAnalysisId: null,
    };

    // Save general history only when explicitly requested.
    if (saveHistory && userId) {
      if (isDatabaseConnected()) {
        let cloudImage;
        try {
          cloudImage = await uploadImage(image);
          const record = await History.create({
            userId: userId || null,
            mode,
            query,
            language,
            result,
            ...cloudImage,
          });
          data.historySaved = true;
          data.historyId = record._id.toString();
          data.imageUrl = cloudImage.imageUrl;
        } catch (error) {
          console.error("History save failed:", error);
          if (cloudImage?.imagePublicId) {
            try {
              await deleteImage(cloudImage.imagePublicId);
            } catch (cleanupError) {
              console.warn(
                "Could not remove an orphaned Cloudinary image.",
                cleanupError,
              );
            }
          }
          data.historyWarning =
            "Analysis succeeded, but its image and history could not be saved.";
        }
      } else {
        data.historyWarning =
          "Analysis succeeded, but the history database is unavailable.";
      }
    } else if (saveHistory) data.historyWarning = "Sign in to save history.";

    // Only create a user-linked VisionAnalysis when a real userId was supplied.
    if (mode === "describe" && userId) {
      if (isDatabaseConnected()) {
        try {
          const analysis = await VisionAnalysis.create({
            userId,
            journeyId: journeyId || undefined,
            description: result.summary,
          });
          data.visionAnalysisSaved = true;
          data.visionAnalysisId = analysis._id.toString();
        } catch (error) {
          console.error("Vision analysis save failed:", error);
          data.visionAnalysisWarning =
            "Analysis succeeded, but it could not be linked to your account.";
        }
      } else {
        data.visionAnalysisWarning =
          "Analysis succeeded, but the database is unavailable to link it to your account.";
      }
    }

    return successResponse(res, data);
  } finally {
    // Drop references on both success and failure; buffers are reclaimed by Node.
    image = null;
    if (req.file) delete req.file.buffer;
  }
}
