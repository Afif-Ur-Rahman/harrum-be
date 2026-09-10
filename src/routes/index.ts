import { Router } from "express";

import { rateLimiter } from "@/middlewares/security-middleware";
import {
  userRoutes,
  profileRoutes,
  stockRoutes,
  orderRoutes,
  customerRoutes,
  receiptRoutes,
} from "@/modules";
import { authRoutes } from "@/modules/auth/routes";
import { settingRoutes } from "@/modules/setting/routes";

import { dashboardRoutes } from "./dashboard-routes";
import { employeeRoutes } from "./employee-routes";

const router = Router();

router.get("/", (_req, res) => {
  res.json({ message: "Welcome to the Harrum Cloth House API" });
});

router.use("/api/auth", rateLimiter, authRoutes);
router.use("/api/users", userRoutes);

router.use("/api/setting", settingRoutes);
router.use("/api/dashboard", dashboardRoutes);
router.use("/api/employee", employeeRoutes);

router.use("/api/profile", profileRoutes);

router.use("/api/stock", stockRoutes);

router.use("/api/orders", orderRoutes);

router.use("/api/customers", customerRoutes);

router.use("/api/receipts", receiptRoutes);

export { router as routes };
