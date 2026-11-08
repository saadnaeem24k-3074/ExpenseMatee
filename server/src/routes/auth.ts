import { Router } from "express";
import { authController } from "../controllers/authController.js";

export const authRouter = Router();

// POST /api/auth/signup
authRouter.post("/signup", authController.signup);

// POST /api/auth/login
authRouter.post("/login", authController.login);

// PUT /api/auth/me - update the logged-in user's base currency
authRouter.put("/me", authController.updateMe);

// POST /api/auth/logout
authRouter.post("/logout", authController.logout);

// GET /api/auth/me
authRouter.get("/me", authController.me);
