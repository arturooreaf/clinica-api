# Target architecture

Where this API is going, step by step. [`architecture.md`](architecture.md) describes how the code **is today**; this document describes how it **should be** to read like a professional production API, and the path to get there.

> **How to use this document:** don't read it end to end. Read the **summary**, look at the **gap table**, and open only the section for the step you are working on. Every section starts with a one-line summary.

---

## Summary in 5 points

1. **Same shape as today:** `routes → middlewares → controller → service → repository → SQL`, one folder per module. It already works; the target makes each layer stricter.
2. **Every input is validated at the edge** with zod (body, params, query, environment). After that, the code trusts its types.
3. **Every error answers the same way:** `{ "code": "snake_case", "message": "..." }`, chosen in one place.
4. **Data isolation lives in the SQL**, not in an `if` after the query: `WHERE id = $1 AND owner_id = $2`.
5. **Sessions are revocable:** a short access token plus a refresh token in an `httpOnly` cookie, backed by a `sessions` table.

---

## Map

| #   | Section                                             | Read it when                      | Time  |
| --- | --------------------------------------------------- | --------------------------------- | ----- |
| 1   | [Gap table](#1-gap-table-today-vs-target)           | Choosing the next step            | 3 min |
| 2   | [Layers and rules](#2-layers-and-rules)             | Writing any endpoint              | 3 min |
| 3   | [Module layout](#3-module-layout)                   | Creating a file                   | 2 min |
| 4   | [Validation](#4-validation-at-the-edge)             | Reading a body, param or query    | 2 min |
| 5   | [Errors](#5-errors)                                 | Answering anything other than 2xx | 3 min |
| 6   | [Data isolation](#6-data-isolation-in-the-sql)      | Writing a query                   | 2 min |
| 7   | [Sessions](#7-revocable-sessions)                   | Touching auth                     | 4 min |
| 8   | [Database conventions](#8-database-conventions)     | Writing a migration               | 3 min |
| 9   | [Cross-cutting concerns](#9-cross-cutting-concerns) | Config, logs, security, health    | 3 min |
| 10  | [Tests](#10-tests)                                  | Before every commit               | 3 min |
| 11  | [Delivery](#11-delivery)                            | CI, Docker, commits, ADRs         | 2 min |
| 12  | [Code templates](#12-code-templates)                | Starting a step                   | —     |
| 13  | [Roadmap](#13-roadmap)                              | Planning the week                 | 2 min |

---

## 1. Gap table: today vs target

**In one line:** the foundations are good; the gaps are consistency, validation, isolation in SQL and sessions.

| Area                                 | Today                                                          | Target                                                                          | Step   |
| ------------------------------------ | -------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------ |
| Layers                               | routes → controller → service → repository ✅                  | Same, stricter responsibilities                                                 | —      |
| Integration tests on real PostgreSQL | ✅                                                             | Keep them, add SQL-text unit checks                                             | 10     |
| Trace id + `redact` in logs          | ✅                                                             | Keep; add `x-request-id` header                                                 | 9      |
| Fail-fast env                        | `requireEnv` for strings ✅                                    | One zod schema: types, enums, numbers, ranges                                   | 1      |
| Error body                           | `{ error: "..." }`, different text per endpoint                | `{ code, message }`, stable codes                                               | 2      |
| Unknown routes                       | Express default HTML                                           | `404 { code: "not_found" }`                                                     | 2      |
| Error handler                        | Always 500                                                     | Respects `status` (bad JSON → 400), `headersSent`                               | 2      |
| `try/catch` in every controller      | Yes                                                            | Removed: Express 5 forwards async errors                                        | 2      |
| Input validation                     | Hand-written middlewares                                       | zod schemas per module                                                          | 3      |
| Ownership check                      | Fetch by id, then `if (owner_id !== userId)` in the controller | `WHERE id = $1 AND owner_id = $2`, answer 404                                   | 4      |
| Columns                              | `SELECT *`, `snake_case` leaks into JSON                       | Explicit columns, mapped to `camelCase` in the repository                       | 5      |
| Audit fields                         | None                                                           | `created_at`, `updated_at`, `deleted_at` (soft delete)                          | 5      |
| Transactions                         | None                                                           | `inTransaction()` helper in `pool.ts`                                           | 5      |
| Lists                                | Everything at once                                             | Pagination (`limit`, `cursor` or `page`)                                        | 6      |
| Security headers                     | None                                                           | `helmet`, body size limit, `trust proxy` from env                               | 7      |
| Health                               | `GET /` text                                                   | `GET /health` checks PostgreSQL                                                 | 7      |
| Shutdown                             | Process killed                                                 | Graceful: stop accepting, close the pool                                        | 7      |
| Sessions                             | Stateless JWT, cannot be revoked                               | `sessions` table + refresh cookie + `/auth/refresh`, `/auth/logout`, `/auth/me` | 8      |
| Expected business results            | `null` / `undefined`                                           | Outcome unions (`{ outcome: "created" } \| { outcome: "email_taken" }`)         | 3      |
| Comments                             | Some explain _what_                                            | Only _why_; names explain _what_                                                | always |
| Decisions                            | In `architecture.md` Q&A                                       | Plus short ADRs in `docs/adr/`                                                  | 11     |

---

## 2. Layers and rules

**In one line:** each layer knows one thing and is forbidden from knowing the others.

```
HTTP ─► routes ─► middlewares ─► controller ─► service ─► repository ─► PostgreSQL
                  (auth, limits,   (HTTP:        (business   (SQL only,
                   validation)      status,       rules,      camelCase ⇄
                                    body)         outcomes)   snake_case)
```

| Layer        | ✅ Does                                                                               | ❌ Never                         |
| ------------ | ------------------------------------------------------------------------------------- | -------------------------------- |
| `routes`     | Wires path + middlewares + controller                                                 | Logic                            |
| middlewares  | Auth, rate limits, zod validation                                                     | Business rules                   |
| `controller` | Reads the validated input, calls the service, maps the outcome to a status and a body | SQL, business rules, `try/catch` |
| `service`    | Business rules; returns **outcomes** for expected results                             | `req`/`res`, SQL                 |
| `repository` | SQL with parameters; maps rows to `camelCase` types                                   | Business rules, HTTP             |
| `common/`    | Config, logger, context, generic middlewares                                          | Importing a module               |

**Golden rule:** dependencies point down. `common/` never imports from `modules/`. A module may use another module's **service**, never its repository.

---

## 3. Module layout

**In one line:** one folder per domain, one file per layer, plus a `schemas` file.

```
src/modules/patients/
├── patient.routes.ts        path + middlewares + controller
├── patient.controller.ts    HTTP in, HTTP out
├── patient.service.ts       rules and outcomes
├── patient.repository.ts    SQL and row mapping
└── patient.schemas.ts       zod schemas + the types inferred from them
```

> Today the module has `infra/repositories/` and `types/` subfolders. Flattening them is **optional**: the subfolders are a valid choice. What matters is one responsibility per file. If you flatten, do it in its own commit.

---

## 4. Validation at the edge

**In one line:** nothing from outside reaches a service without passing a zod schema.

- **Body, params and query** are parsed by a `validate()` middleware with the module's schemas.
- The **types come from the schemas** (`z.infer`), so validation and types never drift apart.
- An invalid input answers `400 { code: "invalid_input", message, fields }`.
- **Environment variables** go through the same idea at startup (section 9).

Why zod and not hand-written checks: one declarative schema replaces dozens of `if`s, gives precise messages per field, and is the same tool the frontend uses.

---

## 5. Errors

**In one line:** the client gets a stable `code` it can translate; the details go to the log.

```json
{ "code": "patient_not_found", "message": "Patient not found" }
```

| Situation                            | Status | `code`                           |
| ------------------------------------ | ------ | -------------------------------- |
| Invalid body, params or query        | 400    | `invalid_input` (+ `fields`)     |
| Malformed JSON                       | 400    | `bad_request`                    |
| No token, bad token, revoked session | 401    | `unauthenticated`                |
| Logged in but not allowed            | 403    | `forbidden`                      |
| Not found **or not yours**           | 404    | `<entity>_not_found`             |
| Duplicate (unique constraint)        | 409    | e.g. `email_taken`               |
| Too many attempts                    | 429    | `too_many_requests`              |
| Anything unexpected                  | 500    | `internal_error` (never details) |

- **Expected** results (not found, duplicate, wrong password) are **outcomes** returned by the service, and the controller maps them.
- **Unexpected** failures (database down, a bug) are **thrown**. Express 5 forwards a rejected promise to the error handler, so controllers need no `try/catch`.
- `notFound` middleware for unknown routes; `errorHandler` last.
- **Login errors are generic:** never reveal whether an email exists.

---

## 6. Data isolation in the SQL

**In one line:** the query itself refuses other users' rows, so no forgotten `if` can leak them.

```sql
-- today: two steps, the check lives in the controller
SELECT * FROM patients WHERE id = $1;          -- then: if (patient.owner_id !== userId) 403

-- target: one step, the check lives in the query
SELECT id, name, age, diagnosis, created_at
FROM patients
WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL;
```

- Same for `UPDATE` and `DELETE`: `WHERE id = $1 AND owner_id = $2`. **This also closes the gap between the check and the write.**
- Not yours → **404**, the same as not existing, so ids don't leak. (Record the change of mind in an ADR: the current docs chose 403.)
- **Tested twice:** a unit test asserts the SQL text contains `owner_id = $2`, and an integration test proves user B cannot read user A's patient.

---

## 7. Revocable sessions

**In one line:** a short access token you can verify fast, plus a server-side session you can kill.

| Piece                                                                                              | Where                                                       | Lifetime                   |
| -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | -------------------------- |
| Access token (JWT with `sessionId`)                                                                | `Authorization: Bearer`, kept **in memory** by the frontend | ~15 min                    |
| Refresh token (random, stored **hashed**)                                                          | `httpOnly`, `Secure`, `SameSite` cookie                     | ~7–30 days                 |
| `sessions` row (`id`, `user_id`, `refresh_token_hash`, `expires_at`, `revoked_at`, `last_used_at`) | PostgreSQL                                                  | until expiry or revocation |

Endpoints:

| Endpoint             | Does                                                                                           |
| -------------------- | ---------------------------------------------------------------------------------------------- |
| `POST /auth/login`   | Checks the password, creates a session, sets the cookie, returns `{ accessToken }`             |
| `POST /auth/refresh` | Reads the cookie, checks the session, **rotates** the refresh token, returns `{ accessToken }` |
| `GET /auth/me`       | Returns the current user                                                                       |
| `POST /auth/logout`  | Sets `revoked_at`, clears the cookie                                                           |

- The auth middleware verifies the JWT **and** checks that the session is not revoked.
- **Rotation:** each refresh issues a new refresh token. Reusing an old one revokes the session (a sign of theft).
- This is exactly what the frontend expects (`rehabit-app`): access token in memory, refresh cookie, `/auth/refresh` on a 401.
- CORS must allow credentials from the frontend origin (`credentials: true`, an explicit origin, never `*`).

---

## 8. Database conventions

**In one line:** `snake_case` in the database, `camelCase` in TypeScript, the repository translates.

- Explicit column lists. **Never `SELECT *`**: a new column must not leak into the API by accident.
- Every table has `created_at` and `updated_at` (`timestamptz`, default `now()`), and `deleted_at` where rows can be deleted (soft delete).
- Constraints in the database, not only in code: `NOT NULL`, `UNIQUE`, `CHECK`, foreign keys with a decided `ON DELETE`.
- Emails stored lowercased and trimmed, with a unique index on `lower(email)`.
- Several writes that must succeed together go in `inTransaction()`.
- Migrations only move forward. Never edit one that has been applied: add a new one.
- Indexes for every column you filter by (`owner_id`, `patient_id`).

---

## 9. Cross-cutting concerns

**In one line:** config, logs, security and health live in `common/` and work the same for every module.

| Concern  | Target                                                                                                                                                                              |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Config   | `common/config/env.ts`: one zod schema. `NODE_ENV` enum, `PORT` number, `TRUST_PROXY_HOPS`, `CORS_ORIGINS` list, secrets required with **no default**. Never a loose `process.env`. |
| Logs     | Pino, JSON, `traceId` from `AsyncLocalStorage` (already ✅), `redact` for passwords, tokens and cookies (extend to `cookie` and `refreshToken`)                                     |
| Trace id | Accept a safe `x-request-id` or create one, and **send it back** in the response                                                                                                    |
| Security | `helmet()`, `express.json({ limit: "100kb" })`, `trust proxy` from env, rate limits (already ✅), CORS with credentials                                                             |
| Docs     | Swagger UI only in development, or behind a flag                                                                                                                                    |
| Health   | `GET /health` → `200 { status: "ok" }` or `503` if PostgreSQL does not answer within 2 s                                                                                            |
| Shutdown | On `SIGTERM`: stop the HTTP server, wait for requests in flight, `pool.end()`                                                                                                       |

---

## 10. Tests

**In one line:** fast unit tests with a mocked repository for every rule, real-database tests for the SQL.

| Level                | Tool                                    | What                                                    |
| -------------------- | --------------------------------------- | ------------------------------------------------------- |
| Unit: pure functions | Jest                                    | Validation helpers, mappers                             |
| Unit: endpoints      | Jest + supertest, **mocked repository** | Status codes, bodies, outcomes, auth, every `code`      |
| Unit: SQL text       | Jest, pool replaced by a spy            | The query carries `owner_id = $2`, `deleted_at IS NULL` |
| Integration          | Jest + real PostgreSQL (already ✅)     | Constraints, migrations, isolation between two users    |
| Flow                 | supertest + real database (already ✅)  | register → login → create → read → refresh → logout     |

- Every case: happy path, edge cases (empty, `null`, max length, exact limit) and weird ones (unicode, spaces, two requests at once).
- The test name describes the scenario: `"user B gets 404 reading user A's patient"`.
- `test/setup-env.ts` sets random secrets on each run.
- Coverage threshold in `jest.config.js` (e.g. 80 % lines).
- Before every commit: `npm run lint && npm run typecheck && npm test`.

---

## 11. Delivery

**In one line:** small commits, a green CI and written decisions.

- **Commits:** Conventional Commits (already ✅), one line, lowercase imperative, small and atomic: usually a source file and its test.
- **Branches:** short, from `main` (`feat/revocable-sessions`), merged through a PR with green CI.
- **CI** (GitHub Actions, already ✅): add `npm audit --audit-level=high` and the coverage threshold.
- **Docker:** multi-stage build, run as the non-root `node` user, `npm ci --omit=dev` in the final image.
- **ADRs** in `docs/adr/NNNN-title.md`: Context · Decision · Alternatives · Consequences. First ones:
  - `0001-controller-layer.md` (why keep a controller)
  - `0002-404-for-other-users-resources.md`
  - `0003-revocable-sessions.md`
  - `0004-zod-for-validation.md`

---

## 12. Code templates

Starting points to **understand and adapt**, not to paste blindly.

### 12.1 Environment

```ts
// src/common/config/env.ts
import dotenv from "dotenv";
import { z } from "zod";

if (process.env.NODE_ENV !== "test") {
  dotenv.config({ quiet: true });
}

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  PORT: z.coerce.number().int().min(1).max(65535),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().positive(),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive(),
  CORS_ORIGINS: z
    .string()
    .transform((value) => value.split(",").map((origin) => origin.trim())),
  RESEND_API_KEY: z.string().min(1),
  RESEND_FROM: z.string().email(),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  const problems = parsed.error.issues.map(
    (issue) => `${issue.path.join(".")}: ${issue.message}`,
  );
  throw new Error(`Invalid environment:\n${problems.join("\n")}`);
}

export const env = parsed.data;
```

### 12.2 Errors: `notFound` and `errorHandler`

```ts
// src/common/middlewares/notFound.middleware.ts
import type { Request, Response } from "express";

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ code: "not_found", message: "Not found" });
}
```

```ts
// src/common/middlewares/error.middleware.ts
import type { NextFunction, Request, Response } from "express";
import { logger } from "../logger";

interface HttpError extends Error {
  status?: number;
  statusCode?: number;
}

export function errorHandler(
  err: HttpError,
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  if (res.headersSent) {
    next(err);
    return;
  }
  const status = err.status ?? err.statusCode ?? 500;
  if (status >= 500) {
    logger.error({ err }, "Unhandled error");
    res
      .status(500)
      .json({ code: "internal_error", message: "Internal server error" });
    return;
  }
  logger.warn({ status }, "Rejected request");
  res.status(status).json({ code: "bad_request", message: "Bad request" });
}
```

### 12.3 Validation middleware

```ts
// src/common/middlewares/validate.middleware.ts
import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

interface RequestSchemas {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
}

export function validate(schemas: RequestSchemas) {
  return (req: Request, res: Response, next: NextFunction) => {
    const parts = ["body", "params", "query"] as const;
    for (const part of parts) {
      const schema = schemas[part];
      if (!schema) {
        continue;
      }
      const result = schema.safeParse(req[part]);
      if (!result.success) {
        const fields: Record<string, string> = {};
        for (const issue of result.error.issues) {
          fields[issue.path.join(".")] = issue.message;
        }
        res
          .status(400)
          .json({ code: "invalid_input", message: "Invalid input", fields });
        return;
      }
      res.locals[part] = result.data;
    }
    next();
  };
}
```

(In Express 5 `req.query` is read-only, so the parsed values go to `res.locals`. Check the current Express docs; another common option is a typed helper that parses inside the controller.)

### 12.4 A module, top to bottom

```ts
// src/modules/patients/patient.schemas.ts
import { z } from "zod";

export const PatientIdParams = z.object({
  id: z.coerce.number().int().positive(),
});

export const CreatePatientBody = z.object({
  name: z.string().trim().min(1).max(100),
  age: z.number().int().min(0).max(130),
  diagnosis: z.string().trim().max(500).optional(),
});
export type CreatePatientInput = z.infer<typeof CreatePatientBody>;

export interface Patient {
  id: number;
  name: string;
  age: number;
  diagnosis: string | null;
  createdAt: Date;
}
```

```ts
// src/modules/patients/patient.repository.ts
import { pool } from "../../database/pool";
import type { CreatePatientInput, Patient } from "./patient.schemas";

interface PatientRow {
  id: number;
  name: string;
  age: number;
  diagnosis: string | null;
  created_at: Date;
}

function toPatient(row: PatientRow): Patient {
  return {
    id: row.id,
    name: row.name,
    age: row.age,
    diagnosis: row.diagnosis,
    createdAt: row.created_at,
  };
}

export async function findOwnedPatient(
  patientId: number,
  ownerId: number,
): Promise<Patient | undefined> {
  const result = await pool.query<PatientRow>(
    `SELECT id, name, age, diagnosis, created_at
     FROM patients
     WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL`,
    [patientId, ownerId],
  );
  const row = result.rows[0];
  return row ? toPatient(row) : undefined;
}

export async function insertPatient(
  input: CreatePatientInput,
  ownerId: number,
): Promise<Patient> {
  const result = await pool.query<PatientRow>(
    `INSERT INTO patients (name, age, diagnosis, owner_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, age, diagnosis, created_at`,
    [input.name, input.age, input.diagnosis ?? null, ownerId],
  );
  return toPatient(result.rows[0]!);
}
```

```ts
// src/modules/patients/patient.service.ts
import * as patientRepository from "./patient.repository";
import type { Patient } from "./patient.schemas";

export type ReadPatientOutcome =
  { outcome: "found"; patient: Patient } | { outcome: "not_found" };

export async function readOwnedPatient(
  patientId: number,
  ownerId: number,
): Promise<ReadPatientOutcome> {
  const patient = await patientRepository.findOwnedPatient(patientId, ownerId);
  if (!patient) {
    return { outcome: "not_found" };
  }
  return { outcome: "found", patient };
}
```

```ts
// src/modules/patients/patient.controller.ts — no try/catch: Express 5 forwards rejections
import type { Request, Response } from "express";
import * as patientService from "./patient.service";

export async function getPatient(req: Request, res: Response) {
  const { id } = res.locals.params as { id: number };
  const result = await patientService.readOwnedPatient(id, req.user.userId);
  if (result.outcome === "not_found") {
    res
      .status(404)
      .json({ code: "patient_not_found", message: "Patient not found" });
    return;
  }
  res.status(200).json(result.patient);
}
```

```ts
// src/modules/patients/patient.routes.ts
import { Router } from "express";
import { requireSession } from "../../common/middlewares/auth.middleware";
import { validate } from "../../common/middlewares/validate.middleware";
import * as patientController from "./patient.controller";
import { PatientIdParams } from "./patient.schemas";

const router = Router();
router.use(requireSession); // today: authMiddleware
router.get(
  "/:id",
  validate({ params: PatientIdParams }),
  patientController.getPatient,
);

export default router;
```

### 12.5 Transactions

```ts
// src/database/pool.ts (add)
import type { PoolClient } from "pg";

export async function inTransaction<T>(
  work: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
```

### 12.6 Testing the SQL text

```ts
// test/patients/isolation.test.ts
import { pool } from "../../src/database/pool";
import { findOwnedPatient } from "../../src/modules/patients/patient.repository";

test("the patient query only returns rows owned by the caller", async () => {
  const querySpy = jest
    .spyOn(pool, "query")
    .mockResolvedValue({ rows: [] } as never);

  await findOwnedPatient(7, 42);

  const [sql, params] = querySpy.mock.calls[0]!;
  expect(String(sql)).toContain("owner_id = $2");
  expect(String(sql)).toContain("deleted_at IS NULL");
  expect(params).toEqual([7, 42]);
});
```

### 12.7 Graceful shutdown

```ts
// src/server.ts
import app from "./app";
import { env } from "./common/config/env";
import { logger } from "./common/logger";
import { pool } from "./database/pool";

const server = app.listen(env.PORT, () =>
  logger.info({ port: env.PORT }, "Server listening"),
);

function shutDown(signal: string) {
  logger.info({ signal }, "Shutting down");
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutDown("SIGTERM"));
process.on("SIGINT", () => shutDown("SIGINT"));
```

---

## 13. Roadmap

**In one line:** one step at a time, each one small, tested and merged before the next.

Each step is **one branch and one PR**. Order matters: the early ones make the later ones easier.

| Step | Branch                    | Done when                                                                                                                         | Size |
| ---- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 1    | `refactor/env-schema`     | The app refuses to start with a clear list of every bad variable                                                                  | S    |
| 2    | `refactor/error-codes`    | Every error answers `{ code, message }`, unknown routes give a JSON 404, no `try/catch` left in controllers                       | M    |
| 3    | `feat/zod-validation`     | Hand-written validation middlewares are gone; services return outcomes                                                            | M    |
| 4    | `fix/isolation-in-sql`    | `owner_id` is in every patient and appointment query; a unit test checks the SQL text; an integration test proves user B gets 404 | M    |
| 5    | `refactor/db-conventions` | Explicit columns, `camelCase` JSON, `created_at`/`updated_at`/`deleted_at`, `inTransaction()`                                     | L    |
| 6    | `feat/pagination`         | List endpoints accept `limit` and `page`/`cursor` and say if there is more                                                        | S    |
| 7    | `feat/hardening`          | `helmet`, body limit, `trust proxy` from env, `/health`, graceful shutdown                                                        | S    |
| 8    | `feat/revocable-sessions` | Login, refresh with rotation, `me` and logout work with the frontend; a revoked session gets 401                                  | L    |
| 9    | `chore/adrs-and-ci`       | 4 ADRs written, `npm audit` and a coverage threshold in CI                                                                        | S    |

S = 1–2 sessions · M = 3–4 · L = a week or more, split into sub-steps.

Update [`architecture.md`](architecture.md) and [`openapi.yaml`](openapi.yaml) **in the same PR** as each change, so the documentation never lies.
