import { Router } from "express";

import { authMiddleware } from "@/middlewares";

import {
  createStock,
  deleteStock,
  deleteStockHistory,
  getStockHistory,
  getStocks,
  stockOut,
  updateStockHistory,
} from "../controllers";

const router = Router();

router.use(authMiddleware);

router.get("/history", getStockHistory);
router.get("/", getStocks);
router.post("/", createStock);
router.post("/out", stockOut);
router.put("/:id/:historyId", updateStockHistory);
router.delete("/:id", deleteStock);
router.delete("/:id/:historyId", deleteStockHistory);

export { router as stockRoutes };
