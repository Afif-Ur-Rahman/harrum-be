import { Router } from "express";

import { authMiddleware } from "@/middlewares/auth-middleware";
import * as userController from "@/modules/user/controllers/users-controller";

const router = Router();

router.use(authMiddleware);

router.get("/", userController.getAllUsers);

export { router as userRoutes };
