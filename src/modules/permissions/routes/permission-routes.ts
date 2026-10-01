import { Router } from "express";

import { authMiddleware, ownerOnly } from "@/middlewares";

import { updatePermissions } from "../controllers";

const router = Router();

router.use(authMiddleware, ownerOnly);

router.put("/:employeeId", updatePermissions);

export { router as permissionRoutes };
