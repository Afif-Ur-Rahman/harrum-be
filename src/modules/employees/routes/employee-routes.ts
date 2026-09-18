import { Router } from "express";

import { authMiddleware } from "@/middlewares";
import {
  createEmployee,
  deleteEmployee,
  getEmployee,
  updateEmployee,
} from "@/modules/employees/controllers/employee-controller";

const router = Router();

router.use(authMiddleware);

router.post("/", createEmployee);
router.get("/", getEmployee);
router.put("/:id", updateEmployee);
router.delete("/:id", deleteEmployee);

export { router as employeeRoutes };
