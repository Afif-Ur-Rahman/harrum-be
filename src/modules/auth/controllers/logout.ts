import { Request, Response } from "express";

import { statusCodes } from "@/constants";
import { IUser } from "@/modules/user/model";
import { userService } from "@/modules/user/services";
import { catchAsync } from "@/utils/catch-async";

export const logout = catchAsync(async (req: Request, res: Response): Promise<Response> => {
  try {
    const user = req.user as IUser;

    await userService.updateUser(user._id as any, {
      device: null,
      platform: null,
    });

    return res.status(statusCodes.OK).json({ message: "Logged out successfully" });
  } catch (error) {
    return res
      .status(statusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Error logging out", error });
  }
});
