import { Request, Response } from "express";

import { statusCodes } from "@/constants";
import { IUser, User } from "@/modules/user/model";
import { buildDashboardStats } from "@/services";
import { catchAsync } from "@/utils";

export const getOwnerProfile = catchAsync(async (req: Request, res: Response) => {
  try {
    const owner = req.user as IUser;
    const ownerProfile = await User.findById(owner._id).select("-password");
    if (!ownerProfile) {
      return res.status(statusCodes.NOT_FOUND).json({ message: "Owner not found" });
    }
    return res.status(statusCodes.OK).json({ message: "Profile fetched", data: ownerProfile });
  } catch (error: any) {
    return res
      .status(statusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message || "Error fetching profile", error });
  }
});

export const updateOwnerProfile = catchAsync(async (req: Request, res: Response) => {
  try {
    const owner = req.user as IUser;
    const { fullName, phone, location } = req.body;

    const updateData: Record<string, any> = {};
    if (fullName) updateData.fullName = fullName;
    if (phone) updateData.phone = phone;
    if (req.body.image) updateData.image = req.body.image;
    if (req.body.coverImage) updateData.coverImage = req.body.coverImage;

    if (location) {
      const loc = typeof location === "string" ? JSON.parse(location) : location;
      if (loc.latitude && loc.longitude) {
        updateData.location = { type: "Point", coordinates: [loc.longitude, loc.latitude] };
      }
    }

    const updated = await User.findByIdAndUpdate(owner._id, updateData, { new: true }).select(
      "-password",
    );

    return res.status(statusCodes.OK).json({ message: "Profile updated", data: updated });
  } catch (error: any) {
    return res
      .status(statusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message || "Error updating profile", error });
  }
});

export const getDashboardStats = catchAsync(async (req: Request, res: Response) => {
  try {
    const owner = req.user as IUser;

    if (!owner || owner.type !== "owner") {
      return res.status(statusCodes.FORBIDDEN).json({ message: "Access denied. Not owner" });
    }

    const threshold = Number(req.query.threshold || 20);
    const months = Number(req.query.months || 6);

    const data = await buildDashboardStats(String(owner._id), { threshold, months });

    return res.status(statusCodes.OK).json({
      message: "Dashboard stats fetched successfully",
      data,
    });
  } catch (error: any) {
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Error fetching dashboard stats",
      error,
    });
  }
});
