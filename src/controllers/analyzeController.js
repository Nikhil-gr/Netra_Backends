import { processImage } from '../services/imageService.js';
import { analyzeWithGemini } from '../services/geminiService.js';
import { isDatabaseConnected } from '../config/db.js';
import History from '../models/History.js';
import { successResponse } from '../utils/apiResponse.js';

export default async function analyzeController(req, res) {
  const { mode, query, language, saveHistory } = req.analysis;
  let image;
  try {
    image = await processImage(req.file.buffer);
    delete req.file.buffer;
    const result = await analyzeWithGemini(image, { mode, query, language });
    image = null;

    const data = { mode, query, language, result, historySaved: false, historyId: null };
    if (saveHistory) {
      if (isDatabaseConnected()) {
        try {
          const record = await History.create({ mode, query, language, result });
          data.historySaved = true;
          data.historyId = record._id.toString();
        } catch {
          data.historyWarning = 'Analysis succeeded, but history could not be saved.';
        }
      } else {
        data.historyWarning = 'Analysis succeeded, but the history database is unavailable.';
      }
    }
    return successResponse(res, data);
  } finally {
    // Drop references on both success and failure; buffers are reclaimed by Node.
    image = null;
    if (req.file) delete req.file.buffer;
  }
}
