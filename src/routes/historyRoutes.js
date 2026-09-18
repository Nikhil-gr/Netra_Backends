import { Router } from "express";
import { createHistory, getHistory } from "../controllers/historyController.js";
import { historyLimiter } from "../middleware/rateLimiter.js";

const router = Router();
router.use(historyLimiter);
router.get("/", getHistory);
router.post("/", createHistory);
export default router;
