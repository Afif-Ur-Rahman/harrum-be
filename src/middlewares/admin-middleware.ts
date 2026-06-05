import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

import { JWT_SECRET } from "@/constants/env";
import { statusCodes } from "@/constants/statusCodes";
import { User } from "@/modules/user/model";

interface JwtPayload {
  id: string;
}

export const adminMiddleware = async (
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
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      throw new Error("Access denied. Invalid token.");
    }

    if (user.type !== "admin") {
      throw new Error("Access denied. You don't have permission to access this resource");
    }

    req.user = user;
    next();
  } catch (error: any) {
    res.status(statusCodes.UNAUTHORIZED).json({
      message: error.message || "Invalid token.",
    });
  }
};

export const superAdminMiddleware = async (
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
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      throw new Error("Access denied. Invalid token.");
    }

    if (user.type !== "owner" && user.type !== "admin") {
      throw new Error("Access denied. You don't have permission to access this resource");
    }

    req.user = user;
    next();
  } catch (error: any) {
    res.status(statusCodes.UNAUTHORIZED).json({
      message: error.message || "Invalid token.",
    });
  }
};
