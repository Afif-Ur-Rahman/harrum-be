import crypto from "crypto";

import { AUTH_CONFIG } from "@/config";

export const generateOtp = () => {
  const otp = crypto.randomInt(100000, 999999); // Generates a 6-digit numeric OTP

  const otpExpires = new Date(Date.now() + AUTH_CONFIG.OTP_EXPIRES_IN);
  return { otpExpires, otp: otp.toString() };
};

export const otpService = {
  generateOtp,
};
