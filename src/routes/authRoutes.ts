import { Router } from "express";

import {
  register,
  login,
  forgotPasswordOtp,
  validateOtp,
  resetPassword,
} from "@/controllers";

const router = Router();

router.post("/register", (req, res, next) => {
  register(req, res).catch(next);
});

router.post("/login", (req, res, next) => {
  login(req, res).catch(next);
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

export { router as authRoutes };
