import { Router } from "express";

import { authMiddleware, requirePermission } from "@/middlewares";

import { createStock, getStocks } from "../controllers";

const router = Router();
router.use(authMiddleware);

router.get("/", requirePermission("stocks", "orders"), getStocks);
router.post("/", requirePermission("stocks"), createStock);

export { router as stockRoutes };
