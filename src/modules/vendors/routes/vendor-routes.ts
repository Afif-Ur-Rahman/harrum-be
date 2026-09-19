import { Router } from "express";

import { authMiddleware } from "@/middlewares/auth-middleware";

import { createVendor, deleteVendor, getVendors, updateVendor } from "../controllers";

const router = Router();
router.use(authMiddleware);

router.get("/", getVendors);
router.post("/", createVendor);
router.put("/:id", updateVendor);
router.delete("/:id", deleteVendor);

export { router as vendorRoutes };
