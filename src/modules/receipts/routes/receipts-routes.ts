import { Router } from "express";

import { authMiddleware, requirePermission } from "@/middlewares";

import { createReceipt, getReceipts } from "../controllers";

const router = Router();
router.use(authMiddleware);

router.use(requirePermission("customers", "vendors"));

router.get("/", getReceipts);
router.post("/", createReceipt);

export { router as receiptRoutes };
