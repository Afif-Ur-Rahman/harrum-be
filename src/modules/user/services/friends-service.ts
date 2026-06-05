import { Friend } from "../model";

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

const getFriends = async (userId: string) => {
  const friends = await Friend.find({ $or: [{ sender: userId }, { receiver: userId }] }).populate(
    "sender receiver",
  );
  const friendsData = friends.map((friend) =>
    friend.sender._id.toString() === userId ? friend.receiver : friend.sender,
  );
  return friendsData;
};

const getFriendsIds = async (userId: string) => {
  const friends = await Friend.find({
    $or: [{ sender: userId }, { receiver: userId }],
    status: "ACCEPTED",
  });

  return friends.map((friend) =>
    friend.sender.toString() === userId ? friend.receiver : friend.sender,
  );
};

const checkFriendStatus = async (userId: string, friendId: string) => {
  const friend = await Friend.findOne({
    $or: [
      { sender: userId, receiver: friendId },
      { sender: friendId, receiver: userId },
    ],
  });

  return friend;
};

const friendsCount = async (userId: string) => {
  const friends = await Friend.countDocuments({
    $or: [{ sender: userId }, { receiver: userId }],
    status: "ACCEPTED",
  });
  return friends;
};

export const friendsService = {
  updateData,
  getFriends,
  checkFriendStatus,
  getFriendsIds,
  friendsCount,
};
