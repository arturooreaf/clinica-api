import type { Request, Response, NextFunction } from "express";

function errorHandle(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  console.error(err);
  res.status(500).json({ error: "Error interno del servidor" });
}

export default errorHandle;
