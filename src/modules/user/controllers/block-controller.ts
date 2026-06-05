import { Request, Response } from "express";
import { Types } from "mongoose";

import { statusCodes } from "@/constants/statusCodes";
import { Block, Friend, IUser } from "@/modules/user/model";
import { catchAsync } from "@/utils/catch-async";

export const blockUser = catchAsync(async (req: Request, res: Response): Promise<Response> => {
  try {
    const blockerId = (req.user as IUser)._id;
    const blockedId = new Types.ObjectId(req.params.userId as string);

    const existingBlock = await Block.findOne({
      blocker: blockerId,
      blocked: blockedId,
    });

    if (existingBlock) {
      return res.status(statusCodes.BAD_REQUEST).json({
        message: "User is already blocked",
      });
    }

    const isFriend = await Friend.findOne({
      $or: [
        { sender: blockerId, receiver: blockedId },
        { sender: blockedId, receiver: blockerId },
      ],
      status: "ACCEPTED",
    });

    const block = await Block.create({
      blocker: blockerId,
      blocked: blockedId,
      reason: req.body.reason,
    });

    if (isFriend) {
      await Friend.findByIdAndUpdate(isFriend._id, {
        status: "BLOCKED",
      });
    }

    return res.status(statusCodes.CREATED).json({
      message: "User blocked successfully",
      data: block,
    });
  } catch (error) {
    return res
      .status(statusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Error blocking user", error });
  }
});

export const unblockUser = catchAsync(async (req: Request, res: Response): Promise<Response> => {
  try {
    const blockerId = (req.user as IUser)._id;
    const blockedId = new Types.ObjectId(req.params.userId as string);

    const block = await Block.findOneAndDelete({
      blocker: blockerId,
      blocked: blockedId,
    });

    if (!block) {
      return res.status(statusCodes.NOT_FOUND).json({
        message: "Block not found",
      });
    }

    const isFriend = await Friend.findOne({
      $or: [
        { sender: blockerId, receiver: blockedId },
        { sender: blockedId, receiver: blockerId },
      ],
      status: "BLOCKED",
    });

    if (isFriend) {
      await Friend.findByIdAndUpdate(isFriend._id, {
        status: "ACCEPTED",
      });
    }

    return res.status(statusCodes.OK).json({
      message: "User unblocked successfully",
    });
  } catch (error) {
    return res
      .status(statusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Error unblocking user", error });
  }
});

export const getBlockedUsers = catchAsync(
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const blockerId = (req.user as IUser)._id;

      const blocks = await Block.find({ blocker: blockerId })
        .populate("blocked", "_id username fullName email image")
        .sort({ createdAt: -1 });

      return res.status(statusCodes.OK).json({
        message: "Blocked users fetched successfully",
        data: blocks,
      });
    } catch (error) {
      return res
        .status(statusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: "Error fetching blocked users", error });
    }
  },
);
