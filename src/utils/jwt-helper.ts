import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import { JWT_SECRET } from "@/constants";
import { IUser } from "@/modules/user/model";

interface JwtPayload {
  id: string;
  email: string;
  role: string;
}

export const generateToken = (user: IUser): string => {
  const payload: JwtPayload = {
    id: (user._id as mongoose.Types.ObjectId).toString(),
    email: user.email,
    role: user.type || "normal",
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: "7d",
  });
};

export const generateSettingSecret = (secretKey: string) => {
  const payload = { secretKey };

  return jwt.sign(payload, JWT_SECRET);
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
};
