import { Request, Response } from "express";
import { IUser } from "@/models/userModel";
import { statusCodes } from "@/constants/statusCodes";
import userService from "@/services/userService";

export const updateUser = async (req: Request, res: Response) => {
  try {
    const user = req.user as IUser;
    const { password, email } = req.body;
    if (password || email) {
      delete req.body.email;
      delete req.body.password;
    }

    const updatedUser = await userService.updateUser(user._id, req.body);

    return res.status(statusCodes.ACCEPTED).json(updatedUser);
  } catch (error) {
    return res
      .status(statusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Server error", error });
  }
};
