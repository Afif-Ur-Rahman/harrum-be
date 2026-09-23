import { Router } from "express";

import { authMiddleware } from "@/middlewares/auth-middleware";

import { createExpense, deleteExpense, getExpenses, updateExpense } from "../controllers";

const router = Router();
router.use(authMiddleware);

router.get("/", getExpenses);
router.post("/", createExpense);
router.put("/:id", updateExpense);
router.delete("/:id", deleteExpense);

export { router as expenseRoutes };
