import { Router } from "express";

import { rateLimiter } from "@/middlewares/security-middleware";
import { userRoutes, profileRoutes, friendRoutes, stockRoutes } from "@/modules";
import { authRoutes } from "@/modules/auth/routes";
import { settingRoutes } from "@/modules/setting/routes";

import { dashboardRoutes } from "./dashboard-routes";
import { employeeRoutes } from "./employee-routes";
import { productRoutes } from "./product-routes";

// import { restaurantRoutes } from "./restaurant-routes";

const router = Router();

router.get("/", (req, res) => {
  res.json({ message: "Welcome to the restaurant API" });
});

router.use("/api/auth", rateLimiter, authRoutes);
router.use("/api/users", userRoutes);

router.use("/api/setting", settingRoutes);
router.use("/api/dashboard", dashboardRoutes);
router.use("/api/employee", employeeRoutes);

router.use("/api/friend", friendRoutes);
router.use("/api/profile", profileRoutes);

router.use("/api/stock", stockRoutes);
router.use("/api/product", productRoutes);

export { router as routes };
