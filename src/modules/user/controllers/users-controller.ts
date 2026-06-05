import { Request, Response } from "express";
import mongoose from "mongoose";

import { statusCodes } from "@/constants/statusCodes";
import { IUser } from "@/modules/user/model";
import { userService } from "@/modules/user/services";
import { catchAsync } from "@/utils/catch-async";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}
export const getAllUsers = catchAsync(async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = (req.user as IUser)._id as mongoose.Types.ObjectId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const users = await userService.getAllUsers(userId, page, limit);
    return res.status(statusCodes.OK).json({ data: users.data, pagination: users.pagination });
  } catch (error: Error | any) {
    return res
      .status(statusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message || "Error fetching users", error });
  }
});
