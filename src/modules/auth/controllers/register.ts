import { Request, Response } from "express";

import { sendEmail } from "@/config";
import { getRedisClient } from "@/config/redis";
import { statusCodes } from "@/constants";
import { SERVER_URL } from "@/constants/env";
import { User } from "@/modules/user/model/user-model";
import { otpService } from "@/services";
import { otpEmailTemplate } from "@/templates";
import { catchAsync } from "@/utils";

import { hashPassword, generateToken } from "../utils";

export const register = catchAsync(async (req: Request, res: Response): Promise<Response> => {
  try {
    const { email, password, phone } = req.body;

    if (!email || !password) {
      return res
        .status(statusCodes.BAD_REQUEST)
        .json({ message: "Please provide all required fields" });
    }

    const existing = await User.findOne({ email, type: { $ne: "temp" } });
    const { otpExpires, otp } = otpService.generateOtp();

    if (existing) {
      return res.status(statusCodes.BAD_REQUEST).json({ message: "User already exists" });
    }

    const hashedPassword = await hashPassword(password);
    const tempUser = await User.findOneAndUpdate(
      { email, type: "temp" },
      { password: hashedPassword, otp, otpExpires, phone },
    );

    if (!tempUser) {
      await new User({
        email,
        password: hashedPassword,
        type: "temp",
        otp,
        otpExpires,
        phone,
      }).save();
    }

    const mailInfo = {
      to: email,
      subject: "Please use this OTP to verify your email",
      html: otpEmailTemplate({
        otp,
        recipientName: email.split("@")[0],
        copyUrl: `${SERVER_URL}/auth/register?email=${encodeURIComponent(email)}&otp=${otp}`,
        headline: "Verify your Invo account",
        subheading:
          "Enter the code below in the app to unlock your personalized onboarding checklist.",
      }),
    };

    await sendEmail(mailInfo);

    return res.status(statusCodes.CREATED).json({
      message: `An OTP is sent to your email: ${email}`,
    });
  } catch (error: any) {
    if (error?.code === 11000) {
      return res.status(statusCodes.FORBIDDEN).json({
        message: "Duplicate User Error",
        ...error.keyValue,
      });
    }

    return res.status(statusCodes.FORBIDDEN).json({
      message: error.message || "Error while registering",
      error,
    });
  }
});

export const registerProfileUpdate = catchAsync(
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const { email, otp, username, fullName, location, address } = req.body;

      const user = await User.findOne({
        email,
        otp,
        otpExpires: { $gt: Date.now() },
        type: "temp",
      });

      if (!user) {
        return res.status(statusCodes.BAD_REQUEST).json({ message: "Invalid OTP" });
      }

      let parsedLocation: { latitude: number; longitude: number } | null = null;
      if (location) {
        parsedLocation = typeof location === "string" ? JSON.parse(location) : location;
      }

      const updateData: Record<string, any> = {
        type: "owner",
        username: username || email.split("@")[0],
        fullName: fullName || undefined,
        address: address || undefined,
        otp: undefined,
        otpExpires: undefined,
      };

      if (parsedLocation?.longitude && parsedLocation?.latitude) {
        updateData.location = {
          type: "Point",
          coordinates: [parsedLocation.longitude, parsedLocation.latitude],
        };
      }

      if (req.body.image) updateData.image = req.body.image;
      if (req.body.coverImage) updateData.coverImage = req.body.coverImage;

      const updatedUser = await User.findOneAndUpdate(
        { email, otp, otpExpires: { $gt: Date.now() } },
        updateData,
        { new: true },
      );

      if (!updatedUser) {
        return res.status(statusCodes.NOT_FOUND).json({ message: "User not found" });
      }

      const token = generateToken(updatedUser);
      const data = { ...updatedUser.toObject(), token };
      return res.status(statusCodes.CREATED).json({
        message: "Profile updated successfully",
        data,
      });
    } catch (error: Error | any) {
      return res.status(statusCodes.FORBIDDEN).json({
        message: error.message || "Error while updating profile",
        error,
      });
    }
  },
);

export const registerOtpVerify = catchAsync(
  async (req: Request, res: Response): Promise<Response> => {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(statusCodes.BAD_REQUEST).json({ message: "Email and OTP are required" });
    }

    try {
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(statusCodes.NOT_FOUND).json({ message: "Email not found" });
      }

      if (user.otp !== otp || !user.otpExpires || user.otpExpires.getTime() < Date.now()) {
        return res.status(statusCodes.BAD_REQUEST).json({ message: "Invalid or expired OTP" });
      }

      return res.status(statusCodes.OK).json({ message: "OTP is valid" });
    } catch (error: Error | any) {
      return res
        .status(statusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: "Internal server error", error: error.message });
    }
  },
);

export const otpResend = catchAsync(async (req: Request, res: Response): Promise<Response> => {
  const { email } = req.body;

  if (!email) {
    return res.status(statusCodes.BAD_REQUEST).json({ message: "Email is required" });
  }

  try {
    const redis = getRedisClient();
    const cooldownKey = `otp_resend:${email}`;

    if (redis && redis.status === "ready") {
      const ttl = await redis.ttl(cooldownKey);
      if (ttl > 0) {
        return res.status(statusCodes.TOO_MANY_REQUESTS).json({
          message: `Please wait ${ttl} second${ttl !== 1 ? "s" : ""} before requesting a new OTP.`,
          retryAfter: ttl,
        });
      }
      await redis.set(cooldownKey, "1", "EX", 60);
    }

    const { otpExpires, otp } = otpService.generateOtp();

    const user = await User.findOneAndUpdate({ email }, { otpExpires, otp });
    if (!user) {
      return res.status(statusCodes.NOT_FOUND).json({ message: "Email not found" });
    }

    const mailInfo = {
      to: email,
      subject: "Please use this OTP to verify your email",
      html: otpEmailTemplate({
        otp,
        recipientName: email.split("@")[0],
        copyUrl: `${SERVER_URL}/auth/register?email=${encodeURIComponent(email)}&otp=${otp}`,
        headline: "Here's your fresh verification code",
        subheading: "We generated a new code so you can pick up onboarding where you left off.",
      }),
    };

    await sendEmail(mailInfo);

    return res
      .status(statusCodes.CREATED)
      .json({ message: `An OTP is sent to your email: ${email}` });
  } catch (error: Error | any) {
    return res
      .status(statusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Internal server error", error: error.message });
  }
});

export const checkUsername = catchAsync(async (req: Request, res: Response): Promise<Response> => {
  const { username } = req.query;

  if (!username) {
    return res.status(statusCodes.BAD_REQUEST).json({ message: "Username is required" });
  }

  try {
    const exists = await User.findOne({ username });
    if (exists) {
      return res
        .status(statusCodes.OK)
        .json({ success: false, message: "Username is already taken" });
    }

    return res.status(statusCodes.OK).json({ success: true, message: "Username is available" });
  } catch (error: any) {
    return res
      .status(statusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Error checking username availability", error });
  }
});
