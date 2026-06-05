import mongoose, { Schema, Document } from "mongoose";

export interface IFriend extends Document {
  sender: mongoose.Types.ObjectId;
  receiver: mongoose.Types.ObjectId;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "BLOCKED";
  createdAt: Date;
  updatedAt: Date;
}

const friendSchema = new Schema<IFriend>(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "REJECTED", "BLOCKED"],
      default: "PENDING",
    },
  },
  {
    timestamps: true,
  },
);

// Compound index to ensure unique friend relationships
friendSchema.index({ sender: 1, receiver: 1 }, { unique: true });

export const Friend = mongoose.model<IFriend>("Friend", friendSchema);
