import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

import { JWT_SECRET } from "@/constants/env";
import { statusCodes } from "@/constants/statusCodes";
import { Employee, IEmployee } from "@/models/employee-model";
import { IUser, User } from "@/modules/user/model";

interface JwtPayload {
  id: string;
  accountType?: "owner" | "worker" | "accountant";
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      throw new Error("Access denied. No token provided.");
    }

    const decoded = jwt.verify(token, JWT_SECRET as string) as JwtPayload;

    let user = null;
    if (decoded.accountType === "owner") {
      user = await User.findById(decoded.id).select("-password");
    } else if (decoded.accountType === "worker" || decoded.accountType === "accountant") {
      user = await Employee.findById(decoded.id).select("-password -tempPassword");
    }
    if (!user) {
      throw new Error("Access denied. Invalid token.");
    }

    req.user = user as IUser | IEmployee;
    next();
  } catch (error: any) {
    res.status(statusCodes.UNAUTHORIZED).json({
      message: error.message || "Invalid token.",
    });
  }
};
