import { Router } from "express";

import { authMiddleware } from "@/middlewares/auth-middleware";

import { claimOrderItem, createOrder, getOrders, returnOrderItem } from "../controllers";

const router = Router();
router.use(authMiddleware);

router.get("/", getOrders);
router.post("/", createOrder);
router.put("/return/:id/:itemId/:variantId", returnOrderItem);
router.put("/claim/:id/:itemId/:variantId", claimOrderItem);

export { router as orderRoutes };
