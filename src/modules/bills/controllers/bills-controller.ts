import { Request, Response } from "express";
import mongoose from "mongoose";

import { statusCodes } from "@/constants";
import { Vendor } from "@/modules/vendors/model";
import { catchAsync } from "@/utils";

import { Bill } from "../model";

const roundMoney = (value: number) => Math.round(value * 100) / 100;

const buildBillsPayload = async (vendorId: string, vendorRemainingAmount: number) => {
  const bills = await Bill.find({ vendor: vendorId })
    .sort({ createdAt: -1 })
    .populate("createdBy", "username email");

  const totalAmount = roundMoney(bills.reduce((sum, bill) => sum + bill.amount, 0));
  const remainingAmount = roundMoney(vendorRemainingAmount || 0);
  const paidAmount = Math.max(roundMoney(totalAmount - remainingAmount), 0);

  return { bills, totalAmount, paidAmount, remainingAmount };
};

export const getBills = catchAsync(async (req: Request, res: Response) => {
  try {
    const vendorId = (req.query.vendor as string)?.trim();

    if (!vendorId || !mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(statusCodes.BAD_REQUEST).json({
        message: "A valid vendor id is required",
      });
    }

    const vendor = await Vendor.findById(vendorId);

    if (!vendor) {
      return res.status(statusCodes.NOT_FOUND).json({
        message: "Vendor not found",
      });
    }

    const data = await buildBillsPayload(vendorId, vendor.remainingAmount);

    return res.status(statusCodes.OK).json({
      message: "Bills fetched successfully",
      data,
    });
  } catch (error: any) {
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Failed to fetch bills",
      error,
    });
  }
});

export const createBill = catchAsync(async (req: Request, res: Response) => {
  const session = await mongoose.startSession();

  try {
    const createdBy = req.user?._id;
    const createdByType = req.user?.type === "owner" ? "User" : "Employee";
    const { vendor: vendorId, billId, note, amount } = req.body;

    if (!vendorId || !billId || !amount) {
      return res.status(statusCodes.BAD_REQUEST).json({
        message: "Vendor, bill ID and amount are required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(statusCodes.BAD_REQUEST).json({
        message: "Invalid vendor id",
      });
    }

    const trimmedBillId = String(billId).trim();

    if (!trimmedBillId) {
      return res.status(statusCodes.BAD_REQUEST).json({
        message: "Bill ID is required",
      });
    }

    const parsedAmount = Number(amount);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(statusCodes.BAD_REQUEST).json({
        message: "Amount must be greater than 0",
      });
    }

    let updatedVendor: any;

    await session.withTransaction(async () => {
      const vendorDoc = await Vendor.findById(vendorId).session(session);

      if (!vendorDoc) {
        throw new Error("Vendor not found");
      }

      vendorDoc.remainingAmount = (vendorDoc.remainingAmount || 0) + parsedAmount;
      updatedVendor = await vendorDoc.save({ session });

      await Bill.create(
        [
          {
            vendor: vendorId,
            billId: trimmedBillId,
            note,
            amount: parsedAmount,
            createdBy,
            createdByType,
          },
        ],
        { session },
      );
    });

    const data = await buildBillsPayload(vendorId, updatedVendor.remainingAmount);

    return res.status(statusCodes.CREATED).json({
      message: "Bill created successfully",
      data,
      updatedVendor,
    });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(statusCodes.CONFLICT).json({
        message: "A bill with this ID already exists for this vendor",
      });
    }

    return res.status(statusCodes.BAD_REQUEST).json({
      message: error.message || "Failed to create bill",
      error,
    });
  } finally {
    await session.endSession();
  }
});
