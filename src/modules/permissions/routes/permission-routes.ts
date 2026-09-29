import { Router } from "express";

import { authMiddleware } from "@/middlewares";

import { updatePermissions } from "../controllers";

const router = Router();

router.use(authMiddleware);

router.put("/:employeeId", updatePermissions);

export { router as permissionRoutes };
