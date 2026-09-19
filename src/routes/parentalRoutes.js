import { Router } from "express";
import {
  getChildHistory,
  getChildLocation,
  getChildSos,
  listChildren,
  listParents,
  revokeLink,
  updateChildLocation,
  updateControls,
} from "../controllers/parentalController.js";
import { parentalLimiter, trackingLimiter } from "../middleware/rateLimiter.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(parentalLimiter);
router.use(requireAuth);
router.get("/children", listChildren);
router.get("/parents", listParents);
router.put("/location", trackingLimiter, updateChildLocation);
router.get("/children/:childId/location", getChildLocation);
router.get("/children/:childId/sos", getChildSos);
router.get("/children/:childId/history", getChildHistory);
router.put("/links/:id/controls", updateControls);
router.delete("/links/:id", revokeLink);
export default router;
