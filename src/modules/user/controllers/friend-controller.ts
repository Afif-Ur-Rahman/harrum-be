import { Request, Response } from "express";

import { sendNotification } from "@/config/oneSignal";
import { statusCodes } from "@/constants";
import { IUser, User, Friend } from "@/modules/user/model";
import { catchAsync } from "@/utils/catch-async";

export const sendFriendRequest = catchAsync(async (req: Request, res: Response) => {
  try {
    const { userId } = req.params as { userId: string };
    const senderId = (req.user as IUser)._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(statusCodes.BAD_REQUEST).json({
        message: "User not found",
      });
    }

    const existingRequest = await Friend.findOne({
      $or: [
        { sender: senderId, receiver: userId },
        { sender: userId, receiver: senderId },
      ],
      status: "PENDING",
    });

    if (existingRequest) {
      return res.status(statusCodes.BAD_REQUEST).json({
        message: "Friend request already exists",
      });
    }

    let friendRequest = await Friend.create({
      sender: senderId,
      receiver: userId,
      status: "PENDING",
    });

    friendRequest = await friendRequest.populate("sender receiver");

    const responseData = updateData(friendRequest, userId);

    if (user.device) {
      sendNotification({
        message: `${(req.user as IUser).fullName} sent you a friend request`,
        title: "New Friend Request",
        playerIds: [user.device],
      });
    }

    return res.status(statusCodes.CREATED).json({
      message: "Friend request sent successfully",
      data: responseData,
    });
  } catch (error: Error | any) {
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Failed to send friend request",
      error,
    });
  }
});

export const acceptFriendRequest = catchAsync(async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const user = req.user as IUser;

    const friendRequest = await Friend.findOneAndUpdate(
      {
        sender: userId,
        receiver: user._id,
        status: "PENDING",
      },
      { status: "ACCEPTED" },
      { new: true },
    ).populate("sender receiver");

    if (!friendRequest) {
      return res.status(statusCodes.NOT_FOUND).json({
        message: "Friend request not found",
      });
    }

    const currentUserId = (user._id as any).toString();
    const responseData = updateData(friendRequest, currentUserId);

    const sender = await User.findById(userId);

    if (sender?.device) {
      sendNotification({
        message: `${(req.user as IUser).fullName} accepted your friend request`,
        title: "Friend Request Accepted",
        playerIds: [sender.device],
      });
    }
    return res.status(statusCodes.OK).json({
      message: "Friend request accepted",
      data: responseData,
    });
  } catch (error: Error | any) {
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Failed to accept friend request",
      error,
    });
  }
});

export const cancelFriendRequest = catchAsync(async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const id = (req.user as IUser)._id;

    const friendRequest = await Friend.findOneAndDelete({
      sender: id,
      receiver: userId,
      status: "PENDING",
    });

    if (!friendRequest) {
      return res.status(statusCodes.NOT_FOUND).json({
        message: "Friend request not found",
      });
    }

    return res.status(statusCodes.OK).json({
      message: "Friend request canceled",
    });
  } catch (error: Error | any) {
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Failed to cancel friend request",
      error,
    });
  }
});

export const rejectFriendRequest = catchAsync(async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const id = (req.user as IUser)._id;

    const friendRequest = await Friend.findOneAndUpdate(
      {
        sender: userId,
        receiver: id,
        status: "PENDING",
      },
      { status: "REJECTED" },
      { new: true },
    );

    if (!friendRequest) {
      return res.status(statusCodes.NOT_FOUND).json({
        message: "Friend request not found",
      });
    }

    return res.status(statusCodes.OK).json({
      message: "Friend request rejected",
    });
  } catch (error: Error | any) {
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Failed to reject friend request",
      error,
    });
  }
});

export const unfriend = catchAsync(async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const currentUserId = (req.user as IUser)._id;

    const friendRequest = await Friend.findOneAndDelete({
      $or: [
        { sender: currentUserId, receiver: userId },
        { sender: userId, receiver: currentUserId },
      ],
      status: "ACCEPTED",
    });

    if (!friendRequest) {
      return res.status(statusCodes.NOT_FOUND).json({
        message: "Friend relationship not found",
      });
    }

    return res.status(statusCodes.OK).json({ message: "Unfriended successfully" });
  } catch (error: Error | any) {
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Failed to unfriend",
      error,
    });
  }
});

export const getFriends = catchAsync(async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const friends = await Friend.find({
      $or: [{ sender: userId }, { receiver: userId }],
      status: "ACCEPTED",
    })
      .populate("sender")
      .populate("receiver")
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Friend.countDocuments({
      $or: [{ sender: userId }, { receiver: userId }],
      status: "ACCEPTED",
    });
    const transformedData = friends.map((friend) => {
      const otherUserId =
        friend.sender._id.toString() === userId ? friend.receiver._id : friend.sender._id;
      return updateData(friend, otherUserId.toString());
    });

    return res.status(statusCodes.OK).json({
      message: "Friends retrieved successfully",
      data: transformedData,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: Error | any) {
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Failed to get friends",
      error,
    });
  }
});

export const getPendingRequests = catchAsync(async (req: Request, res: Response) => {
  try {
    const user = req.user as IUser;
    const userId = (user._id as any).toString();

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const requests = await Friend.find({
      receiver: userId,
      status: "PENDING",
    })
      .populate("sender receiver", "username fullName image")
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Friend.countDocuments({
      receiver: userId,
      status: "PENDING",
    });

    const transformedData = requests.map((request) => updateData(request, userId));

    return res.status(statusCodes.OK).json({
      data: transformedData,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: Error | any) {
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Failed to get pending friend requests",
      error,
    });
  }
});

export const getSentRequests = catchAsync(async (req: Request, res: Response) => {
  try {
    const userId = String((req.user as IUser)._id);

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const requests = await Friend.find({
      sender: userId,
      status: "PENDING",
    })
      .populate("sender receiver", "username fullName image")
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Friend.countDocuments({
      sender: userId,
      status: "PENDING",
    });

    const transformedData = requests.map((request) =>
      updateData(request, request.receiver._id.toString()),
    );

    return res.status(statusCodes.OK).json({
      data: transformedData,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: Error | any) {
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Failed to get sent friend requests",
      error,
    });
  }
});

const updateData = (data: any, userId: string) => {
  try {
    return {
      _id: data._id,
      status: data.status,
      user: data.receiver._id.toString() === userId ? data.receiver : data.sender,
    };
  } catch (error) {
    throw new Error("Failed to update data");
  }
};
