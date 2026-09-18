import { Router } from 'express';
import analyzeController from '../controllers/analyzeController.js';
import uploadImage from '../middleware/upload.js';
import validateAnalyze from '../middleware/validateAnalyze.js';
import { analyzeLimiter } from '../middleware/rateLimiter.js';

const router = Router();
router.post('/', analyzeLimiter, uploadImage, validateAnalyze, analyzeController);
export default router;
