import mongoose from "mongoose";

import { User, IUser } from "@/modules/user/model";

const userObject = (user: IUser) => {
  const obj = user.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

export const userService = {
  async getAllUsers(userId: mongoose.Types.ObjectId) {
    const users = await User.find({ _id: { $ne: userId } })
      .select("-password -otp -otpExpires")
      .sort({ createdAt: -1 });
    return users.map(userObject);
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
