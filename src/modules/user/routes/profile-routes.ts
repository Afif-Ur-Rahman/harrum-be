import { Router } from "express";

import { authMiddleware } from "@/middlewares/auth-middleware";
import { changeProfilePassword } from "@/modules/user/controllers";
import { catchAsync } from "@/utils/catch-async";

const router = Router();

router.use(authMiddleware);

router.put("/change-password", catchAsync(changeProfilePassword));

export { router as profileRoutes };
