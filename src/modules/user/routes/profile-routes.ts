import { Router } from "express";

import { authMiddleware } from "@/middlewares/auth-middleware";
import { uploadMiddleware } from "@/middlewares/upload-middleware";
import {
  getProfile,
  updateProfile,
  deleteProfile,
  changeProfilePassword,
  // getMyAds,
  // getPublicProfile,
  // getStoreProfile,
  updateLanguage,
} from "@/modules/user/controllers";
import { catchAsync } from "@/utils/catch-async";

const optionalUploadHelper = uploadMiddleware({
  destinationPath: "uploads/profiles",
  fields: [
    { name: "image", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ],
  isOptional: true,
});

const router = Router();

router.use(authMiddleware);

router.get("/", catchAsync(getProfile));
// router.get("/my-ads", catchAsync(getMyAds));
// router.get("/:userId", getPublicProfile);
// router.get("/market/:storeId", getStoreProfile);
router.put("/", optionalUploadHelper, catchAsync(updateProfile));
router.put("/language", optionalUploadHelper, catchAsync(updateLanguage));
router.delete("/", catchAsync(deleteProfile));
router.put("/change-password", catchAsync(changeProfilePassword));

export { router as profileRoutes };
