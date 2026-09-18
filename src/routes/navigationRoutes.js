import { Router } from "express";
import { routeController, searchController } from "../controllers/navigationController.js";
import validateNavigationRoute, { validateNavigationSearch } from "../middleware/validateNavigation.js";
import { navigationLimiter } from "../middleware/rateLimiter.js";

const router = Router();
router.post("/route", navigationLimiter, validateNavigationRoute, routeController);
router.get("/search", navigationLimiter, validateNavigationSearch, searchController);

export default router;
