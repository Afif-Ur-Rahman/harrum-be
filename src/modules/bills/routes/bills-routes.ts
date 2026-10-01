import { Router } from "express";

import { authMiddleware, requirePermission } from "@/middlewares";

import { createBill, getBills } from "../controllers";

const router = Router();
router.use(authMiddleware);
router.use(requirePermission("vendors"));

router.get("/", getBills);
router.post("/", createBill);

export { router as billRoutes };
