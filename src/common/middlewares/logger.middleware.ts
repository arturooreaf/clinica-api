import type { Request, Response, NextFunction } from "express";
import { logger } from "../logger";

function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on("finish", () => {
    const ms = Date.now() - start;

    logger.info({
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      ms,
    });
  });

  next();
}

export default requestLogger;
