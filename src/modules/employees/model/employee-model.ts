import mongoose, { Document } from "mongoose";

export type EmployeeRole = "salesman" | "accountant";

export interface IEmployee extends Document {
  email: string;
  password?: string;
  username: string;
  type: EmployeeRole;
  phone: string;
  guardianName: string;
  guardianPhone: string;
  permanentAddress: string;
  currentAddress: string;
  isDeleted?: boolean;
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

    username: {
      type: String,
      required: [true, "Username is required"],
      trim: true,
    },

    type: {
      type: String,
      enum: ["salesman", "accountant"],
      required: true,
    },

    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },

    guardianName: {
      type: String,
      required: [true, "Father/Guardian name is required"],
      trim: true,
    },

    guardianPhone: {
      type: String,
      required: [true, "Father/Guardian number is required"],
      trim: true,
    },

    permanentAddress: {
      type: String,
      required: [true, "Permanent address is required"],
      trim: true,
    },

    currentAddress: {
      type: String,
      required: [true, "Current address is required"],
      trim: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

employeeSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

export const Employee = mongoose.model<IEmployee>("Employee", employeeSchema);
