import { NextFunction, Request, Response } from "express";

import { statusCodes } from "@/constants/statusCodes";
import { PagePermission, Permission } from "@/modules/permissions/model";

type PermissionPage = PagePermission["key"];

export const requirePermission =
  (...pages: PermissionPage[]) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user;

      if (!user) {
        res.status(statusCodes.UNAUTHORIZED).json({ message: "Unauthorized" });
        return;
      }

      if (user.type === "owner") {
        next();
        return;
      }

      const permission = await Permission.findOne({ employee: user._id }).lean();

      const allowed = permission?.pages.some((page) => page.allowed && pages.includes(page.key));

      if (!allowed) {
        res
          .status(statusCodes.FORBIDDEN)
          .json({ message: "You don't have permission to access this resource" });
        return;
      }

      next();
    } catch (error: any) {
      res.status(statusCodes.INTERNAL_SERVER_ERROR).json({
        message: error.message || "Failed to verify permissions",
      });
    }
  };

export const ownerOnly = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user?.type !== "owner") {
    res.status(statusCodes.FORBIDDEN).json({ message: "Access denied. Not owner" });
    return;
  }

  next();
};
