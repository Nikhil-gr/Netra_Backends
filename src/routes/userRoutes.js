import { Router } from 'express';
import { crudLimiter } from '../middleware/rateLimiter.js';
import { createUser, getUsers, getUserById, updateUser, deleteUser } from '../controllers/userController.js';

const router = Router();
router.use(crudLimiter);
router.get('/', getUsers);
router.post('/', createUser);
router.get('/:id', getUserById);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);
export default router;
