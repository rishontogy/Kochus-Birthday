import type { NextFunction, Request, Response } from "express";
import {
  getState,
  getUserIdForSession,
  publicUser,
  type Role,
  type StoredUser,
} from "../services/birthday-store";

declare global {
  namespace Express {
    interface Request {
      birthdayUser?: StoredUser;
    }
  }
}

export async function requireBirthdayUser(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const userId = getUserIdForSession(req.cookies?.kochusession);
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const state = await getState();
  const user = state.users.find((item) => item.id === userId && item.active);
  if (!user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  req.birthdayUser = user;
  next();
}

export function requireBirthdayRole(role: Role) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.birthdayUser?.role !== role) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}

export function safeUser(req: Request) {
  return req.birthdayUser ? publicUser(req.birthdayUser) : null;
}