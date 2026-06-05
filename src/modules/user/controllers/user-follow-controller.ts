import { Request, Response } from "express";

import { statusCodes } from "@/constants";
import { Follow, IUser } from "@/modules/user/model";
import { catchAsync } from "@/utils/catch-async";

export const followUser = catchAsync(async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const followerId = (req.user as IUser)._id;

    let follow = await Follow.create({
      follower: followerId,
      following: userId,
      type: "User",
    });

    follow = await follow.populate("following", "username fullName image");

    res.status(statusCodes.CREATED).json({
      message: "Followed successfully",
      data: follow,
    });
  } catch (error) {
    res.status(statusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Error following user",
      error,
    });
  }
});

export const unfollowUser = catchAsync(async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const followerId = (req.user as IUser)._id;

    await Follow.findOneAndDelete({
      follower: followerId,
      following: userId,
      type: "User",
    });

    res.status(statusCodes.OK).json({
      message: "Unfollowed successfully",
    });
  } catch (error) {
    res.status(statusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Error unfollowing user",
      error,
    });
  }
});

export const getFollowers = catchAsync(async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const followers = await Follow.find({ following: userId, type: "User" })
      .populate("follower", "username fullName image")
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Follow.countDocuments({
      following: userId,
      type: "User",
    });

    res.status(statusCodes.OK).json({
      data: followers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(statusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Error fetching followers",
      error,
    });
  }
});

export const getFollowing = catchAsync(async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const following = await Follow.find({ follower: userId, type: "User" })
      .populate("following", "username fullName image")
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Follow.countDocuments({
      follower: userId,
      type: "User",
    });

    res.status(statusCodes.OK).json({
      data: following,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(statusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Error fetching following",
      error,
    });
  }
});
