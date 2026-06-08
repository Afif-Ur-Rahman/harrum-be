import { Request, Response } from "express";

import { statusCodes } from "@/constants/statusCodes";
import { Employee, IEmployee } from "@/models";
import { comparePasswords, hashPassword } from "@/modules/auth/utils";

import { IUser, User } from "../model";

export const changeProfilePassword = async (req: Request, res: Response) => {
  try {
    const { _id, type } = req.user as IUser | IEmployee;
    const { oldPassword, newPassword, confirmPassword } = req.body;

    if (newPassword !== confirmPassword) {
      return res
        .status(statusCodes.BAD_REQUEST)
        .json({ message: "New password and confirm password do not match" });
    }

    let user: IUser | IEmployee;
    if (type === "owner") {
      user = await User.findById(_id).select("+password");
    } else {
      user = await Employee.findById(_id).select("+password");
    }

    if (!user.password) {
      return res.status(statusCodes.NOT_FOUND).json({ message: "Account not found" });
    }

    const isMatch = await comparePasswords(oldPassword, user.password);
    if (!isMatch) {
      return res
        .status(statusCodes.BAD_REQUEST)
        .json({ success: false, message: "Incorrect old password" });
    }

    user.password = await hashPassword(newPassword);
    await user.save();

    return res
      .status(statusCodes.OK)
      .json({ success: true, message: "Password changed successfully" });
  } catch (error: Error | any) {
    return res
      .status(statusCodes.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message || "Server error", error });
  }
};
