import { Router } from "express";

import { authMiddleware, requirePermission } from "@/middlewares";

import {
  claimOrderItem,
  createOrder,
  getOrders,
  returnOrderItem,
  returnOrderItemDirect,
} from "../controllers";

const router = Router();
router.use(authMiddleware);

router.get("/", requirePermission("orders", "customers"), getOrders);

router.post("/", requirePermission("orders"), createOrder);

router.put("/return/:id/:itemId/:variantId", requirePermission("orders"), returnOrderItem);
router.put("/claim/:id/:itemId/:variantId", requirePermission("orders"), claimOrderItem);

router.put("/return-item/:id/:itemId", requirePermission("orders"), returnOrderItemDirect);

export { router as orderRoutes };
