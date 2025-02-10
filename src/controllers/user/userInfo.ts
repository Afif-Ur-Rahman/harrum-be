import { Request, Response } from "express";
import { statusCodes } from "@/constants/statusCodes";
import userService from "@/services/userService";

export const getUserInfo = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;

    const user = await userService.getUserById(userId);
    if (!user) {
      return res
        .status(statusCodes.NOT_FOUND)
        .json({ message: "User not found" });
    }
    return res.status(statusCodes.OK).json({ user });
  } catch (error) {
    return res
      .status(statusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Server error", error });
  }
};
