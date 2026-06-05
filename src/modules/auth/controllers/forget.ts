import { Request, Response } from "express";

import { sendEmail } from "@/config";
import { SERVER_URL } from "@/constants/env";
import { statusCodes } from "@/constants/statusCodes";
import { Employee } from "@/models/employee-model";
import { User } from "@/modules/user/model";
import { otpService } from "@/services";
import { otpEmailTemplate } from "@/templates";
import { catchAsync } from "@/utils/catch-async";

import { hashPassword, generateToken } from "../utils";

async function findAccountByEmail(email: string) {
  const owner = await User.findOne({ email, type: "owner" });
  if (owner) return owner;
  const employee = await Employee.findOne({ email });
  if (employee) return employee;
  return User.findOne({ email });
}

export const forgotPasswordLink = catchAsync(
  async (req: Request, res: Response): Promise<Response> => {
    const { email, callback } = req.body;

    try {
      let callbackUrl: URL;
      try {
        callbackUrl = new URL(callback);
        if (!["http:", "https:"].includes(callbackUrl.protocol)) throw new Error();
      } catch {
        return res.status(statusCodes.BAD_REQUEST).json({ message: "Invalid callback URL" });
      }

      const account = await findAccountByEmail(email);
      if (!account) {
        return res.status(statusCodes.NOT_FOUND).json({ message: "User not found" });
      }

      const token = generateToken(account as any);
      callbackUrl.searchParams.set("token", token);
      const resetLink = callbackUrl.toString();

      await sendEmail({
        to: email,
        subject: "Password Reset",
        html: `<p>Click here to reset your password: </p> <a href=${resetLink}>${resetLink}</a>`,
      });

      return res.status(statusCodes.OK).json({
        message: "Password reset link sent to your email that will expire in 1 hour",
      });
    } catch (error: Error | any) {
      return res
        .status(statusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: error.message || "Error sending password reset link", error });
    }
  },
);

export const forgotPasswordOtp = catchAsync(
  async (req: Request, res: Response): Promise<Response> => {
    const { email } = req.body;

    if (!email) {
      return res.status(statusCodes.BAD_REQUEST).json({ message: "Email is required" });
    }

    try {
      const account = await findAccountByEmail(email);
      if (!account) {
        return res.status(statusCodes.NOT_FOUND).json({ message: "User not found" });
      }

      const { otp, otpExpires } = otpService.generateOtp();
      (account as any).otp = otp;
      (account as any).otpExpires = otpExpires;
      await account.save();

      const mailInfo = {
        to: email,
        subject: "Password Reset OTP",
        html: otpEmailTemplate({
          otp,
          recipientName: email.split("@")[0],
          headline: "Use this code to reset your password",
          subheading:
            "Enter the OTP below to prove it's really you before creating a new password.",
          copyUrl: `${SERVER_URL}/auth/password-reset?email=${encodeURIComponent(email)}&otp=${otp}`,
        }),
      };
      await sendEmail(mailInfo);

      return res.status(statusCodes.OK).json({ message: "OTP sent to your email" });
    } catch (error: Error | any) {
      return res
        .status(statusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: error.message || "Error sending OTP", error });
    }
  },
);

export const validateOtp = catchAsync(async (req: Request, res: Response): Promise<Response> => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(statusCodes.BAD_REQUEST).json({ message: "Email and OTP are required" });
  }

  try {
    const account = await findAccountByEmail(email);
    if (!account) {
      return res.status(statusCodes.NOT_FOUND).json({ message: "User not found" });
    }

    const acc = account as any;
    if (acc.otp !== otp || !acc.otpExpires || acc.otpExpires.getTime() < Date.now()) {
      return res.status(statusCodes.BAD_REQUEST).json({ message: "Invalid or expired OTP" });
    }

    return res.status(statusCodes.OK).json({ message: "OTP is valid" });
  } catch (error: Error | any) {
    return res
      .status(statusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message || "Internal server error", error });
  }
});

export const resetPassword = catchAsync(async (req: Request, res: Response): Promise<Response> => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res
      .status(statusCodes.BAD_REQUEST)
      .json({ message: "Email, OTP, and new password are required" });
  }

  try {
    const account = await findAccountByEmail(email);
    if (!account) {
      return res.status(statusCodes.NOT_FOUND).json({ message: "User not found" });
    }

    const acc = account as any;
    if (acc.otp !== otp || !acc.otpExpires || acc.otpExpires.getTime() < Date.now()) {
      return res.status(statusCodes.NOT_FOUND).json({ message: "Invalid or expired OTP" });
    }

    acc.password = await hashPassword(newPassword);
    acc.otp = undefined;
    acc.otpExpires = undefined;
    await account.save();

    return res.status(statusCodes.OK).json({ message: "Password reset successfully" });
  } catch (error: Error | any) {
    return res
      .status(statusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message || "Error resetting password", error });
  }
});
