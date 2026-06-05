import mongoose, { Schema, Document } from "mongoose";

export interface IFollow extends Document {
  follower: mongoose.Types.ObjectId;
  following: mongoose.Types.ObjectId;
  type: "User" | "Pet";
  createdAt: Date;
  updatedAt: Date;
}

const followSchema = new Schema<IFollow>(
  {
    follower: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    following: {
      type: Schema.Types.ObjectId,
      refPath: "type",
      required: true,
    },
    type: {
      type: String,
      enum: ["User", "Pet"],
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// Compound index to ensure unique follows
followSchema.index({ follower: 1, following: 1, type: 1 }, { unique: true });
// Needed for querying followers of a user (following field alone)
followSchema.index({ following: 1 });

export const Follow = mongoose.model<IFollow>("Follow", followSchema);
