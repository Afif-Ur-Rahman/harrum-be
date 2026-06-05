import { Router } from "express";

import {
  createProduct,
  deleteProduct,
  getProductById,
  getProducts,
  updateProduct,
} from "@/controllers";
import { authMiddleware } from "@/middlewares/auth-middleware";
import { uploadMiddleware } from "@/middlewares/upload-middleware";

const router = Router();
router.use(authMiddleware);

const multipleUploadHelper = uploadMiddleware({
  destinationPath: "uploads/menu",
  propertyName: "media",
  isMultiple: true,
});

const optionalMultipleUploadHelper = uploadMiddleware({
  destinationPath: "uploads/menu",
  propertyName: "media",
  isMultiple: true,
  isOptional: true,
});

router.get("/", getProducts);
router.get("/:id", getProductById);

router.post("/", multipleUploadHelper, createProduct);

router.put("/:id", optionalMultipleUploadHelper, updateProduct);
router.delete("/:id", deleteProduct);

export { router as productRoutes };
