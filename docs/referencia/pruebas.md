# Tests

Two ways to check the API: the automated test suite (Jest), which is what CI
runs, and a manual sequence with `curl` to see it working end to end.

---

## Automated tests

### Layout

The tests live in `test/`, outside `src/`, so the build never ships them.
`jest.config.js` splits them into two Jest projects:

| Project       | Files                                            | What is real                                                                                                                          | Needs                              |
| ------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `unit`        | everything in `test/` except `test/integration/` | the whole HTTP app (routes, middlewares, controllers, services); the repositories, the Resend client and the rate limiters are mocked | nothing: no Docker, no `.env.test` |
| `integration` | `test/integration/`                              | the full stack down to PostgreSQL; only the rate limiters are mocked                                                                  | PostgreSQL and a `_test` database  |

```
test/
├── setup-env.ts          fake env vars for the unit project
├── helpers.ts            api(), tokenFor(), signedInAs(), bearer()...
├── builders.ts           aPatient(), aUser()... valid objects with defaults
├── mocks.ts              pass-through rate limiters, fake Resend client
├── app/                  GET /, trace id, unknown route, /docs, CORS, bad JSON
├── auth/                 register, login, token, rate limits, auth.service
├── patients/             one file per route, plus the validation middlewares
├── appointments/         one file per route
├── emails/               POST /emails
└── integration/
    ├── setup-env.ts      reads .env.test and refuses any non-_test database
    ├── db.ts             resetDatabase(), insertUser(), insertPatient()...
    ├── *.repository.test.ts   the real SQL of each repository
    └── flow.test.ts      whole journeys over HTTP against the real database
```

The unit tests use supertest against `app` (no port is opened) and replace
each repository with `jest.mock(...)`, so every repository function is a
`jest.fn()` the test controls. `resetMocks: true` gives every test clean
mocks.

### Commands

| Command                    | What it runs                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------ |
| `npm test`                 | both projects: `npm run test:unit && npm run test:integration`                       |
| `npm run test:unit`        | the `unit` project only (`jest --selectProjects unit`)                               |
| `npm run test:integration` | the `integration` project only, one file at a time (`--runInBand`)                   |
| `npm run test:watch`       | the `unit` project in watch mode                                                     |
| `npm run test:coverage`    | both projects with a coverage report of `src/` (`server.ts` and migrations excluded) |

Because `npm test` runs the unit project first, a failing unit test stops it
before the integration tests start.

### Environment

- **Unit tests:** `test/setup-env.ts` sets `NODE_ENV=test`, `LOG_LEVEL=silent`
  and fake values for every variable, with a random `JWT_SECRET` on every
  run. `DATABASE_URL` points nowhere on purpose: a query that escapes a mock
  fails loudly instead of touching a real database.
- **Integration tests:** `test/integration/setup-env.ts` reads
  `DATABASE_URL` from `.env.test` (locally, not committed) or from the
  environment (CI), and fakes everything else. The database name **must end
  in `_test`**: these tests run `TRUNCATE` on every table before each test,
  so they refuse to run against any other database.

One-time setup for the integration tests on your machine:

```bash
docker compose up -d
docker exec -it clinica-db sh -c 'psql -U "$POSTGRES_USER" -c "CREATE DATABASE clinica_test;"'
```

Then create `.env.test` with
`DATABASE_URL=postgres://<user>:<password>@localhost:5433/clinica_test` and
apply the migrations to that database:

```bash
DATABASE_URL=<the .env.test url> npm run migrate up
```

In CI (`.github/workflows/ci.yml`), GitHub Actions starts a PostgreSQL
service with a `clinica_test` database, runs the migrations and then
`npm test`.

---

## Manual tests

Sequence to check that the API works end to end. The commands can be copied
as they are, in order.

### Preparation

```bash
docker compose up -d
```

```bash
docker ps
```

`clinica-db` should appear with status `Up`.

In one terminal:

```bash
npm run dev
```

In another, the rest of the commands.

---

### 1 · The API responds

```bash
curl http://localhost:3000/
```

`Welcome to Clinica API`

---

### 2 · No token, 401

```bash
curl -i http://localhost:3000/patients
```

`401 Unauthorized` · `{"error":"Token not provided"}`

---

### 3 · Registration

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"demo2@example.com","password":"Example123","name":"Demo Two"}'
```

`201` with `id`, `email` and `name`. No `password_hash`.

If the email already exists: `409` · `{"error":"Email is already registered"}`.

---

### 4 · Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"Example123"}'
```

`200` with `token` and `user`.

In the logs, this request takes ~90 ms compared with 1-9 ms for the rest
(bcrypt is slow on purpose).

---

### 5 · Save the token

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"Example123"}' \
  | sed 's/.*"token":"\([^"]*\)".*/\1/')
```

```bash
echo $TOKEN
```

It expires after one hour.

---

### 6 · With a token, 200

```bash
curl http://localhost:3000/patients -H "Authorization: Bearer $TOKEN"
```

`200` with the array of your patients.

---

### 7 · Create a patient

```bash
curl -X POST http://localhost:3000/patients \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Ana Ruiz","age":34,"diagnosis":"Low back pain"}'
```

`201` with the patient and its `id`.

---

### 8 · Validation stops it

```bash
curl -i -X POST http://localhost:3000/patients \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Ana","age":"thirty-four"}'
```

`400` · `{"error":"Invalid data"}`

---

### 9 · Partial update

```bash
curl -X PATCH http://localhost:3000/patients/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"diagnosis":"Discharged"}'
```

`200` with the patient, only the diagnosis changed.

---

### 10 · Identifier errors

```bash
curl -i http://localhost:3000/patients/99999 -H "Authorization: Bearer $TOKEN"
```

`404` · `{"error":"Patient not found"}`

```bash
curl -i http://localhost:3000/patients/abc -H "Authorization: Bearer $TOKEN"
```

`400` · `{"error":"Id must be a number"}`

---

### 11 · Invalid token

```bash
curl -i http://localhost:3000/patients -H "Authorization: Bearer garbage"
```

`401` · `{"error":"Invalid or expired token"}`

In the logs it shows up as `WARN`, not as `ERROR`.

---

### 12 · Appointments

```bash
curl http://localhost:3000/appointments -H "Authorization: Bearer $TOKEN"
```

```bash
curl -X POST http://localhost:3000/appointments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"patient_id":1,"date":"2026-09-15T10:30:00Z","reason":"Follow-up"}'
```

`201` with the created appointment.

---

### 13 · CORS

```bash
curl -i -H "Origin: http://localhost:5173" http://localhost:3000/
```

```bash
curl -i -H "Origin: http://otro-dominio.com" http://localhost:3000/
```

Both return `200` with the body. Only the first one includes the
`Access-Control-Allow-Origin` header.

---

### 14 · Rate limiter

> Run it last: it blocks login for 15 minutes.

```bash
for i in {1..6}; do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"demo@example.com","password":"wrong"}'
done
```

Five `401`s and a `429`.

To unblock it early: restart the server. The counter lives in memory.

---

## If something fails

| Symptom                             | Cause                                                             | Fix                             |
| ----------------------------------- | ----------------------------------------------------------------- | ------------------------------- |
| 500 on everything that touches data | The container is not up                                           | `docker compose up -d`          |
| Sudden 401 on everything            | The token has expired                                             | Repeat step 5                   |
| 429 on login                        | Attempt limit reached                                             | Wait 15 min or restart          |
| Integration tests refuse to start   | `.env.test` missing, or its database name does not end in `_test` | See [Environment](#environment) |
