# clinica-api

[![CI](https://github.com/arturooreaf/clinica-api/actions/workflows/ci.yml/badge.svg)](https://github.com/arturooreaf/clinica-api/actions/workflows/ci.yml)
![Node.js](https://img.shields.io/badge/Node.js_24-5FA04E?style=flat-square&logo=nodedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Express](https://img.shields.io/badge/Express_5-000000?style=flat-square&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL_16-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)

REST API to manage **patients and appointments** for a clinic, with user authentication and per-user data ownership.

Built with Node.js, TypeScript and Express on top of PostgreSQL, using plain SQL with parameterized queries, versioned migrations and integration tests against a real database.

---

## Features

- **Authentication:** registration and login with **bcrypt**-hashed passwords and **JWT** access tokens.
- **Data ownership:** every patient belongs to the user who created it. A user can't read, update or delete another user's patients.
- **Patients and appointments:** full CRUD with partial updates (`PATCH`).
- **Transactional email** through [Resend](https://resend.com).
- **OpenAPI documentation** served with Swagger UI at `/docs`.
- **Rate limiting:** 5 attempts every 15 minutes on login and register, 100 requests every 15 minutes elsewhere.
- **Structured logging** in JSON with Pino.
- **Fail-fast configuration:** the app refuses to start if a required environment variable is missing.

## Tech stack

| Technology               | Purpose                                          |
| ------------------------ | ------------------------------------------------ |
| **Node.js + TypeScript** | Runtime and static typing (strict mode)          |
| **Express 5**            | HTTP routing and middleware                      |
| **PostgreSQL 16 + `pg`** | Relational database, parameterized SQL queries   |
| **node-pg-migrate**      | Versioned database migrations                    |
| **JWT + bcrypt**         | Authentication and password hashing              |
| **Jest + Supertest**     | Integration tests against a real PostgreSQL      |
| **ESLint + Prettier**    | Linting and formatting                           |
| **Docker**               | Database, API image and full local stack         |
| **GitHub Actions**       | CI: lint, format, typecheck, build, tests, image |

## Architecture

The code is organized **by domain module**, and each module is split into layers that only talk to the layer next to them:

```
HTTP request
   │
   ▼
routes ─► controller ─► service ─► repository ─► PostgreSQL
          (HTTP)        (business)  (SQL)
```

- The **controller** knows HTTP: it reads the request and picks the status code.
- The **service** knows the business rules.
- The **repository** knows SQL. No other layer writes queries.

```
src/
├── server.ts                 Entry point
├── app.ts                    Express app: middleware, routes, Swagger
├── common/                   Shared code
│   ├── config/env.ts         Loads and validates environment variables
│   ├── logger.ts             Pino instance
│   └── middlewares/          auth, cors, error, logger, rate limit
├── database/
│   ├── pool.ts               PostgreSQL connection pool
│   └── migrations/           Schema history
└── modules/                  One business domain per folder
    ├── auth/
    ├── patients/
    ├── appointments/
    └── email/
```

Dependencies always point **from modules to `common/`**, never the other way around.

## Getting started

### Option A: everything in Docker

```bash
cp .env.example .env                        # fill in the values
docker compose --profile full up -d --build
```

This starts PostgreSQL, runs the migrations and starts the API at `http://localhost:3000`.

### Option B: local development

```bash
cp .env.example .env
docker compose up -d     # only PostgreSQL
npm install
npm run migrate up
npm run dev              # http://localhost:3000, reloads on save
```

### Environment variables

| Variable                                              | Example                                           |
| ----------------------------------------------------- | ------------------------------------------------- |
| `DATABASE_URL`                                        | `postgres://user:password@localhost:5433/clinica` |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Credentials for the database container            |
| `JWT_SECRET`                                          | Random string, e.g. `openssl rand -base64 32`     |
| `CORS_ORIGIN`                                         | Allowed origins, comma-separated                  |
| `RESEND_API_KEY` / `RESEND_FROM`                      | Resend credentials and sender address             |
| `PORT`                                                | Optional, defaults to `3000`                      |

## API

Interactive documentation at **`http://localhost:3000/docs`** (source in [`docs/openapi.yaml`](docs/openapi.yaml)).

| Method   | Endpoint            | Auth | Description                             |
| -------- | ------------------- | :--: | --------------------------------------- |
| `POST`   | `/auth/register`    |      | Create a user (409 if the email exists) |
| `POST`   | `/auth/login`       |      | Get a JWT valid for 1 hour              |
| `GET`    | `/patients`         | Yes  | List your patients                      |
| `GET`    | `/patients/:id`     | Yes  | Get one of your patients                |
| `POST`   | `/patients`         | Yes  | Create a patient                        |
| `PATCH`  | `/patients/:id`     | Yes  | Update some fields                      |
| `DELETE` | `/patients/:id`     | Yes  | Delete a patient                        |
| `GET`    | `/appointments`     | Yes  | List appointments                       |
| `GET`    | `/appointments/:id` | Yes  | Get an appointment                      |
| `POST`   | `/appointments`     | Yes  | Create an appointment                   |
| `PATCH`  | `/appointments/:id` | Yes  | Update some fields                      |
| `DELETE` | `/appointments/:id` | Yes  | Delete an appointment                   |
| `POST`   | `/emails`           | Yes  | Send an email                           |

Protected endpoints require the header `Authorization: Bearer <token>`.

## Testing

```bash
npm test
```

The test suite runs **against a real PostgreSQL database**, not mocks. Every test starts from empty tables (`TRUNCATE ... CASCADE`), and the suite covers happy paths, validation errors (400), missing or invalid tokens (401), missing resources (404) and **ownership rules**: a user can't access another user's patients.

Locally, tests read their configuration from `.env.test`. In CI, GitHub Actions starts a PostgreSQL service container, runs the migrations and then the tests on every push.

## Security

- Passwords hashed with **bcrypt**; never stored in plain text.
- **Short-lived JWTs** (1 hour).
- **Parameterized queries** (`$1`, `$2`) everywhere, so input is never interpreted as SQL.
- **Rate limiting** on authentication endpoints against brute force.
- **CORS** restricted to the configured origins.
- **Secrets out of the code:** `.env` is git-ignored; only `.env.example` is versioned.

## Scripts

| Command                | What it does                        |
| ---------------------- | ----------------------------------- |
| `npm run dev`          | Start the server and reload on save |
| `npm run build`        | Compile TypeScript to `dist/`       |
| `npm start`            | Run the compiled server             |
| `npm test`             | Run the test suite                  |
| `npm run lint`         | Lint with ESLint                    |
| `npm run format:check` | Check formatting with Prettier      |
| `npm run typecheck`    | Type-check without emitting files   |
| `npm run migrate up`   | Apply pending migrations            |
| `npm run migrate down` | Revert the last migration           |

## Roadmap

- [x] CRUD for patients and appointments
- [x] Authentication with JWT and bcrypt
- [x] Per-user ownership of patients
- [x] OpenAPI documentation with Swagger UI
- [x] Integration tests with Jest and Supertest
- [x] CI with GitHub Actions and a Docker image
- [ ] Ownership rules for appointments
- [ ] Schema-based input validation on every endpoint
- [ ] Custom error classes handled by the global error middleware
- [ ] Refresh tokens and token revocation
- [ ] Public deployment with live Swagger docs
