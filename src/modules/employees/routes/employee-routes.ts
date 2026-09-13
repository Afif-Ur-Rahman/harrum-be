import { Router } from "express";

import { authMiddleware } from "@/middlewares";
import {
  createEmployee,
  deleteEmployee,
  getEmployee,
} from "@/modules/employees/controllers/employee-controller";

const router = Router();
router.use(authMiddleware);

router.post("/create-employee", createEmployee);
router.get("/", getEmployee);
router.delete("/:id", deleteEmployee);

export { router as employeeRoutes };
