import mongoose, { Document, Model } from "mongoose";

export type PaymentMethod = "cash" | "online";
export type ReceiptPartyType = "Customer" | "Vendor";
export type ReceiptCreatorType = "User" | "Employee";

export interface IReceipt extends Document {
  party: mongoose.Types.ObjectId;
  type: ReceiptPartyType;
  amount: number;
  note?: string;
  paymentMethod: PaymentMethod;
  createdBy: mongoose.Types.ObjectId;
  createdByType: ReceiptCreatorType;
}

type ReceiptModel = Model<IReceipt>;

const receiptSchema = new mongoose.Schema<IReceipt, ReceiptModel>(
  {
    type: {
      type: String,
      enum: ["Customer", "Vendor"],
      required: [true, "Type is required"],
    },
    party: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "type",
      required: [true, "Party is required"],
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

receiptSchema.index({ party: 1, type: 1, createdAt: -1 });

export const Receipt = mongoose.model<IReceipt, ReceiptModel>("Receipt", receiptSchema);
