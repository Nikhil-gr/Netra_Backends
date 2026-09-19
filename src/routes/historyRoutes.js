import { Router } from "express";
import { clearHistory, createHistory, deleteHistory, getHistory } from "../controllers/historyController.js";
import { historyLimiter } from "../middleware/rateLimiter.js";
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(historyLimiter);
router.use(requireAuth);
router.get("/", getHistory);
router.post("/", createHistory);
router.delete('/', clearHistory);
router.delete('/:id', deleteHistory);
export default router;
