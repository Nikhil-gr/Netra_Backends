import { Router } from 'express';
import { crudLimiter } from '../middleware/rateLimiter.js';
import { createSettings, getSettings, getSettingsById, updateSettings, deleteSettings, getSettingsForUser, upsertSettingsForUser } from '../controllers/settingsController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(crudLimiter);
router.use(requireAuth);
router.get('/', getSettings);
router.post('/', createSettings);
router.get('/user/:userId', getSettingsForUser);
router.put('/user/:userId', upsertSettingsForUser);
router.get('/:id', getSettingsById);
router.put('/:id', updateSettings);
router.delete('/:id', deleteSettings);
export default router;
