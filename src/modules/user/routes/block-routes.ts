import { Router } from "express";

import { authMiddleware } from "@/middlewares/auth-middleware";
import { blockUser, unblockUser, getBlockedUsers } from "@/modules/user/controllers";

const router = Router();

router.use(authMiddleware);

router.get("/", getBlockedUsers);

router.post("/:userId", blockUser);

router.delete("/:userId", unblockUser);

export { router as blockRoutes };
