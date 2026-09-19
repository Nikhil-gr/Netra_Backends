import { Router } from "express";
import {
  cancelSos,
  getSosHistory,
  markDialStarted,
  triggerSos,
} from "../controllers/sosController.js";
import { sosLimiter } from "../middleware/rateLimiter.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);
router.post("/trigger", sosLimiter, triggerSos);
router.post("/:id/dial-started", markDialStarted);
router.post("/:id/cancel", cancelSos);
router.get("/", getSosHistory);
export default router;
