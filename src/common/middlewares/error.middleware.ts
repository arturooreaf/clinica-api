import type { Request, Response, NextFunction } from "express";
import { logger } from "../logger";

function errorHandle(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  logger.error({ err }, "Unhandled error");
  res.status(500).json({ error: "Internal server error" });
}

export default errorHandle;
