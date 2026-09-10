import { Router } from "express";

import { authMiddleware } from "@/middlewares/auth-middleware";

import { createReceipt, getReceipts } from "../controllers";

const router = Router();
router.use(authMiddleware);

router.get("/", getReceipts);
router.post("/", createReceipt);

export { router as receiptRoutes };
