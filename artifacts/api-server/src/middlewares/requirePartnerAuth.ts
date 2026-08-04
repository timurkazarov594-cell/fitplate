import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../lib/auth.js";

export interface PartnerAuthRequest extends Request {
  partnerId?: number;
}

export function requirePartnerAuth(req: PartnerAuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Необходима авторизация." });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = verifyToken(token);
    if (!("type" in payload) || payload.type !== "partner") {
      res.status(401).json({ error: "Необходима авторизация." });
      return;
    }
    req.partnerId = payload.partnerId;
    next();
  } catch {
    res.status(401).json({ error: "Сессия истекла. Войдите снова." });
  }
}
