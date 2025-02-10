import { AUTH_CONFIG } from "@/config";
import crypto from "crypto";

export const generateOtp = () => {
  const otp = crypto.randomInt(100000, 999999); // Generates a 6-digit numeric OTP

  const otpExpires = new Date(Date.now() + AUTH_CONFIG.OTP_EXPIRES_IN);
  return { otpExpires, otp: otp.toString() };
};

export default {
  generateOtp,
};
