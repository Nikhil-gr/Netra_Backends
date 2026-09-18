import { Router } from 'express';
import healthRoutes from './healthRoutes.js';
import analyzeRoutes from './analyzeRoutes.js';
import historyRoutes from './historyRoutes.js';
import guideRoutes from './guideRoutes.js';
import navigationRoutes from './navigationRoutes.js';
import userRoutes from './userRoutes.js';
import journeyRoutes from './journeyRoutes.js';
import visionAnalysisRoutes from './visionAnalysisRoutes.js';
import settingsRoutes from './settingsRoutes.js';

const router = Router();
router.use('/health', healthRoutes);
router.use('/analyze', analyzeRoutes);
router.use('/history', historyRoutes);
router.use('/guide', guideRoutes);
router.use('/navigation', navigationRoutes);
router.use('/users', userRoutes);
router.use('/journeys', journeyRoutes);
router.use('/vision-analyses', visionAnalysisRoutes);
router.use('/settings', settingsRoutes);

export default router;
