import { Router } from "express";

import {
  register,
  registerOtpVerify,
  registerProfileUpdate,
  otpResend,
  checkUsername,
  login,
  forgotPasswordLink,
  forgotPasswordOtp,
  validateOtp,
  resetPassword,
} from "@/modules/auth/controllers";

const router = Router();

router.post("/register", register);
router.post("/register/profile-update", registerProfileUpdate);
router.post("/register/otp-verify", registerOtpVerify);
router.post("/register/username", checkUsername);
router.post("/otp-resend", otpResend);

router.post("/login", login);
router.post("/forgot-password-link", forgotPasswordLink); // Request password reset link
router.post("/forgot-password-otp", forgotPasswordOtp);
router.post("/validate-otp", validateOtp);
router.post("/reset-password", resetPassword);

export { router as authRoutes };
