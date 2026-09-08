import mongoose, { Document, Model } from "mongoose";

export interface ICustomer extends Document {
  name: string;
  phone: string;
  email?: string;
  remainingAmount: number;
}

type CustomerModel = Model<ICustomer>;

const customerSchema = new mongoose.Schema<ICustomer, CustomerModel>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Phone is required"],
      trim: true,
      unique: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    remainingAmount: {
      type: Number,
      default: 0,
      min: [0, "Remaining amount cannot be negative"],
    },
  },
  {
    timestamps: true,
  },
);

customerSchema.index({ phone: 1 }, { unique: true });
customerSchema.index({ name: 1 });

export const Customer = mongoose.model<ICustomer, CustomerModel>("Customer", customerSchema);
