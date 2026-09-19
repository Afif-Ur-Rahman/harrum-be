import { Request, Response } from "express";

import { statusCodes } from "@/constants";
import { catchAsync } from "@/utils";

import { Vendor } from "../model";

export const getVendors = catchAsync(async (_req: Request, res: Response) => {
  try {
    const vendors = await Vendor.find().sort({ createdAt: -1 });

    return res.status(statusCodes.OK).json({
      message: "Vendors fetched successfully",
      data: vendors,
    });
  } catch (error: any) {
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Failed to fetch vendors",
      error,
    });
  }
});

export const createVendor = catchAsync(async (req: Request, res: Response) => {
  try {
    const { name, phone, email, remainingAmount } = req.body;

    if (!name || !phone) {
      return res.status(statusCodes.BAD_REQUEST).json({
        message: "Name and phone are required",
      });
    }

    const existing = await Vendor.findOne({ phone });
    if (existing) {
      return res.status(statusCodes.CONFLICT).json({
        message: "A vendor with this phone number already exists",
      });
    }

    const parsedRemaining = Number(remainingAmount);
    const safeRemaining = isNaN(parsedRemaining) || parsedRemaining < 0 ? 0 : parsedRemaining;

    const vendor = await Vendor.create({
      name,
      phone,
      email,
      remainingAmount: safeRemaining,
    });

    return res.status(statusCodes.CREATED).json({
      message: "Vendor created successfully",
      data: vendor,
    });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(statusCodes.CONFLICT).json({
        message: "A vendor with this phone number already exists",
      });
    }

    return res.status(statusCodes.BAD_REQUEST).json({
      message: error.message || "Failed to create vendor",
      error,
    });
  }
});

export const updateVendor = catchAsync(async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, phone, email } = req.body;

    if (phone) {
      const existing = await Vendor.findOne({ phone, _id: { $ne: id } });
      if (existing) {
        return res.status(statusCodes.CONFLICT).json({
          message: "Another vendor with this phone number already exists",
        });
      }
    }

    const vendor = await Vendor.findByIdAndUpdate(
      id,
      { $set: { name, phone, email } },
      { new: true, runValidators: true },
    );

    if (!vendor) {
      return res.status(statusCodes.NOT_FOUND).json({ message: "Vendor not found" });
    }

    return res.status(statusCodes.OK).json({
      message: "Vendor updated successfully",
      data: vendor,
    });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(statusCodes.CONFLICT).json({
        message: "Another vendor with this phone number already exists",
      });
    }

    return res.status(statusCodes.BAD_REQUEST).json({
      message: error.message || "Failed to update vendor",
      error,
    });
  }
});

export const deleteVendor = catchAsync(async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const vendor = await Vendor.findByIdAndDelete(id);

    if (!vendor) {
      return res.status(statusCodes.NOT_FOUND).json({ message: "Vendor not found" });
    }

    return res.status(statusCodes.OK).json({ message: "Vendor deleted successfully" });
  } catch (error: any) {
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Failed to delete vendor",
      error,
    });
  }
});
