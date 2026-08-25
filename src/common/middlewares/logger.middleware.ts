import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";
import { logger } from "../logger";

function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  const traceId = randomUUID();
  res.on("finish", () => {
    const ms = Date.now() - start;

    logger.info({
      traceId,
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      ms,

    });
  });
res.setHeader("X-Trace-Id", traceId);
  next();
}

export default requestLogger;
