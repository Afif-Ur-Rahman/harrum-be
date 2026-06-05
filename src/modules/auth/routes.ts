import { Router } from "express";

import { authMiddleware, uploadMiddleware } from "@/middlewares";
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
  logout,
  googleLogin,
  appleLogin,
} from "@/modules/auth/controllers";

const uploadHelper = uploadMiddleware({
  destinationPath: "uploads/profiles",
  fields: [
    { name: "image", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ],
  isOptional: true,
});

const router = Router();

router.post("/register", register);
router.post("/register/profile-update", uploadHelper, registerProfileUpdate);
router.post("/register/otp-verify", registerOtpVerify);
router.post("/register/username", checkUsername);
router.post("/otp-resend", otpResend);

router.post("/login", login);
router.post("/forgot-password-link", forgotPasswordLink); // Request password reset link
router.post("/forgot-password-otp", forgotPasswordOtp);
router.post("/validate-otp", validateOtp);
router.post("/reset-password", resetPassword);

// Social login routes
router.post("/google-login", googleLogin); // Google login
router.post("/apple-login", appleLogin); // Apple login

// Protected routes
router.use(authMiddleware);
router.post("/logout", logout);

export { router as authRoutes };
