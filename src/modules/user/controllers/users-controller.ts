import { Request, Response } from "express";
import mongoose from "mongoose";

import { statusCodes } from "@/constants/statusCodes";
import { Follow, IUser } from "@/modules/user/model";
import { userService } from "@/modules/user/services";
import { catchAsync } from "@/utils/catch-async";

import { friendsService } from "../services";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}
export const getAllUsers = catchAsync(async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = (req.user as IUser)._id as mongoose.Types.ObjectId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const users = await userService.getAllUsers(userId, page, limit);
    return res.status(statusCodes.OK).json({ data: users.data, pagination: users.pagination });
  } catch (error: Error | any) {
    return res
      .status(statusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message || "Error fetching users", error });
  }
});

export const getUserInfo = catchAsync(async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = req.params.id as string;
    const currentUser = req.user as IUser;
    const currentUserId = (currentUser._id as any).toString();
    const [user, followers, following, friendCount, friends] = await Promise.all([
      userService.getUserById(userId),
      Follow.countDocuments({ following: userId }),
      Follow.countDocuments({ follower: userId }),
      friendsService.friendsCount(userId),
      friendsService.checkFriendStatus(currentUserId, userId),
    ]);

    if (!user) {
      return res.status(statusCodes.NOT_FOUND).json({ message: "User not found" });
    }

    const counts = { followers, following, friends: friendCount };

    return res.status(statusCodes.OK).json({ user, friends, counts });
  } catch (error: Error | any) {
    return res
      .status(statusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message || "Server error", error });
  }
});
