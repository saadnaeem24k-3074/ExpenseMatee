import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { analyticsController } from "../controllers/analyticsController.js";

export const analyticsRouter = Router();

analyticsRouter.use(requireAuth);

// GET /api/analytics/category-breakdown?month=9&year=2026
analyticsRouter.get("/category-breakdown", analyticsController.getCategoryBreakdown);

// GET /api/analytics/trend?months=6
analyticsRouter.get("/trend", analyticsController.getTrend);
