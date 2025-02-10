import { Router } from "express";
import { fileHelper } from "@/utils";

import {
  register,
  registerOtpVerify,
  registerProfileUpdate,
  registerOtpResend,
  login,
  forgotPasswordLink,
  forgotPasswordOtp,
  validateOtp,
  resetPassword,
  logout,

  // social signup/login controllers
  googleLogin,
  appleLogin,
} from "@/controllers";
import { authMiddleware } from "@/middlewares";

const uploadHandler = fileHelper
  .uploadFile("./uploads/profiles")
  .single("image");
const router = Router();

router.post("/register", (req, res, next) => {
  register(req, res).catch(next);
});
router.post("/register/profile-update", uploadHandler, (req, res, next) => {
  registerProfileUpdate(req, res).catch(next);
});
router.post("/register/otp-verify", (req, res, next) => {
  registerOtpVerify(req, res).catch(next);
});
router.post("/register/otp-resend", (req, res, next) => {
  registerOtpResend(req, res).catch(next);
});

router.post("/login", (req, res, next) => {
  login(req, res).catch(next);
});
router.post("/forgot-password-link", (req, res, next) => {
  forgotPasswordLink(req, res).catch(next);
});
router.post("/forgot-password-otp", (req, res, next) => {
  forgotPasswordOtp(req, res).catch(next);
});
router.post("/validate-otp", (req, res, next) => {
  validateOtp(req, res).catch(next);
});
router.post("/reset-password", (req, res, next) => {
  resetPassword(req, res).catch(next);
});
router.post("/logout", authMiddleware, (req, res, next) => {
  logout(req, res).catch(next);
});

// social signup/login routes
router.post("/google-login", (req, res, next) => {
  googleLogin(req, res).catch(next);
});
router.post("/apple-login", (req, res, next) => {
  appleLogin(req, res).catch(next);
});

export { router as authRoutes };
