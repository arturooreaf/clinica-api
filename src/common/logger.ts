import pino from "pino";
import { requestContext } from "./context";

const isDevelopment = process.env.NODE_ENV !== "production";

export const logger = pino({
  level: isDevelopment ? "debug" : "info",
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
    censor: "[OCULTO]",
  },
  ...(isDevelopment && {
    transport: {
      target: "pino-pretty",
      options: { translateTime: "HH:MM:ss", ignore: "pid,hostname" },
    },
  }),
});
