import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/env";
import { logger } from "../logger";

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer "))
    return res.status(401).json({ error: "Token no proporcionado" });

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Token no proporcionado" });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: number };
    req.user = payload;
    next();
  } catch (error) {
    logger.warn({ err: error }, "Token invalido o expirado");
    res.status(401).json({ error: "Token invalido o expirado" });
  }
}
