import { Router } from "express";
import guideController from "../controllers/guideController.js";
import validateGuide from "../middleware/validateGuide.js";
import { guideLimiter } from "../middleware/rateLimiter.js";

const router = Router();

router.post("/route", guideLimiter, validateGuide, guideController);
router.post("/recalculate", guideLimiter, validateGuide, guideController);

export default router;
