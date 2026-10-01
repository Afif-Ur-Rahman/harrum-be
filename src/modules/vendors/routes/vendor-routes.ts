import { Router } from "express";

import { authMiddleware, requirePermission } from "@/middlewares";

import {
  createVendor,
  deleteVendor,
  getVendors,
  getVendorStocks,
  updateVendor,
} from "../controllers";

const router = Router();
router.use(authMiddleware);

router.get("/", requirePermission("vendors", "stocks"), getVendors);

router.get("/:id/stocks", requirePermission("vendors"), getVendorStocks);
router.post("/", requirePermission("vendors"), createVendor);
router.put("/:id", requirePermission("vendors"), updateVendor);
router.delete("/:id", requirePermission("vendors"), deleteVendor);

export { router as vendorRoutes };
