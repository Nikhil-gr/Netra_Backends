import { Router } from 'express';
import { crudLimiter } from '../middleware/rateLimiter.js';
import { createJourney, getJourneys, getJourneyById, updateJourney, deleteJourney } from '../controllers/journeyController.js';

const router = Router();
router.use(crudLimiter);
router.get('/', getJourneys);
router.post('/', createJourney);
router.get('/:id', getJourneyById);
router.put('/:id', updateJourney);
router.delete('/:id', deleteJourney);
export default router;
