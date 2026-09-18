import { Router } from 'express';
import { crudLimiter } from '../middleware/rateLimiter.js';
import {
  createVisionAnalysis,
  getVisionAnalyses,
  getVisionAnalysisById,
  updateVisionAnalysis,
  deleteVisionAnalysis,
} from '../controllers/visionAnalysisController.js';

const router = Router();
router.use(crudLimiter);
router.get('/', getVisionAnalyses);
router.post('/', createVisionAnalysis);
router.get('/:id', getVisionAnalysisById);
router.put('/:id', updateVisionAnalysis);
router.delete('/:id', deleteVisionAnalysis);
export default router;
