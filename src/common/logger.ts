import pino from "pino";
import { requestContext } from "./context";

const isProduction = process.env.NODE_ENV === "production";
const isTest = process.env.NODE_ENV === "test";
const isDevelopment = !isProduction && !isTest;

export const logger = pino({
  // LOG_LEVEL lets the tests run silently (see test/setup-env.ts)
  level: process.env.LOG_LEVEL ?? (isProduction ? "info" : "debug"),
  mixin() {
    const store = requestContext.getStore();
    return store ? { traceId: store.traceId } : {};
  },
  redact: {
    paths: [
      "password",
      "*.password",
      "req.headers.authorization",
      "headers.authorization",
      "token",
      "*.token",
    ],
    censor: "[REDACTED]",
  },
  ...(isDevelopment && {
    transport: {
      target: "pino-pretty",
      options: { translateTime: "HH:MM:ss", ignore: "pid,hostname" },
    },
  }),
});
