# Why we touched `.env`, `.env.test` and the happy paths

> Review cheat sheet — today's work (09/09/2026), explained in one go.
> If in two weeks you can't remember why any of this exists, start here.

> **Update:** the tests are now split into two Jest projects. The **unit**
> tests mock the repositories and never touch a database (their
> `DATABASE_URL` points nowhere on purpose). Only the **integration** tests use
> `clinica_test`, and they refuse to run against a database whose name doesn't
> end in `_test`. See [tests.md](tests.md).

---

## The summary in one sentence

**A test that uses the real database is dangerous. You need a fake, disposable database just for tests. And you need to tell your app "use the fake one today" without touching the code.** Everything we did today is that, in different layers.

---

## 1. A test = a checklist, not an exam

An **automated test** is code that calls your own API and checks the response, instead of you opening Postman every time.

It isn't for "passing an exam once". It's for two months from now, when you change something and can't remember what to test by hand. `npm test` tells you in 3 seconds.

```
Analogy: a pilot's checklist before takeoff.
It doesn't trust memory. It runs the same way every time, without skipping anything.
```

---

## 2. Two kinds of test — and why you were missing one

| Kind           | What it tests               | Your example                           |
| -------------- | --------------------------- | -------------------------------------- |
| **Happy path** | Everything goes well        | `POST /patients` with valid data → 201 |
| **Edge case**  | Something fails, on purpose | `POST /patients` without a token → 401 |

**7 of your 8 tests were edge cases.** Not because you decided so — because they're the easy ones: a middleware stops the request _before_ it reaches the database, so they don't need Postgres running to pass.

A real happy path (`create a patient and check it exists`) **does** touch the database: it writes a row and reads it. And that's where the problem starts.

---

## 3. Why you CAN'T test against your usual database

Two reasons, not one:

**Reason 1 — it gets dirty.**
If your "delete patient" test deletes a real patient, every `npm test` wrecks the data you saved by hand for debugging.

**Reason 2 — it becomes a rumour, not a proof.**
A test like _"listing patients returns the list"_ would pass or fail depending on **how many patients there were that particular day**. A test has to give the same result every time; otherwise it's useless — it's noise, not information.

**The solution:** a separate database that gets emptied and refilled from scratch for every test (`TRUNCATE ... CASCADE`, the one you saw in the error). That way the result depends only on your code, never on whatever was saved before.

```mermaid
graph LR
    A[npm test] --> B[TRUNCATE the database]
    B --> C[create clean data]
    C --> D[run the test]
    D --> E[100% predictable result]
```

That separate database is **`clinica_test`** — same Postgres, a different logical database.

---

## 4. Code vs. configuration (why `.env` exists)

A general rule, not just for this project:

- **Code** = what your app does. The same everywhere.
- **Configuration** = what it connects to, with which keys. Different depending on where it runs.

`DATABASE_URL` is configuration: the address you connect to. It can't be hard-coded inside `pool.ts` (`"connect to this specific database"`), because then you couldn't switch databases without changing and recompiling code.

That's why it lives in a `.env` file, outside the code.

You'll see this same idea again with Render: production has its own variables, different from your laptop's, **with the same code**.

---

## 5. Today's full chain

This is the map that connects everything you touched:

```mermaid
graph TD
    A["npm test"] --> B["Jest sets NODE_ENV=test<br/>(on its own, you do nothing)"]
    B --> C["env.ts reads NODE_ENV"]
    C -->|"=== 'test'"| D[".env.test"]
    C -->|"otherwise"| E[".env"]
    D --> F["DATABASE_URL → clinica_test<br/>(disposable database)"]
    E --> G["DATABASE_URL → clinica_dev<br/>(your development database)"]
```

**A single variable (`NODE_ENV`) decides the whole chain below it.** That's why a single `console.log` was enough to confirm the whole flow.

---

## 6. The two bugs you fixed today, one line each

1. **`dotenv.config()` with no argument always loads `.env`.** You had to tell it explicitly which file to load with `{ path: file }`.
2. **The host in `.env.test`'s `DATABASE_URL` was `clinica_test`** (the database name, not the host). It had to be `localhost`, same as in `.env` — only the **database name at the end** of the URL changes, not the host.

---

## Check that you've got it

Without looking above, answer:

1. Why is a test that deletes real data a problem, even if the database is "just your own test data"?
2. Which variable decides whether your app loads `.env` or `.env.test`, and who sets it to `"test"`?
3. In a connection URL (`postgresql://user:pass@host:port/database`), which part did you get wrong when copying `.env` to `.env.test`?
