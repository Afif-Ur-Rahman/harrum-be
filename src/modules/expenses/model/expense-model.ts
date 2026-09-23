import mongoose, { Document, Model } from "mongoose";

export type ExpenseCreatorType = "User" | "Employee";
export type ExpensePaymentMethod = "cash" | "online";
export type ExpenseCategory =
  | "Rent"
  | "Utilities"
  | "Salary"
  | "Transport"
  | "Maintenance"
  | "Misc";

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "Rent",
  "Utilities",
  "Salary",
  "Transport",
  "Maintenance",
  "Misc",
];

export interface IExpense extends Document {
  amount: number;
  note?: string;
  category: ExpenseCategory;
  paymentMethod: ExpensePaymentMethod;
  date: Date;
  createdBy: mongoose.Types.ObjectId;
  createdByType: ExpenseCreatorType;
}

type ExpenseModel = Model<IExpense>;

const expenseSchema = new mongoose.Schema<IExpense, ExpenseModel>(
  {
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0.01, "Amount must be greater than 0"],
    },
    note: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      enum: EXPENSE_CATEGORIES,
      required: [true, "Category is required"],
      default: "Misc",
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "online"],
      required: [true, "Payment method is required"],
      default: "cash",
    },
    date: {
      type: Date,
      default: Date.now,
    },
    createdByType: {
      type: String,
      enum: ["User", "Employee"],
      required: [true, "Created by type is required"],
      default: "User",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "createdByType",
      required: [true, "Created by is required"],
    },
  },
  {
    timestamps: true,
  },
);

expenseSchema.index({ date: -1 });
expenseSchema.index({ category: 1 });

export const Expense = mongoose.model<IExpense, ExpenseModel>("Expense", expenseSchema);
