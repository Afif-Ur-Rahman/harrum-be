import { Request, Response } from "express";

import { statusCodes } from "@/constants/statusCodes";
import { IUser, User } from "@/models";
import { hashPassword } from "@/utils/passwordHelper";
import { fileHelper } from "@/utils/fileHelper";
import otpService from "@/services/otpService";
import { sendEmail } from "@/utils/emailHelper";
import { generateToken } from "@/utils/jwtHelper";

export const register = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { email, password, username }: IUser = req.body;

    if (!email || !password) {
      return res
        .status(statusCodes.BAD_REQUEST)
        .json({ message: "Please provide all required fields" });
    }
    const hashedPassword = await hashPassword(password);

    const user = new User({
      email,
      password: hashedPassword,
      username,
      type: "TempUser",
    });
    const { otpExpires, otp } = otpService.generateOtp();
    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    const mailInfo = {
      to: email,
      subject: "Please use this OTP to verify your email",
      html: `<p>Your OTP is: ${otp}</p>`,
    };

    await sendEmail(mailInfo);

    return res
      .status(statusCodes.CREATED)
      .json({ message: `An OTP is sent to your email: ${email}` });
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
};

export const registerProfileUpdate = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const {
      email,
      city,
      dob,
      fullName,
      bio,
      device,
      platform,
    }: IUser = req.body;

    let s3_img: string = "";

    if (req.file) {
      s3_img = await fileHelper.getFileUrl(req.file);
    }

    const updateData = {
      city,
      dob,
      image: s3_img || undefined,
      fullName,
      bio,
      type: "normal" as "normal",
      device,
      platform,
    };

    const user = await User.findOneAndUpdate({ email }, updateData, {
      new: true,
    });

    if (!user) {
      return res
        .status(statusCodes.NOT_FOUND)
        .json({ message: "User not found" });
    }

    const token = generateToken({ id: user._id });

    const data = { ...user.toObject(), token };
    if ("password" in data) {
      delete data.password;
    }
    return res
      .status(statusCodes.CREATED)
      .json({ message: "Profile updated successfully", data });
  } catch (error: any) {
    if (req.file) {
      fileHelper.deleteFile(req.file.path);
    }

    return res.status(statusCodes.FORBIDDEN).json({
      message: error.message || "Error while updating profile",
      error,
    });
  }
};

export const registerOtpVerify = async (
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
        .json({ message: "email not found" });
    }
    const token = generateToken({ id: user._id });
    if (
      user.otp !== otp ||
      !user.otpExpires ||
      user.otpExpires.getTime() < Date.now()
    ) {
      return res
        .status(statusCodes.UNAUTHORIZED)
        .json({ message: "Invalid or expired OTP", token });
    }

    return res.status(statusCodes.OK).json({ message: "OTP is valid" });
  } catch (error: Error | any) {
    return res
      .status(statusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Internal server error", error: error.message });
  }
};

export const registerOtpResend = async (
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
    const { otpExpires, otp } = otpService.generateOtp();

    const user = await User.findOneAndUpdate({ email }, { otpExpires, otp });
    if (!user) {
      return res
        .status(statusCodes.NOT_FOUND)
        .json({ message: "email not found" });
    }

    const mailInfo = {
      to: email,
      subject: "Please use this OTP to verify your email",
      html: `<p>Your OTP is: ${otp}</p>`,
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
};
