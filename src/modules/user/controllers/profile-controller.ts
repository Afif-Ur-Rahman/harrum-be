import { Request, Response } from "express";
import mongoose from "mongoose";

import { statusCodes } from "@/constants/statusCodes";
import { comparePasswords, hashPassword } from "@/modules/auth/utils";
import { IUser } from "@/modules/user/model";
import { userService } from "@/modules/user/services";

export const updateProfile = async (req: Request, res: Response) => {
  try {
    // req.user is already the correct document (Restaurant | Employee | User)
    // resolved by auth middleware — operate on it directly so the right collection is updated
    const account = req.user as IUser;

    const { fullName, currency } = req.body;

    if (fullName !== undefined) account.fullName = fullName;
    if (currency !== undefined) account.currency = currency;

    await account.save();

    const result = account.toObject();
    delete result.password;
    delete result.tempPassword;
    delete result.__v;

    return res
      .status(statusCodes.ACCEPTED)
      .json({ message: "Profile Updated Successfully", data: result });
  } catch (error: Error | any) {
    return res
      .status(statusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message || "Server error", error });
  }
};

export const deleteProfile = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = (req.user as IUser)._id as mongoose.Types.ObjectId;
    const user = await userService.deleteUser(userId.toString());
    if (!user) {
      return res.status(statusCodes.NOT_FOUND).json({ message: "User not found" });
    }
    return res.status(statusCodes.OK).json({ message: "User deleted successfully" });
  } catch (error: Error | any) {
    return res
      .status(statusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message || "Error deleting user", error });
  }
};

export const changeProfilePassword = async (req: Request, res: Response) => {
  try {
    const { oldPassword, newPassword } = req.body;
    // req.user is the correct model document — work on it directly
    const account = req.user as any;

    // Fetch with password field since it's excluded by default in authMiddleware
    const accountWithPassword = await account.constructor.findById(account._id).select("+password");

    if (!accountWithPassword?.password) {
      return res.status(statusCodes.NOT_FOUND).json({ message: "Account not found" });
    }

    const isMatch = await comparePasswords(oldPassword, accountWithPassword.password);
    if (!isMatch) {
      return res.status(statusCodes.BAD_REQUEST).json({ message: "Incorrect old password" });
    }

    accountWithPassword.password = await hashPassword(newPassword);
    await accountWithPassword.save();

    return res.status(statusCodes.OK).json({ message: "Password changed successfully" });
  } catch (error: Error | any) {
    return res
      .status(statusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message || "Server error", error });
  }
};
