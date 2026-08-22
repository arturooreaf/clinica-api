import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/env";

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
    res.status(401).json({ error: "Token invalido o expirado" });
    console.error(error);
  }
}
