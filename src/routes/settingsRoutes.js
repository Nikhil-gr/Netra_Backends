import { Router } from 'express';
import { crudLimiter } from '../middleware/rateLimiter.js';
import { createSettings, getSettings, getSettingsById, updateSettings, deleteSettings } from '../controllers/settingsController.js';

const router = Router();
router.use(crudLimiter);
router.get('/', getSettings);
router.post('/', createSettings);
router.get('/:id', getSettingsById);
router.put('/:id', updateSettings);
router.delete('/:id', deleteSettings);
export default router;
