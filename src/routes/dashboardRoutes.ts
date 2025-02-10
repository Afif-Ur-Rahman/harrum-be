import { Router } from "express";

import {
  updatePray,
  deletePrays,
  getPray,
  login,
  prayStats,
} from "@/controllers";
import { authMiddleware } from "@/middlewares";

const router = Router();

router.post("/login", (req, res, next) => {
  login(req, res).catch(next);
});

router.get("/", authMiddleware, (req, res, next) => {
  getPray(req, res).catch(next);
});

router.put("/:id", authMiddleware, (req, res, next) => {
  updatePray(req, res).catch(next);
});

router.delete("/", authMiddleware, (req, res, next) => {
  deletePrays(req, res).catch(next);
});
router.get("/stats", authMiddleware, (req, res, next) => {
  prayStats(req, res).catch(next);
});

export { router as dashboardRoutes };
