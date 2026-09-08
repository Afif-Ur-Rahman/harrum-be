import { Router } from "express";

import { authMiddleware } from "@/middlewares/auth-middleware";

import { createCustomer, deleteCustomer, getCustomers, updateCustomer } from "../controllers";

const router = Router();
router.use(authMiddleware);

router.get("/", getCustomers);
router.post("/", createCustomer);
router.put("/:id", updateCustomer);
router.delete("/:id", deleteCustomer);

export { router as customerRoutes };
