import { Request, Response } from "express";
import { statusCodes } from "@/constants/statusCodes";
import userService from "@/services/userService";
import { IUser } from "@/models";

export const getUser = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const userId = (req.user as IUser)._id;
    const user = await userService.getUserById(userId);

    return res.status(statusCodes.ACCEPTED).json(user);
  } catch (error) {
    return res
      .status(statusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Something Went Wrong!", error });
  }
};
