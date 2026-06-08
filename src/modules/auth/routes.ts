import { Router } from "express";

import { login, forgotPasswordOtp, validateOtp, resetPassword } from "@/modules/auth/controllers";

const router = Router();

router.post("/login", login);
router.post("/forgot-password-otp", forgotPasswordOtp);
router.post("/validate-otp", validateOtp);
router.post("/reset-password", resetPassword);

export { router as authRoutes };
