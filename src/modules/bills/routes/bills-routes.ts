import { Router } from "express";

import { authMiddleware } from "@/middlewares/auth-middleware";

import { createBill, getBills } from "../controllers";

const router = Router();
router.use(authMiddleware);

router.get("/", getBills);
router.post("/", createBill);

export { router as billRoutes };
