import { Request, Response } from "express";

import { statusCodes } from "@/constants";
import { catchAsync } from "@/utils";

import { EXPENSE_CATEGORIES, Expense } from "../model";

export const getExpenses = catchAsync(async (req: Request, res: Response) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.max(Number(req.query.limit) || 30, 1);

    const categories = ([] as string[])
      .concat((req.query.category as string | string[]) || [])
      .map((c) => c.trim())
      .filter(Boolean);

    const paymentMethods = ([] as string[])
      .concat((req.query.paymentMethod as string | string[]) || [])
      .map((m) => m.trim())
      .filter(Boolean);

    const from = (req.query.from as string)?.trim();
    const to = (req.query.to as string)?.trim();

    const filter: Record<string, unknown> = {};

    if (categories.length) {
      filter.category = { $in: categories };
    }

    if (paymentMethods.length) {
      filter.paymentMethod = { $in: paymentMethods };
    }

    if (from || to) {
      const dateFilter: Record<string, Date> = {};
      if (from) dateFilter.$gte = new Date(`${from}T00:00:00.000Z`);
      if (to) dateFilter.$lte = new Date(`${to}T23:59:59.999Z`);
      filter.date = dateFilter;
    }

    const skip = (page - 1) * limit;

    const [expenses, total] = await Promise.all([
      Expense.find(filter)
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .populate("createdBy", "username email"),
      Expense.countDocuments(filter),
    ]);

    return res.status(statusCodes.OK).json({
      message: "Expenses fetched successfully",
      data: {
        expenses,
        total,
        page,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error: any) {
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Failed to fetch expenses",
      error,
    });
  }
});

export const createExpense = catchAsync(async (req: Request, res: Response) => {
  try {
    const createdBy = req.user;
    const createdByType = req.user?.type === "owner" ? "User" : "Employee";
    const { amount, note, category, paymentMethod, date } = req.body;

    if (!amount || !category) {
      return res.status(statusCodes.BAD_REQUEST).json({
        message: "Amount and category are required",
      });
    }

    if (!EXPENSE_CATEGORIES.includes(category)) {
      return res.status(statusCodes.BAD_REQUEST).json({
        message: `Invalid category. Allowed categories are: ${EXPENSE_CATEGORIES.join(", ")}`,
      });
    }

    const parsedAmount = Number(amount);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(statusCodes.BAD_REQUEST).json({
        message: "Amount must be greater than 0",
      });
    }

    if (paymentMethod && !["cash", "online"].includes(paymentMethod)) {
      return res.status(statusCodes.BAD_REQUEST).json({
        message: "Payment method must be either cash or online",
      });
    }

    const expense = await Expense.create({
      amount: parsedAmount,
      note: String(note).trim(),
      category,
      paymentMethod: paymentMethod || "cash",
      date: date ? new Date(date) : new Date(),
      createdBy: createdBy?._id,
      createdByType,
    });

    return res.status(statusCodes.CREATED).json({
      message: "Expense created successfully",
      data: { ...expense, createdBy },
    });
  } catch (error: any) {
    return res.status(statusCodes.BAD_REQUEST).json({
      message: error.message || "Failed to create expense",
      error,
    });
  }
});

export const updateExpense = catchAsync(async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, note, category, paymentMethod, date } = req.body;

    if (category !== undefined && !EXPENSE_CATEGORIES.includes(category)) {
      return res.status(statusCodes.BAD_REQUEST).json({
        message: `Invalid category. Allowed categories are: ${EXPENSE_CATEGORIES.join(", ")}`,
      });
    }

    if (paymentMethod && !["cash", "online"].includes(paymentMethod)) {
      return res.status(statusCodes.BAD_REQUEST).json({
        message: "Payment method must be either cash or online",
      });
    }

    const updateData: Record<string, unknown> = {};

    if (amount !== undefined) {
      const parsedAmount = Number(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(statusCodes.BAD_REQUEST).json({
          message: "Amount must be greater than 0",
        });
      }
      updateData.amount = parsedAmount;
    }

    if (note !== undefined) updateData.note = String(note).trim();
    if (category !== undefined) updateData.category = category;
    if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
    if (date !== undefined) updateData.date = new Date(date);

    const expense = await Expense.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true },
    );

    if (!expense) {
      return res.status(statusCodes.NOT_FOUND).json({ message: "Expense not found" });
    }

    return res.status(statusCodes.OK).json({
      message: "Expense updated successfully",
      data: expense,
    });
  } catch (error: any) {
    return res.status(statusCodes.BAD_REQUEST).json({
      message: error.message || "Failed to update expense",
      error,
    });
  }
});

export const deleteExpense = catchAsync(async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const expense = await Expense.findByIdAndDelete(id);

    if (!expense) {
      return res.status(statusCodes.NOT_FOUND).json({ message: "Expense not found" });
    }

    return res.status(statusCodes.OK).json({ message: "Expense deleted successfully" });
  } catch (error: any) {
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Failed to delete expense",
      error,
    });
  }
});
