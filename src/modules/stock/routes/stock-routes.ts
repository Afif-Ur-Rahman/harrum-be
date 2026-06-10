import { Router } from "express";

import { authMiddleware } from "@/middlewares/auth-middleware";

import { createStock, getStocks } from "../controllers";

const router = Router();
router.use(authMiddleware);

router.get("/", getStocks);
router.post("/", createStock);

export { router as stockRoutes };
