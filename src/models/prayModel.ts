import mongoose, { Document } from "mongoose";

export interface IPray extends Document {
  reason: string;
  owner: mongoose.Types.ObjectId;
  unread: string[];
  read: string[];
  status: "Pending" | "Approved" | "Rejected";
}

const praySchema = new mongoose.Schema<IPray>(
  {
    reason: { type: String, required: true },
    owner: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: true,
    },
    unread: [{ type: String }],
    read: [{ type: String }],
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
  },
  {
    timestamps: true,
  }
);

export const Pray = mongoose.model<IPray>("Pray", praySchema);
