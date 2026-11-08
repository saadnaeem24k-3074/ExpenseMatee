import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { budgetsController } from "../controllers/budgetsController.js";

export const budgetsRouter = Router();

budgetsRouter.use(requireAuth);

// GET /api/budgets?month=9&year=2026
budgetsRouter.get("/", budgetsController.list);

// POST /api/budgets — create or update the budget for a category/month/year
budgetsRouter.post("/", budgetsController.upsert);

// DELETE /api/budgets/:id
budgetsRouter.delete("/:id", budgetsController.remove);
