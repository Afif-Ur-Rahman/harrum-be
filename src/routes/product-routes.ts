import { Router } from "express";

import {
  createProduct,
  deleteProduct,
  getProductById,
  getProducts,
  updateProduct,
} from "@/controllers";
import { authMiddleware } from "@/middlewares/auth-middleware";

const router = Router();
router.use(authMiddleware);

router.get("/", getProducts);
router.get("/:id", getProductById);

router.post("/", createProduct);

router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);

export { router as productRoutes };
