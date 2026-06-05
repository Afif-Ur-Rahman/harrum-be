import { Router } from "express";

import { superAdminMiddleware } from "@/middlewares";

import {
  createAdmin,
  getSettings,
  updateSettings,
  getALlAdmin,
  getAllUser,
  sendTestNotification,
} from "./setting-controller";

const router = Router();
router.use(superAdminMiddleware);

// Settings routes

router.get("/admin", getALlAdmin);
router.get("/user", getAllUser);
router.put("/create-admin/:id", createAdmin);
router.get("/", getSettings);
router.post("/", updateSettings);
router.put("/update", sendTestNotification);

export { router as settingRoutes };
