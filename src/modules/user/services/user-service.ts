import mongoose from "mongoose";

import { IUser, User } from "@/modules/user/model";

const userObject = (user: IUser) => {
  const obj = user.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

export const userService = {
  async getAllUsers(userId: mongoose.Types.ObjectId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const filter = { _id: { $ne: userId }, type: { $nin: ["temp", "admin", "superAdmin"] } };
    const [users, total] = await Promise.all([
      User.find(filter)
        .select("-password -otp -otpExpires")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);
    return {
      data: users.map((u) => userObject(u as unknown as IUser)),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  },

  async getUserById(userId: string) {
    const user = await User.findById(userId).select("-password -otp -otpExpires");
    if (!user) {
      return null;
    }
    return userObject(user);
  },

  async updateUser(userId: mongoose.Types.ObjectId, updateData: any) {
    const user = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
    }).exec();
    if (!user) {
      return null;
    }
    return userObject(user);
  },

  async deleteUser(userId: string) {
    try {
      const user = await User.findByIdAndDelete(userId);

      if (!user) {
        throw new Error("User not found");
      }

      return user;
    } catch (error) {
      console.error("Error deleting user:", error);
      throw error;
    }
  },

  async findUserByEmail(email: string) {
    const user = await User.findOne({ email }).exec();
    if (!user) {
      return null;
    }
    return userObject(user);
  },

  async getUsersInfo(userIds: mongoose.Types.ObjectId[]) {
    const users = await User.find({ _id: { $in: userIds } }).exec();
    return users.map(userObject);
  },
};
