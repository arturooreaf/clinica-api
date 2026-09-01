import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";
import { logger } from "../logger";
import { requestContext } from "../context";

function requestLogger(req: Request, res: Response, next: NextFunction) {
  const traceId = randomUUID();
  res.setHeader("X-Trace-Id", traceId);

  requestContext.run({ traceId }, () => {
    const start = Date.now();

    res.on("finish", () => {
      logger.info({
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        ms: Date.now() - start,
      });
    });

    next();
  });
}

export default requestLogger;
