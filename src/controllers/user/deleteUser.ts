import { Request, Response } from "express";
import { statusCodes } from "@/constants/statusCodes";
import userService from "@/services/userService";
import { IUser } from "@/models";

export const deleteUser = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const userId = (req.user as IUser)._id;
    const user = await userService.deleteUser(userId);
    if (!user) {
      return res
        .status(statusCodes.NOT_FOUND)
        .json({ message: "User not found" });
    }
    return res
      .status(statusCodes.OK)
      .json({ message: "User deleted successfully" });
  } catch (error) {
    return res
      .status(statusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Error deleting user", error });
  }
};
