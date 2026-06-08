import { Request, Response } from "express";

import { statusCodes } from "@/constants/statusCodes";
import { comparePasswords, hashPassword } from "@/modules/auth/utils";

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
