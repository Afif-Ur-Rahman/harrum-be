import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

import { JWT_SECRET } from "@/constants/env";
import { statusCodes } from "@/constants/statusCodes";
import { Employee } from "@/models/employee-model";
import { User } from "@/modules/user/model";

interface JwtPayload {
  id: string;
  accountType?: "owner" | "worker" | "accountant" | "user";
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
    } else {
      // "user" or legacy tokens without accountType
      user = await User.findById(decoded.id).select("-password");
    }
    if (!user) {
      throw new Error("Access denied. Invalid token.");
    }

    req.user = user as any;
    next();
  } catch (error: any) {
    res.status(statusCodes.UNAUTHORIZED).json({
      message: error.message || "Invalid token.",
    });
  }
};
