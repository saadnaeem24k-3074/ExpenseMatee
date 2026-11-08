import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { transactionsController } from "../controllers/transactionsController.js";

export const transactionsRouter = Router();

transactionsRouter.use(requireAuth);

// GET /api/transactions
transactionsRouter.get("/", transactionsController.list);

// GET /api/transactions/export
transactionsRouter.get("/export", transactionsController.exportCsv);

// POST /api/transactions/import
transactionsRouter.post("/import", transactionsController.importCsv);

// POST /api/transactions
transactionsRouter.post("/", transactionsController.create);

// PUT /api/transactions/:id
transactionsRouter.put("/:id", transactionsController.update);

// DELETE /api/transactions/:id
transactionsRouter.delete("/:id", transactionsController.remove);
