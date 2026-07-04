import { Request, Response } from "express";

import { statusCodes } from "@/constants";
import { Employee } from "@/models/employee-model";
import { User } from "@/modules/user/model";
import { catchAsync } from "@/utils/catch-async";

import { comparePasswords, generateToken } from "../utils";

interface LoginRequest {
  email: string;
  password: string;
  device?: string;
  platform: string;
  rememberMe?: boolean;
}

export const login = catchAsync(
  async (req: Request<object, object, LoginRequest>, res: Response): Promise<Response> => {
    try {
      const { email, password, rememberMe } = req.body;
      // Try Owner first, then Employee
      const owner = await User.findOne({ email, type: "owner" }).select("+password");
      const employee = !owner
        ? await Employee.findOne({ email }).select("+password +tempPassword")
        : null;

      const account = owner ?? employee;

      if (!account || !("password" in account) || !account.password) {
        return res.status(statusCodes.NOT_FOUND).json({ message: "Invalid credentials" });
      }

      const mainMatch = await comparePasswords(password, account.password);

      if (!mainMatch) {
        return res.status(statusCodes.NOT_FOUND).json({ message: "Invalid credentials" });
      }

      const token = generateToken(account as any, rememberMe || false);
      const accountObj = account.toObject();
      delete (accountObj as any).password;
      delete (accountObj as any).tempPassword;
      delete (accountObj as any).__v;

      return res.status(statusCodes.OK).json({
        message: "Login successful. Welcome to the App. 😀🎊 !",
        data: { ...accountObj, token },
      });
    } catch (error: Error | any) {
      return res
        .status(statusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: error.message || "Error logging in", error });
    }
  },
);
