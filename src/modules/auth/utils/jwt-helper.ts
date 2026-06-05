import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import { JWT_SECRET } from "@/constants";

export type AccountType = "owner" | "worker" | "accountant" | "user";

interface JwtPayload {
  id: string;
  email: string;
  role: string;
  accountType: AccountType;
}

const epmloyeeTypes: AccountType[] = ["worker", "accountant"];

export const generateToken = (
  account: { _id: any; email: string; type?: string },
  rememberMe: boolean = false,
): string => {
  let accountType: AccountType;
  if (account.type === "owner" || account.type === "temp") {
    accountType = "owner";
  } else if (epmloyeeTypes.includes(account.type as AccountType)) {
    accountType = account.type as AccountType;
  } else {
    accountType = "user";
  }

  const payload: JwtPayload = {
    id: (account._id as mongoose.Types.ObjectId).toString(),
    email: account.email,
    role: account.type || "normal",
    accountType,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: rememberMe ? "7d" : "1d",
  });
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
};
