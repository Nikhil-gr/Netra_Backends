import { Router } from "express";
import healthRoutes from "./healthRoutes.js";
import analyzeRoutes from "./analyzeRoutes.js";
import historyRoutes from "./historyRoutes.js";
import guideRoutes from "./guideRoutes.js";
import navigationRoutes from "./navigationRoutes.js";
import userRoutes from "./userRoutes.js";
import journeyRoutes from "./journeyRoutes.js";
import visionAnalysisRoutes from "./visionAnalysisRoutes.js";
import settingsRoutes from "./settingsRoutes.js";
import sosRoutes from "./sosRoutes.js";
import parentalRoutes from "./parentalRoutes.js";
import authRoutes from "./authRoutes.js";

const router = Router();
router.use("/health", healthRoutes);
router.use("/analyze", analyzeRoutes);
router.use("/history", historyRoutes);
router.use("/guide", guideRoutes);
router.use("/navigation", navigationRoutes);
router.use("/users", userRoutes);
router.use("/journeys", journeyRoutes);
router.use("/vision-analyses", visionAnalysisRoutes);
router.use("/settings", settingsRoutes);
router.use("/sos", sosRoutes);
router.use("/parental", parentalRoutes);
router.use("/auth", authRoutes);

export default router;
