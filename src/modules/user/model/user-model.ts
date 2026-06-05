import mongoose, { Document, Model } from "mongoose";

const userTypes = ["normal", "temp", "admin", "superAdmin", "support", "owner"] as const;

export interface IUser extends Document {
  email: string;
  fullName?: string;
  username: string;
  password?: string;
  otp?: string;
  otpExpires?: Date;
  dob?: string;
  phone?: string;
  gender?: "Male" | "Female" | "Other" | string;
  image?: string;
  coverImage?: string;
  city?: string;
  bio?: string;
  location?: {
    type: "Point";
    coordinates: [number, number];
  };
  address?: string;
  country?: string;
  zip?: string;
  device?: string;
  type?: (typeof userTypes)[number];
  platform?: string;
  channels?: string[];
  isVerified?: boolean;
  language?: "en" | "ar" | "fr" | "sp" | string;
  createdAt?: Date;
  updatedAt?: Date;
  currency?: string;
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
    fullName: {
      type: String,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 8,
    },
    bio: String,
    phone: String,
    otp: String,
    otpExpires: Date,
    city: {
      type: String,
      trim: true,
    },
    language: {
      type: String,
      enum: ["en", "ar", "fr", "sp"],
      default: "en",
    },
    dob: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
      },
      coordinates: {
        type: [Number],
      },
    },
    address: String,
    country: String,
    zip: String,
    image: String,
    coverImage: String,
    device: String,
    platform: String,
    type: {
      type: String,
      enum: userTypes,
      default: "normal",
    },
    channels: [String],
    currency: {
      type: String,
      default: "USD",
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
