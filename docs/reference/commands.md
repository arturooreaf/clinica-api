# Project commands

Reference for every command needed to work on the project.

To list the available scripts at any time:

```bash
npm run
```

---

## Daily startup

In this order.

```bash
docker compose up -d
```

Starts PostgreSQL in the background (`-d`). The container is called
`clinica-db`. Check that it is up:

```bash
docker ps
```

```bash
npm run dev
```

Starts the API at `http://localhost:3000` with automatic reload on save.

> `tsx` **does not check types**: it strips them and runs the code. Type
> checking is `npm run typecheck`, which is a separate command.

At the end of the day:

```bash
docker compose down
```

---

## Quality checks

The four that must pass before merging any branch.

| Command                | What it checks          | Output if everything is fine                     |
| ---------------------- | ----------------------- | ------------------------------------------------ |
| `npm run typecheck`    | TypeScript types        | no output                                        |
| `npm run lint`         | slips and bad practices | no output                                        |
| `npm run format:check` | formatting              | `All matched files use Prettier code style!`     |
| `npm test`             | behaviour               | Jest summary with every test passing (see below) |

### `npm run typecheck`

```bash
npm run typecheck
```

Runs `tsc --noEmit -p tsconfig.test.json`: checks the types of `src/` and
`test/` without generating JavaScript. It is the only type check in the
project, because `npm run dev` does not do it.

The editor only warns about open files. This command checks all of them.

### `npm run lint`

```bash
npm run lint
```

ESLint over `src` and `test`. Catches forgotten `console.log` calls, unused
variables and problematic patterns. **An ESLint warning does not stop the
program from working**: it points out what should not be done, not what is
broken.

### `npm run format` and `npm run format:check`

```bash
npm run format         # reformats the files
npm run format:check   # only reports, changes nothing
```

The first one is used locally. The second one is the one that runs in
continuous integration, because it fails instead of modifying files.

The configuration is in `.prettierrc` and the exclusions in
`.prettierignore`. `docs/postman/` is excluded because Postman generates it
when exporting.

---

## Automated tests

The tests live in `test/` and run as two Jest projects (see
`jest.config.js`). Full explanation in `docs/reference/testing.md`.

| Command                    | What it runs                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------ |
| `npm test`                 | both projects: `test:unit` first, then `test:integration`                                        |
| `npm run test:unit`        | the `unit` project: the whole HTTP app with the repositories mocked, no database needed          |
| `npm run test:integration` | the `integration` project (`test/integration/`): real SQL against PostgreSQL, one file at a time |
| `npm run test:watch`       | the `unit` project in watch mode: reruns the affected tests on every save                        |
| `npm run test:coverage`    | both projects with a coverage report of `src/`                                                   |

The integration tests need the container to be up and a `.env.test` with a
`DATABASE_URL` whose database name ends in `_test` (they empty every table
before each test, so they refuse to run against any other database). The
unit tests need neither Docker nor `.env.test`.

---

## Database

### Apply migrations

```bash
npm run migrate up
```

Applies the pending migrations in `src/database/migrations`.

### Undo the last one

```bash
npm run migrate down
```

### Create a new migration

```bash
npm run migrate create migration-name
```

Generates a timestamped file in `src/database/migrations`. The execution
order is determined by that timestamp, not by the name.

### Connect to the database

```bash
docker exec -it clinica-db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

The user and the database come from `.env` through `docker-compose.yml`, so
they are read from the container's own variables instead of being typed by
hand.

Inside `psql`:

| Command       | What it does                  |
| ------------- | ----------------------------- |
| `\dt`         | list tables                   |
| `\d patients` | describe the `patients` table |
| `\q`          | quit                          |

### See every database in the container

```bash
docker exec -it clinica-db sh -c 'psql -U "$POSTGRES_USER" -l'
```

Lists every database on the Postgres server, not just the development one.

### Databases in the container

| Database                             | What for                              |
| ------------------------------------ | ------------------------------------- |
| `clinica_dev`                        | development (`npm run dev`)           |
| `clinica_test`                       | integration tests                     |
| `postgres`, `template0`, `template1` | Postgres internals, do not touch them |

### Create a new database

```bash
docker exec -it clinica-db sh -c 'psql -U "$POSTGRES_USER" -c "CREATE DATABASE database_name;"'
```

### Why the single and the double quotes

There are two shells nested inside each other: the one on your machine (the
one that reads `docker exec`) and the one inside the container (the one
started by `sh -c`).

The single quotes `'...'` wrap the whole command like a sealed envelope: they
stop **your machine** from trying to expand `$POSTGRES_USER` before the
command reaches the container -- your machine does not have that variable,
only the container does. Inside, `sh -c` does expand it, with the real value.

The double quotes around the variable (`"$POSTGRES_USER"`) protect the value
in case it has spaces, so it arrives as a single argument.

### The .env.test

Used by the integration tests only. The only value they read from it is
`DATABASE_URL`, pointing to `clinica_test` instead of the development
database; every other variable (`JWT_SECRET`, `CORS_ORIGIN`, the Resend
keys) is set to a fake value by `test/integration/setup-env.ts`. The
database name **must end in `_test`**, or the integration tests refuse to
start. In CI there is no `.env.test`: `DATABASE_URL` comes from the
workflow's environment.

The unit tests do not read it: `test/setup-env.ts` sets fake values for every
variable, including a `DATABASE_URL` that points nowhere on purpose.

The test database needs the tables too. Create it once and migrate it by
pointing `DATABASE_URL` at it for that one command:

```bash
DATABASE_URL=<the .env.test url> npm run migrate up
```

**It is not committed to Git** -- it is in `.gitignore` together with `.env`,
because it holds a real connection string. Same reason as `.env`, same
treatment.

**Gotcha with the Jest extension in VS Code:** that runner starts a
background process that reads `.env.test` **only once**, on startup. If you
change the file afterwards, the extension keeps using the old version in
memory and can mark tests red that pass in the terminal (`npm test`, a new
process every time). If something fails only in the extension and not in the
terminal, restart first: command palette (`Cmd+Shift+P`) -> `Developer:
Reload Window`.

### The full map: the three environments

The whole app decides which database to talk to in a single place:
`DATABASE_URL`, read in `src/common/config/env.ts`. You never have to touch
the code to switch databases, only that variable. Three environments, three
databases, one mechanism:

| Environment                        | Who starts it                   | Database          | Where `DATABASE_URL` comes from                                                                   |
| ---------------------------------- | ------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------- |
| Development (`npm run dev`)        | me, with `docker compose up -d` | `clinica_dev`     | `.env`                                                                                            |
| Tests (`npm run test:integration`) | Jest, with `NODE_ENV=test`      | `clinica_test`    | `.env.test` locally (loaded by `test/integration/setup-env.ts`), the workflow's environment in CI |
| Production (Render)                | Render, 24/7, I do not start it | `clinica-db-prod` | variable set by hand in the Render dashboard                                                      |

None of the three knows the other two exist. The code is identical in all
three places; the only thing that changes is where that variable comes from.
(The unit tests have no database at all: their repositories are mocked.)

**How the tables got into each database:** the migrations
(`npm run migrate up`) are just SQL. They are run with `DATABASE_URL`
pointing at whichever database is needed at the time -- that is why Render
could be migrated from my own machine, without "uploading" anything, just by
changing that variable before the command.

**The Render Build Command** (`npm install --include=dev && npm run build`):
also installs the devDependencies (it needs `typescript`, which is one of
them) and then compiles with `tsc`. The **Start Command** (`npm start`) runs
the JavaScript already compiled into `dist/`, not the original TypeScript.

---

## API documentation

With the API running:

- **Swagger UI** — http://localhost:3000/docs

The specification is in `docs/openapi.yaml`. After changing it, reloading the
browser is enough: it is read when the server starts, so if `npm run dev` is
running the reload is automatic.

**Postman collection** — `docs/postman/clinica-api.postman_collection.json`.
Import it into Postman with _Import > Raw text_.

---

## Quick manual tests

Full sequence in `docs/reference/testing.md`. The minimum:

```bash
curl http://localhost:3000/
```

Save a token in a terminal variable:

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"Example123"}' \
  | sed 's/.*"token":"\([^"]*\)".*/\1/')
```

```bash
echo $TOKEN
```

Use it:

```bash
curl http://localhost:3000/patients -H "Authorization: Bearer $TOKEN"
```

The token expires after one hour. If you get 401 on everything, repeat the
previous step.

---

## Git

### Start a task

```bash
git checkout dev
git pull origin dev
git checkout -b feature/task-name
```

### Before every commit

```bash
npm run typecheck && npm run lint && npm run format:check && npm run test:unit
```

A commit must leave the repository working. If it does not compile, it is
not ready to share.

### Commit

```bash
git add <files>
git commit -m "type: description in the imperative"
```

Prefixes in use:

| Prefix     | What for                                     |
| ---------- | -------------------------------------------- |
| `feat`     | new functionality                            |
| `fix`      | bug fix                                      |
| `chore`    | tooling, configuration, dependencies         |
| `docs`     | documentation that does not affect what runs |
| `style`    | formatting, no logic changes                 |
| `refactor` | reorganization with no behaviour change      |
| `test`     | tests                                        |

A large reformat **always goes in its own commit**: mixed with logic, the diff
becomes impossible to review.

### Merge

```bash
git checkout dev
git merge feature/task-name
git push origin dev
```

```bash
git checkout main
git merge dev
git push origin main
```

```bash
git branch -d feature/task-name
```

### Check the state

```bash
git status --short          # what I have touched
git log --oneline -10       # the latest commits
git diff --stat             # how much each file has changed
git branch --show-current   # which branch I am on
```

---

## Dependencies

```bash
npm install                    # install everything in package.json
npm install <package>          # production dependency
npm install -D <package>       # development dependency
```

Analogy: assembling flat-pack furniture. The `dependencies` are the parts
that stay in the finished piece (legs, screws) -- without them there is no
furniture. The `devDependencies` are the tools to assemble it (screwdriver)
-- you need them while building, but they do not stay attached to the result.
Once `tsc` has compiled the code into `dist/`, that JavaScript runs with
`node` without needing TypeScript installed.

The question that decides where it goes: **does this run on the server?** If
the answer is yes, it goes in `dependencies`.

`pino-pretty` is a development dependency. `yaml` is a production one,
because the API reads `openapi.yaml` on startup.

```bash
npm outdated                   # which packages have a new version
npm audit                      # known vulnerabilities
```

Before upgrading a major version, check the _peer dependencies_: the right
version is not the newest one, it is the newest one that the whole toolchain
supports.

---

## If something fails

| Symptom                                                   | Cause                                                   | Fix                                                   |
| --------------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------- |
| 500 on everything that touches data                       | the container is not up                                 | `docker compose up -d`                                |
| Sudden 401 on everything                                  | the token has expired                                   | log in again                                          |
| 429 on login                                              | limit of 5 failed attempts                              | wait 15 min or restart the server                     |
| A change in `.env` has no effect                          | the variables are read on startup                       | restart `npm run dev` by hand                         |
| ESLint flags nothing in the editor                        | the ESLint server is stuck                              | command palette: `ESLint: Restart ESLint Server`      |
| `command not found: eslint`                               | missing script prefix                                   | use `npm run lint`, not `eslint`                      |
| `Refusing to run integration tests ...`                   | `DATABASE_URL` in `.env.test` is not a `_test` database | point it at `clinica_test`                            |
| `Integration tests need DATABASE_URL ...`                 | no `.env.test` (or no `DATABASE_URL` in it)             | create `.env.test` with the test database URL         |
| Integration tests fail with `relation ... does not exist` | the test database has no tables                         | `DATABASE_URL=<the .env.test url> npm run migrate up` |
