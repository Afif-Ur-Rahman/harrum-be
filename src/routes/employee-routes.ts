import { Router } from "express";

import { sellProduct } from "@/controllers/employee-controller";
import { authMiddleware } from "@/middlewares";

const router = Router();
router.use(authMiddleware);

router.put("/sell-product", sellProduct);

export { router as employeeRoutes };
