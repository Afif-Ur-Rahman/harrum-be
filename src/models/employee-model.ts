import mongoose, { Document } from "mongoose";

export type EmployeeRole = "worker" | "accountant";

export interface IEmployee extends Document {
  email: string;
  password?: string;
  username: string;
  fullName?: string;
  image?: string;
  type: EmployeeRole;
  owner: mongoose.Types.ObjectId;
  tempPassword?: string;
  tempPasswordExpiry?: Date;
  device?: string;
  platform?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const employeeSchema = new mongoose.Schema<IEmployee>(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      minlength: 8,
    },
    username: { type: String },
    fullName: { type: String },
    image: { type: String },
    type: {
      type: String,
      enum: ["worker", "accountant"],
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tempPassword: { type: String },
    tempPasswordExpiry: { type: Date },
    device: { type: String },
    platform: { type: String },
  },
  { timestamps: true },
);

employeeSchema.index({ owner: 1, type: 1 });

employeeSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.tempPassword;
  delete obj.__v;
  return obj;
};

export const Employee = mongoose.model<IEmployee>("Employee", employeeSchema);
