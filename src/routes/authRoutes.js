import { Router } from "express";
import { login, register, registerFamily } from "../controllers/authController.js";
import { crudLimiter } from "../middleware/rateLimiter.js";

const router = Router();
router.post("/register", crudLimiter, register);
router.post("/register-family", crudLimiter, registerFamily);
router.post("/login", crudLimiter, login);
export default router;
