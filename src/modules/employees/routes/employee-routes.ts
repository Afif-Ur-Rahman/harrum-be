import { Router } from "express";

import { authMiddleware, requirePermission } from "@/middlewares";
import {
  createEmployee,
  deleteEmployee,
  getEmployee,
  updateEmployee,
} from "@/modules/employees/controllers/employee-controller";

const router = Router();

router.use(authMiddleware);

router.get("/", requirePermission("employees", "orders"), getEmployee);

router.post("/", requirePermission("employees"), createEmployee);
router.put("/:id", requirePermission("employees"), updateEmployee);
router.delete("/:id", requirePermission("employees"), deleteEmployee);

export { router as employeeRoutes };
