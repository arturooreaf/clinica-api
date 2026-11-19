import { randomBytes } from "node:crypto";
import dotenv from "dotenv";

// Runs before every integration test file. These tests use a REAL
// PostgreSQL database, and they empty its tables before each test.
//
// DATABASE_URL comes from the environment (CI) or from .env.test (local,
// not committed). Everything else is fake, like in the unit tests.
dotenv.config({ path: ".env.test", quiet: true });

Object.assign(process.env, {
  NODE_ENV: "test",
  LOG_LEVEL: "silent",
  JWT_SECRET: randomBytes(32).toString("hex"),
  CORS_ORIGIN: "http://localhost:5173",
  RESEND_API_KEY: `re_test_${randomBytes(8).toString("hex")}`,
  RESEND_FROM: "Clinica Test <no-reply@example.com>",
});

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    "Integration tests need DATABASE_URL (in .env.test) pointing to a *_test database",
  );
}

// Safety net: these tests TRUNCATE every table. Refuse to run against any
// database whose name does not end in _test, so they can never wipe the
// development data by mistake.
const databaseName = new URL(url).pathname.slice(1);
if (!databaseName.endsWith("_test")) {
  throw new Error(
    `Refusing to run integration tests against "${databaseName}": the database name must end in _test`,
  );
}
