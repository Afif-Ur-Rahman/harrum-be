import { Request, Response } from "express";
import mongoose from "mongoose";

import { statusCodes } from "@/constants";
import { Customer, Vendor } from "@/modules";
import { catchAsync } from "@/utils";

import { Receipt } from "../model";

const PARTY_TYPES = ["Customer", "Vendor"];

const getParty = (type: string): mongoose.Model<any> => (type === "Vendor" ? Vendor : Customer);

export const getReceipts = catchAsync(async (req: Request, res: Response) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.max(Number(req.query.limit) || 30, 1);
    const partyId = (req.query.party as string)?.trim();
    const type = (req.query.type as string)?.trim();

    if (type && !PARTY_TYPES.includes(type)) {
      return res.status(statusCodes.BAD_REQUEST).json({
        message: "Type must be either Customer or Vendor",
      });
    }

    const filter: Record<string, unknown> = {};
    if (partyId) {
      filter.party = partyId;
    }
    if (type) {
      filter.type = type;
    }

    const skip = (page - 1) * limit;

    const [receipts, total] = await Promise.all([
      Receipt.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("party", "name phone")
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
    const createdByType = req.user?.type === "owner" ? "User" : "Employee";
    const { party: partyId, type, amount, note, paymentMethod } = req.body;

    if (!partyId || !type || !amount || !paymentMethod) {
      return res.status(statusCodes.BAD_REQUEST).json({
        message: "Party, type, amount and payment method are required",
      });
    }

    if (!PARTY_TYPES.includes(type)) {
      return res.status(statusCodes.BAD_REQUEST).json({
        message: "Type must be either Customer or Vendor",
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

    const PartyModel = getParty(type);

    let createdReceipt: any;
    let updatedParty: any;

    await session.withTransaction(async () => {
      const partyDoc = await PartyModel.findById(partyId).session(session);

      if (!partyDoc) {
        throw new Error(`${type} not found`);
      }

      if (parsedAmount > (partyDoc.remainingAmount || 0)) {
        throw new Error(
          `Amount exceeds remaining balance. Remaining: ${partyDoc.remainingAmount || 0}`,
        );
      }

      partyDoc.remainingAmount = (partyDoc.remainingAmount || 0) - parsedAmount;
      updatedParty = await partyDoc.save({ session });

      const receiptDocs = await Receipt.create(
        [
          {
            party: partyId,
            type,
            amount: parsedAmount,
            note,
            paymentMethod,
            createdBy,
            createdByType,
          },
        ],
        { session },
      );
      createdReceipt = receiptDocs[0];
    });

    return res.status(statusCodes.CREATED).json({
      message: "Receipt created successfully",
      data: createdReceipt,
      updatedParty,
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
