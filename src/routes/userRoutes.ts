import { Router } from "express";
import * as userController from "@/controllers";
import { authMiddleware } from "@/middlewares";

const router = Router();

router.get("/profile", authMiddleware, (req, res, next) => {
  userController.getUser(req, res).catch(next);
});
router.put("/profile", authMiddleware, (req, res, next) => {
  userController.updateUser(req, res).catch(next);
});
router.put("/change-password", authMiddleware, (req, res, next) => {
  userController.changePassword(req, res).catch(next);
});
router.delete("/profile", authMiddleware, (req, res, next) => {
  userController.deleteUser(req, res).catch(next);
});
router.get("/:id", authMiddleware, (req, res, next) => {
  userController.getUserInfo(req, res).catch(next);
});

export { router as userRoutes };
