import { randomBytes } from "node:crypto";

// Runs before every unit test file (jest.config.js -> setupFiles).
// The values are fake and random on every run, so no real secret is ever
// needed to run the tests. The repositories are mocked in these tests, so
// DATABASE_URL points nowhere on purpose: a query that escapes a mock fails
// loudly instead of touching a real database.
Object.assign(process.env, {
  NODE_ENV: "test",
  LOG_LEVEL: "silent",
  JWT_SECRET: randomBytes(32).toString("hex"),
  CORS_ORIGIN: "http://localhost:5173,http://localhost:4173",
  DATABASE_URL: "postgres://nobody:nothing@127.0.0.1:1/not_a_database",
  RESEND_API_KEY: `re_test_${randomBytes(8).toString("hex")}`,
  RESEND_FROM: "Clinica Test <no-reply@example.com>",
});
