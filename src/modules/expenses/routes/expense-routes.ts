import { Router } from "express";

import { authMiddleware, requirePermission } from "@/middlewares";

import { createExpense, deleteExpense, getExpenses, updateExpense } from "../controllers";

const router = Router();
router.use(authMiddleware);
router.use(requirePermission("expenses"));

router.get("/", getExpenses);
router.post("/", createExpense);
router.put("/:id", updateExpense);
router.delete("/:id", deleteExpense);

export { router as expenseRoutes };
