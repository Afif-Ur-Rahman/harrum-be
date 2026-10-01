import { Router } from "express";

import { authMiddleware, requirePermission } from "@/middlewares";

import { dismissStock, getStats } from "../controllers";

const router = Router();
router.use(authMiddleware);
router.use(requirePermission("dashboard"));

router.get("/stats", getStats);
router.patch("/stock-alerts/:stockId", dismissStock);

export { router as dashboardRoutes };
