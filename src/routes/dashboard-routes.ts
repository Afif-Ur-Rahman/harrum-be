import express from "express";

import { getDashboardStats, getOwnerProfile, updateOwnerProfile } from "@/controllers";
import { authMiddleware } from "@/middlewares";

const router = express.Router();

router.use(authMiddleware);

router.get("/stats", getDashboardStats);
router.get("/profile", getOwnerProfile);
router.put("/profile", updateOwnerProfile);

export { router as dashboardRoutes };
