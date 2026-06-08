import { Router } from "express";

import {
  createEmployee,
  deleteEmployee,
  getEmployee,
  sellProduct,
} from "@/controllers/employee-controller";
import { authMiddleware } from "@/middlewares";

const router = Router();
router.use(authMiddleware);

router.post("/create-employee", createEmployee);
router.get("/", getEmployee);
router.delete("/:id", deleteEmployee);
router.put("/sell-product", sellProduct);

export { router as employeeRoutes };
