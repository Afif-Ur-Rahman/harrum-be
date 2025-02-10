import { Request, Response } from "express";
import { statusCodes } from "@/constants/statusCodes";

import userService from "@/services/userService";
import { IUser } from "@/models";

export const logout = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const user = req.user as IUser;

    await userService.updateUser(user._id, {
      device: null,
      platform: null,
    });

    return res
      .status(statusCodes.OK)
      .json({ message: "Logged out successfully" });
  } catch (error) {
    return res
      .status(statusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Error logging out", error });
  }
};
