import mongoose, { Document, Model } from "mongoose";

export interface IUser extends Document {
  email: string;
  fullName?: string;
  username: string;
  password?: string;
  otp?: string;
  otpExpires?: Date;
  dob?: string;
  gender?: "male" | "female" | "other";
  image?: string;
  city?: string;
  bio?: string;
  device?: string;
  type?: "social" | "normal" | "TempUser";
  platform?: string;
}

interface IUserMethods {
  toJSON(): any;
}

type UserModel = Model<IUser, {}, IUserMethods>;

const userSchema = new mongoose.Schema<IUser, UserModel>(
  {
    email: {
      type: mongoose.Schema.Types.String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    username: {
      type: mongoose.Schema.Types.String,
      index: true,
    },
    fullName: {
      type: mongoose.Schema.Types.String,
    },
    password: {
      type: mongoose.Schema.Types.String,
      required: [true, "Password is required"],
      minlength: 6,
    },
    bio: {
      type: mongoose.Schema.Types.String,
      default: "",
    },
    otp: mongoose.Schema.Types.String,
    otpExpires: Date,
    city: {
      type: mongoose.Schema.Types.String,
      trim: true,
    },
    dob: {
      type: mongoose.Schema.Types.String,
    },
    gender: {
      type: mongoose.Schema.Types.String,
      enum: ["male", "female", "other"],
    },
    image: mongoose.Schema.Types.String,
    device: mongoose.Schema.Types.String,
    platform: mongoose.Schema.Types.String,
    type: {
      type: mongoose.Schema.Types.String,
      enum: ["social", "normal", "TempUser"],
      default: "normal",
    },
  },
  {
    timestamps: true,
  }
);

userSchema.methods.toJSON = function () {
  const obj = this.toObject({ versionKey: false });
  delete obj.password;
  return obj;
};

export const User = mongoose.model<IUser, UserModel>("User", userSchema);
