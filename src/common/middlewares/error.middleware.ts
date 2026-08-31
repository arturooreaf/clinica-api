import type { Request, Response, NextFunction } from "express";
import { logger } from "../logger";

function errorHandle(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  logger.error({ err }, "Error no controlado");
  res.status(500).json({ error: "Error interno del servidor" });
}

export default errorHandle;
