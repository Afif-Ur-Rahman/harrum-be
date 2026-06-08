import mongoose, { Document } from "mongoose";

export type EmployeeRole = "worker" | "accountant";

export interface IEmployee extends Document {
  email: string;
  password?: string;
  username: string;
  type: EmployeeRole;
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
    username: { type: String },
    type: {
      type: String,
      enum: ["worker", "accountant"],
      required: true,
    },
    isDeleted: { type: Boolean, default: false },
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
