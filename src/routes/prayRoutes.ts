import { Router } from "express";
import {
  createPray,
  deletePray,
  getPrays,
  readPray,
  getMyPrays,
} from "@/controllers";
import { authMiddleware } from "@/middlewares";

const router = Router();

router.post("/", authMiddleware, (req, res, next) => {
  createPray(req, res).catch(next);
});
router.get("/", authMiddleware, (req, res, next) => {
  getMyPrays(req, res).catch(next);
});
router.delete("/:id", authMiddleware, (req, res, next) => {
  deletePray(req, res).catch(next);
});

// open routes
router.get("/all", (req, res, next) => {
  getPrays(req, res).catch(next);
});

router.post("/read-pray", (req, res, next) => {
  readPray(req, res).catch(next);
});

export { router as prayRoutes };
