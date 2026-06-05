import { Types } from "mongoose";

import { Block } from "@/modules/user/model";

export const getBlockedUsers = async (userId: Types.ObjectId) => {
  const blockedByMe = await Block.find({ blocker: userId }).distinct("blocked");
  const blockedMe = await Block.find({ blocked: userId }).distinct("blocker");
  const allBlockedUsers = [...new Set([...blockedByMe, ...blockedMe])];
  return allBlockedUsers;
};

export const isBlocked = async (userId: Types.ObjectId, otherUserId: Types.ObjectId) => {
  const block = await Block.findOne({
    $or: [
      { blocker: userId, blocked: otherUserId },
      { blocker: otherUserId, blocked: userId },
    ],
  });
  return !!block;
};
