import { Request, Response } from "express";

import { statusCodes } from "@/constants";
import { catchAsync } from "@/utils";

import { Customer } from "../model";

export const getCustomers = catchAsync(async (_req: Request, res: Response) => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 });

    return res.status(statusCodes.OK).json({
      message: "Customers fetched successfully",
      data: customers,
    });
  } catch (error: any) {
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Failed to fetch customers",
      error,
    });
  }
});

export const createCustomer = catchAsync(async (req: Request, res: Response) => {
  try {
    const { name, phone, email, remainingAmount } = req.body;

    if (!name || !phone) {
      return res.status(statusCodes.BAD_REQUEST).json({
        message: "Name and phone are required",
      });
    }

    const existing = await Customer.findOne({ phone });
    if (existing) {
      return res.status(statusCodes.CONFLICT).json({
        message: "A customer with this phone number already exists",
      });
    }

    const parsedRemaining = Number(remainingAmount);
    const safeRemaining = isNaN(parsedRemaining) || parsedRemaining < 0 ? 0 : parsedRemaining;

    const customer = await Customer.create({
      name,
      phone,
      email,
      remainingAmount: safeRemaining,
    });

    return res.status(statusCodes.CREATED).json({
      message: "Customer created successfully",
      data: customer,
    });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(statusCodes.CONFLICT).json({
        message: "A customer with this phone number already exists",
      });
    }

    return res.status(statusCodes.BAD_REQUEST).json({
      message: error.message || "Failed to create customer",
      error,
    });
  }
});

export const updateCustomer = catchAsync(async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, phone, email } = req.body;

    if (phone) {
      const existing = await Customer.findOne({ phone, _id: { $ne: id } });
      if (existing) {
        return res.status(statusCodes.CONFLICT).json({
          message: "Another customer with this phone number already exists",
        });
      }
    }

    const customer = await Customer.findByIdAndUpdate(
      id,
      { $set: { name, phone, email } },
      { new: true, runValidators: true },
    );

    if (!customer) {
      return res.status(statusCodes.NOT_FOUND).json({ message: "Customer not found" });
    }

    return res.status(statusCodes.OK).json({
      message: "Customer updated successfully",
      data: customer,
    });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(statusCodes.CONFLICT).json({
        message: "Another customer with this phone number already exists",
      });
    }

    return res.status(statusCodes.BAD_REQUEST).json({
      message: error.message || "Failed to update customer",
      error,
    });
  }
});

export const deleteCustomer = catchAsync(async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const customer = await Customer.findByIdAndDelete(id);

    if (!customer) {
      return res.status(statusCodes.NOT_FOUND).json({ message: "Customer not found" });
    }

    return res.status(statusCodes.OK).json({ message: "Customer deleted successfully" });
  } catch (error: any) {
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Failed to delete customer",
      error,
    });
  }
});
