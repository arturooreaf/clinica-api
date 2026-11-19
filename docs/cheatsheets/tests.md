# Cheat sheet · Tests

A summary of what I learned setting up the project's tests.

---

## Why have tests if I already have `tsc`?

They're different layers, not alternatives.

|                | What it checks                   | Blind spot                                    |
| -------------- | -------------------------------- | --------------------------------------------- |
| `tsc --noEmit` | that the pieces fit (types)      | everything inside a string: SQL, routes, URLs |
| tests          | that the result is the right one | the files they never run                      |

**The real case:** I wrote `INSERT INTO patients (..., ownerId)` with the
variable's name instead of the column's. `tsc` said everything was perfect,
because to it that's _a string_, and a string is always valid. Only a test (or
a user) catches that bug. In this project that's what the integration tests
are for: they run the real SQL.

And the other way round: tests don't notice I called a function with one
argument missing if that file never runs in any test.

---

## The tools: who does what

- **Jest** — the organiser and runner. It counts, names and reports. It knows
  nothing about HTTP.
- **supertest** — the one that speaks HTTP. It sends requests to the app without
  opening a real port.
- **ts-jest** — the translator. Jest doesn't understand TypeScript; ts-jest
  compiles it on the fly.

That's why we needed all three, even though the Jest docs only mention Jest.

---

## Two Jest projects: `unit` and `integration`

Everything lives in `test/`. `jest.config.js` splits it into two projects:

|          | `unit` (fast)                                                         | `integration` (slow)                                |
| -------- | --------------------------------------------------------------------- | --------------------------------------------------- |
| Where    | `test/**` except `test/integration/`                                  | `test/integration/`                                 |
| What     | the whole HTTP app via supertest, plus middlewares and services alone | the repositories' real SQL                          |
| Database | none: repositories mocked with `jest.mock`                            | real PostgreSQL, a `*_test` database                |
| Setup    | `test/setup-env.ts` (fake, random env vars)                           | `test/integration/setup-env.ts` (loads `.env.test`) |

```bash
npm test                  # unit, then integration
npm run test:unit         # only unit (no database needed)
npm run test:integration  # only integration (--runInBand: one file at a time)
npm run test:watch        # unit in watch mode
npm run test:coverage     # both, with coverage
```

The integration setup **refuses to run** if the database name doesn't end in
`_test`: those tests `TRUNCATE` every table before each test.

---

## Jest's two phases

This explains almost every weird error.

1. **Registration** — the file runs once, top to bottom, just to _write down_
   which tests exist. Nothing gets tested here.
2. **Execution** — each `it` runs one by one, now with its `await`s.

**Consequence:** `describe` is **never** `async`. There's nothing to wait for
during registration. The `async` goes on the `it`, which is where the `await` is.

> **Rule:** the `async` goes where the `await` is.

`jest.mock(...)` is special: Jest moves it to the top of the file, above the
imports, so the module is already fake when the app imports it.

---

## The minimal syntax

```ts
jest.mock("../../src/modules/patients/infra/repositories/patient.repository");

import { api, signedInAs } from "../helpers";
import { aPatient } from "../builders";
import { patients } from "./helpers";

describe("GET /patients/:id", () => {
  // groups
  it("answers with the patient", async () => {
    // one case
    patients.getById.mockResolvedValue(aPatient({ id: 10 })); // Arrange
    const response = await api().get("/patients/10").set(signedInAs()); // Act
    expect(response.status).toBe(200); // the verdict
  });
});
```

- `describe` and `it` are what let Jest **count and name** tests.
- `expect` is what decides whether it passes or fails.
- The descriptions are labels **Jest never reads**. A badly named test is a
  test that lies: it goes green while saying something false.

Both arguments go **inside the same parentheses**, just like in
`app.get("/", handler)`.

---

## `toBe` vs `toEqual`

- `toBe` → _is it the same one?_ For numbers and strings.
- `toEqual` → _does it have the same content?_ For objects and arrays.

Two identical objects **aren't the same object**. `toBe` would say they're
different.

---

## The helpers in `test/`

| File                       | What it gives you                                                                   |
| -------------------------- | ----------------------------------------------------------------------------------- |
| `test/helpers.ts`          | `api()`, `tokenFor()`, `bearer()`, `signedInAs()`, `DOCTOR_ID`, `OTHER_DOCTOR_ID`   |
| `test/builders.ts`         | `aUser()`, `aPatient()`, `anAppointment()`: valid objects, override what you need   |
| `test/<module>/helpers.ts` | the mocked repository, e.g. `patients = jest.mocked(patientRepository)`             |
| `test/mocks.ts`            | whole-module fakes: rate limiters that let everything through, a fake Resend client |
| `test/integration/db.ts`   | `resetDatabase()`, `insertUser()`, `insertPatient()`, `countRows()`...              |

All the data is invented: never put real patients in tests.

---

## supertest

It exports **a single function**. That's why the import has no braces (it's in
`test/helpers.ts`; in the tests you just use `api()`):

```ts
import request from "supertest"; // right
import { request } from "supertest"; // wrong
```

| Method                     | What it's for        |
| -------------------------- | -------------------- |
| `.get(url)` / `.post(url)` | the method and route |
| `.set(signedInAs())`       | a **header**         |
| `.send({ ... })`           | the **body**         |

Params are written into the URL: `/patients/999`, not `/patients/:id`.
The colon is a placeholder **when defining** a route, and literal text **when
calling** it.

> `res.setHeader` (your code, on the response) and `.set` (the test, on the
> request) are the same verb in opposite directions.

---

## The hand-signed token

```ts
// test/helpers.ts
export function tokenFor(userId: number = DOCTOR_ID): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "1h" });
}
```

It works without a database because **JWT is stateless**. The server doesn't
look anything up: it recalculates the signature with the secret and compares.
If it matches, you're in.

For the same reason a token **can't be revoked**: expiry is the only brake.

---

## Mocks: the repository is fake, the rest is real

```ts
patients.getById.mockResolvedValue(aPatient()); // the "database" answers this
patients.getById.mockResolvedValue(undefined); // ...or "not found" → 404
patients.getById.mockRejectedValue(new Error("boom")); // ...or it fails → 500
expect(patients.getById).not.toHaveBeenCalled(); // never reached the database
```

`resetMocks: true` in the `unit` project: every test starts with clean mocks.

Pure unit tests skip HTTP entirely: a middleware with hand-made `req`, `res`
and `next` (see `test/patients/validation.test.ts`), or a service with only
its repository mocked (see `test/auth/auth.service.test.ts`).

---

## What to test: one test per path, not per endpoint

- The 401 comes from **a single middleware**. A few tests cover it entirely.
  Writing one per route is testing the same line of code fourteen times.
- The 400s are **different code each time** (different validations), so each
  one deserves its own test.

With the repositories mocked, almost every status code is reachable:

| Code                  | How                                                                                           |
| --------------------- | --------------------------------------------------------------------------------------------- |
| 200 / 201 / 204 / 404 | the mocked repository answers a row, or `undefined`                                           |
| 500                   | `mockRejectedValue(new Error(...))`                                                           |
| 202 (email)           | Resend replaced by `resendClientMock()`: no email leaves the machine                          |
| 429                   | `test/auth/rate-limits.test.ts` uses the real limiters, a new IP per test (`X-Forwarded-For`) |
| real SQL              | only the `integration` project                                                                |

A test must **never** call a real external service: it costs money, it's slow,
it fails for reasons unrelated to your code, and it would send a real email on
every `npm test`.

For known gaps: `it.todo("...")`. It declares the test without writing it. It's
the honest way to record a debt instead of forgetting it.

---

## Mistakes I made (so I don't repeat them)

- **`async` on the `describe`** → no, there's nothing to wait for there.
- **`await` without `async` on the `it`** → the opposite of the previous one.
- **`.get` without parentheses** → the error says
  `Property 'status' does not exist on type '(url: string) => Test'`. An arrow
  `=>` in an error type means: _you have the function where you wanted the
  result_.
- **`/appintments`** → a typo in the URL gives 404 instead of 401, and Jest
  reports it on the `expect` line. **Errors are reported where they're
  detected, not where they're caused.**
- **A literal `/patients/:id`** → it passed by accident: `":id"` isn't a
  number, so it gave 400 for the wrong reason. A test that's green for the
  wrong reason is worse than a red one.
- **The editor's auto-import**: `import { request } from "node:http"`. It
  exists, it compiles, and it isn't what you want. The braces were the clue.

---

## Configuration

`jest.config.js` (simplified):

```js
const transform = {
  "^.+\\.ts$": ["ts-jest", { tsconfig: "tsconfig.test.json" }],
};

module.exports = {
  projects: [
    {
      displayName: "unit",
      testEnvironment: "node",
      roots: ["<rootDir>/test"],
      testPathIgnorePatterns: [
        "/node_modules/",
        "/dist/",
        "/test/integration/",
      ],
      setupFiles: ["<rootDir>/test/setup-env.ts"],
      resetMocks: true,
      transform,
    },
    {
      displayName: "integration",
      testEnvironment: "node",
      roots: ["<rootDir>/test/integration"],
      setupFiles: ["<rootDir>/test/integration/setup-env.ts"],
      transform,
    },
  ],
};
```

Things that took a while:

- `tsconfig.test.json` extends `tsconfig.json` and adds `test/`, so the tests
  get type-checked (`npm run typecheck`) but the build never ships them.
- `"types": ["node", "jest"]` in a `tsconfig` is **an allow list**: if you add
  it, TypeScript loads _only_ what's in it. That's why `@types/jest` was
  installed and I still got `Cannot find name 'describe'`.
- In the unit tests `DATABASE_URL` points nowhere on purpose: a query that
  escapes a mock fails loudly instead of touching a real database.

And the reason `app.ts` is separate from `server.ts`: importing `app.ts`
**doesn't open a port**. Without that split, every test would start a real
server.
