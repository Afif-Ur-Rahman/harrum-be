import mongoose, { Document, Model } from "mongoose";

export interface IUser extends Document {
  email: string;
  username: string;
  password?: string;
  otp?: string;
  otpExpires?: Date;
  type?: string;
  createdAt?: Date;
  updatedAt?: Date;
  rememberMe?: boolean;
}

interface IUserMethods {
  toJSON(): any;
}

type UserModel = Model<IUser, object, IUserMethods>;

const userSchema = new mongoose.Schema<IUser, UserModel>(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    username: {
      type: String,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 8,
    },
    otp: String,
    otpExpires: Date,
    type: {
      type: String,
      default: "owner",
    },
    rememberMe: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);
userSchema.index({ location: "2dsphere" });
userSchema.index({ type: 1, createdAt: -1 });

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

export const User = mongoose.model<IUser, UserModel>("User", userSchema);
