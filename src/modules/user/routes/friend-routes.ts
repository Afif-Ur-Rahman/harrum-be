import { Router } from "express";

import { authMiddleware } from "@/middlewares/auth-middleware";
import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriends,
  unfriend,
  getPendingRequests,
  cancelFriendRequest,
  getSentRequests,
} from "@/modules/user/controllers";

const router = Router();

router.use(authMiddleware);

router.get("/requests", getPendingRequests);
router.get("/sent-requests", getSentRequests);
router.get("/:userId", getFriends);

router.post("/request/:userId", sendFriendRequest);

router.patch("/accept/:userId", acceptFriendRequest);
router.patch("/reject/:userId", rejectFriendRequest);

router.delete("/cancel/:userId", cancelFriendRequest);
router.delete("/:userId", unfriend);

export { router as friendRoutes };
