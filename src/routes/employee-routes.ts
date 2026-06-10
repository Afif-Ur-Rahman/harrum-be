import { Router } from "express";

import { createEmployee, deleteEmployee, getEmployee } from "@/controllers/employee-controller";
import { authMiddleware } from "@/middlewares";

const router = Router();
router.use(authMiddleware);

router.post("/create-employee", createEmployee);
router.get("/", getEmployee);
router.delete("/:id", deleteEmployee);

export { router as employeeRoutes };
