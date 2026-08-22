import pino from "pino";

const isDevelopment = process.env.NODE_ENV !== "production";

export const logger = pino({
  level: isDevelopment ? "debug" : "info",
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
