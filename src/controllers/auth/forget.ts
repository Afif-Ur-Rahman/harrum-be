import { Request, Response } from "express";
import { statusCodes } from "@/constants/statusCodes";
import { User } from "@/models/userModel";
import { hashPassword } from "@/utils/passwordHelper";
import { sendEmail } from "@/utils/emailHelper";
import otpService from "@/services/otpService";

export const forgotPasswordOtp = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { email } = req.body;

  if (!email) {
    return res
      .status(statusCodes.BAD_REQUEST)
      .json({ message: "Email is required" });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(statusCodes.NOT_FOUND)
        .json({ message: "User not found" });
    }

    const { otp, otpExpires } = otpService.generateOtp();
    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    const mailInfo = {
      to: email,
      subject: "Password Reset OTP",
      html: `<p>Your OTP is: ${otp}</p>`,
    };
    await sendEmail(mailInfo);

    return res
      .status(statusCodes.OK)
      .json({ message: "OTP sent to your email" });
  } catch (error) {
    return res
      .status(statusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Error sending OTP", error });
  }
};

export const validateOtp = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res
      .status(statusCodes.BAD_REQUEST)
      .json({ message: "Email and OTP are required" });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(statusCodes.NOT_FOUND)
        .json({ message: "User not found" });
    }

    if (
      user.otp !== otp ||
      !user.otpExpires ||
      user.otpExpires.getTime() < Date.now()
    ) {
      return res
        .status(statusCodes.UNAUTHORIZED)
        .json({ message: "Invalid or expired OTP" });
    }

    return res.status(statusCodes.OK).json({ message: "OTP is valid" });
  } catch (error: Error | any) {
    return res
      .status(statusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Internal server error", error: error.message });
  }
};

export const resetPassword = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res
      .status(statusCodes.BAD_REQUEST)
      .json({ message: "Email, OTP, and new password are required" });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(statusCodes.NOT_FOUND)
        .json({ message: "User not found" });
    }

    if (
      user.otp !== otp ||
      !user.otpExpires ||
      user.otpExpires.getTime() < Date.now()
    ) {
      return res
        .status(statusCodes.UNAUTHORIZED)
        .json({ message: "Invalid or expired OTP" });
    }

    const hashedPassword = await hashPassword(newPassword);
    user.password = hashedPassword;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    return res
      .status(statusCodes.OK)
      .json({ message: "Password reset successfully" });
  } catch (error) {
    return res
      .status(statusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Error resetting password", error });
  }
};
