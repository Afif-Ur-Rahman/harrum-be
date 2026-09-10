import mongoose, { Document, Model } from "mongoose";

export type PaymentMethod = "cash" | "online";

export interface IReceipt extends Document {
  customer: mongoose.Types.ObjectId;
  amount: number;
  note?: string;
  paymentMethod: PaymentMethod;
  createdBy: mongoose.Types.ObjectId;
}

type ReceiptModel = Model<IReceipt>;

const receiptSchema = new mongoose.Schema<IReceipt, ReceiptModel>(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: [true, "Customer is required"],
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0.01, "Amount must be greater than 0"],
    },
    note: {
      type: String,
      trim: true,
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "online"],
      required: [true, "Payment method is required"],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Created by is required"],
    },
  },
  {
    timestamps: true,
  },
);

receiptSchema.index({ customer: 1, createdAt: -1 });

export const Receipt = mongoose.model<IReceipt, ReceiptModel>("Receipt", receiptSchema);
