import mongoose, { Document, Model } from "mongoose";

export type BillCreatorType = "User" | "Employee";

export interface IBill extends Document {
  vendor: mongoose.Types.ObjectId;
  billId: string;
  note?: string;
  amount: number;
  createdBy: mongoose.Types.ObjectId;
  createdByType: BillCreatorType;
}

type BillModel = Model<IBill>;

const billSchema = new mongoose.Schema<IBill, BillModel>(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: [true, "Vendor is required"],
    },
    billId: {
      type: String,
      required: [true, "Bill ID is required"],
      trim: true,
    },
    note: {
      type: String,
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0.01, "Amount must be greater than 0"],
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

billSchema.index({ vendor: 1, billId: 1 }, { unique: true });
billSchema.index({ vendor: 1, createdAt: -1 });

export const Bill = mongoose.model<IBill, BillModel>("Bill", billSchema);
