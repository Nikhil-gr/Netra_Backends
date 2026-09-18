import { Router } from "express";

const router = Router();
router.get("/", (req, res) =>
  res.json({ success: true, service: "netra-api", status: "healthy" }),
);
export default router;
