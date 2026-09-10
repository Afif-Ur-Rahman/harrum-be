import { Request, Response } from "express";
import mongoose from "mongoose";

import { statusCodes } from "@/constants";
import { Customer } from "@/modules/customers";
import { catchAsync } from "@/utils";

import { Receipt } from "../model";

export const getReceipts = catchAsync(async (req: Request, res: Response) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.max(Number(req.query.limit) || 30, 1);
    const customerId = (req.query.customer as string)?.trim();

    const filter: Record<string, unknown> = {};
    if (customerId) {
      filter.customer = customerId;
    }

    const skip = (page - 1) * limit;

    const [receipts, total] = await Promise.all([
      Receipt.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("customer", "name phone")
        .populate("createdBy", "username email"),
      Receipt.countDocuments(filter),
    ]);

    return res.status(statusCodes.OK).json({
      message: "Receipts fetched successfully",
      data: {
        receipts,
        total,
        page,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error: any) {
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Failed to fetch receipts",
      error,
    });
  }
});

export const createReceipt = catchAsync(async (req: Request, res: Response) => {
  const session = await mongoose.startSession();

  try {
    const createdBy = req.user?._id;
    const { customer: customerId, amount, note, paymentMethod } = req.body;

    if (!customerId || !amount || !paymentMethod) {
      return res.status(statusCodes.BAD_REQUEST).json({
        message: "Customer, amount and payment method are required",
      });
    }

    if (!["cash", "online"].includes(paymentMethod)) {
      return res.status(statusCodes.BAD_REQUEST).json({
        message: "Payment method must be either cash or online",
      });
    }

    const parsedAmount = Number(amount);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(statusCodes.BAD_REQUEST).json({
        message: "Amount must be greater than 0",
      });
    }

    let createdReceipt: any;
    let updatedCustomer: any;

    await session.withTransaction(async () => {
      const customerDoc = await Customer.findById(customerId).session(session);

      if (!customerDoc) {
        throw new Error("Customer not found");
      }

      if (parsedAmount > (customerDoc.remainingAmount || 0)) {
        throw new Error(
          `Amount exceeds remaining balance. Customer owes ${customerDoc.remainingAmount || 0}`,
        );
      }

      customerDoc.remainingAmount = (customerDoc.remainingAmount || 0) - parsedAmount;
      updatedCustomer = await customerDoc.save({ session });

      const receiptDocs = await Receipt.create(
        [
          {
            customer: customerId,
            amount: parsedAmount,
            note,
            paymentMethod,
            createdBy,
          },
        ],
        { session },
      );
      createdReceipt = receiptDocs[0];
    });

    return res.status(statusCodes.CREATED).json({
      message: "Receipt created successfully",
      data: createdReceipt,
      updatedCustomer,
    });
  } catch (error: any) {
    return res.status(statusCodes.BAD_REQUEST).json({
      message: error.message || "Failed to create receipt",
      error,
    });
  } finally {
    await session.endSession();
  }
});
