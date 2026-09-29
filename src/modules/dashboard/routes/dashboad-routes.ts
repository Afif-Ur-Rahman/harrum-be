import { Router } from "express";

import { authMiddleware } from "@/middlewares/auth-middleware";

import { dismissStock, getStats } from "../controllers";

const router = Router();
router.use(authMiddleware);

router.get("/stats", getStats);
router.patch("/stock-alerts/:stockId", dismissStock);

export { router as dashboardRoutes };
