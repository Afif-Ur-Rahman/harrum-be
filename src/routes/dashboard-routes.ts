import express from "express";

import {
  createEmployee,
  deleteEmployee,
  getDashboardStats,
  getEmployee,
  getOwnerProfile,
  updateOwnerProfile,
} from "@/controllers";
import { authMiddleware } from "@/middlewares";

const router = express.Router();

router.use(authMiddleware);

router.get("/stats", getDashboardStats);
router.post("/create-employee", createEmployee);
router.get("/", getEmployee);
router.delete("/:id", deleteEmployee);
router.get("/profile", getOwnerProfile);
router.put("/profile", updateOwnerProfile);

export { router as dashboardRoutes };
