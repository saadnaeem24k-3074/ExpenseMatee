import type { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/authService.js";
import { AppError, UnauthorizedError } from "../errors/appError.js";

const NOT_AUTHENTICATED_MESSAGE = "Not authenticated";
const LOGOUT_FAILED_MESSAGE = "Failed to log out.";

export class AuthController {
  constructor(private readonly service: AuthService = new AuthService()) {}

  signup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.service.signup(req.body ?? {});
      req.session.userId = user.id;
      res.status(201).json({ user });
    } catch (err) {
      this.handleError(err, res, next);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.service.login(req.body ?? {});
      req.session.userId = user.id;
      res.json({ user });
    } catch (err) {
      this.handleError(err, res, next);
    }
  };

  updateMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = this.requireUserId(req);
      const user = await this.service.updateBaseCurrency(userId, req.body?.base_currency);
      res.json({ user });
    } catch (err) {
      this.handleError(err, res, next);
    }
  };

  me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.service.getCurrentUser(this.requireUserId(req));
      res.json({ user });
    } catch (err) {
      this.handleError(err, res, next);
    }
  };

  logout = (req: Request, res: Response): void => {
    req.session.destroy((err) => {
      if (err) {
        res.status(500).json({ error: LOGOUT_FAILED_MESSAGE });
        return;
      }
      res.clearCookie("connect.sid");
      res.status(204).send();
    });
  };

  private requireUserId(req: Request): string {
    const userId = req.session.userId;
    if (!userId) {
      throw new UnauthorizedError(NOT_AUTHENTICATED_MESSAGE);
    }
    return userId;
  }

  private handleError(err: unknown, res: Response, next: NextFunction): void {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    next(err);
  }
}

export const authController = new AuthController();
