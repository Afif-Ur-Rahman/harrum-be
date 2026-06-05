import { Router } from "express";

import { authMiddleware } from "@/middlewares/auth-middleware";
import { followUser, unfollowUser, getFollowers, getFollowing } from "@/modules/user/controllers";

const router = Router();

router.use(authMiddleware);

router.get("/user/:userId/followers", getFollowers);
router.get("/user/:userId/following", getFollowing);

router.post("/user/:userId", followUser);

router.delete("/user/:userId", unfollowUser);

export { router as userFollowRoutes };
