import { Router } from "express";

import { authMiddleware } from "@/middlewares/auth-middleware";

import { getStats } from "../controllers";

const router = Router();
router.use(authMiddleware);

router.get("/stats", getStats);

export { router as dashboardRoutes };
