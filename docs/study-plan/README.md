# Things to reinforce

Priority topics spotted while working on the project, written down so you
have them at hand and don't depend on remembering them. It isn't a homework
list: it's a diagnosis of where the gap is between what you build and what you
understand.

Source: session of 10/09/2026 (test database, happy paths and first edge cases).

---

## 1. Priority number one: JavaScript fundamentals

The project is ahead of the fundamentals. That's normal when you're learning
while building a real project, but it carries a specific risk: the repo opens
doors, and the fundamentals decide whether you get in.

What needs to settle, in order:

**Promises and `async` / `await`.** Half a session went into nailing this down.
The essentials:

- Every function marked `async` returns a Promise. Always, even if you write
  `return 5`.
- The Promise is the cloakroom ticket, not the coat. `await` is going to the
  counter to pick it up.
- **Without `await` the action still runs.** What you lose isn't the action:
  it's waiting for the result, finding out what it returned, and finding out if
  it failed.
- A Promise nobody picks up (_floating promise_) is an object, and every object
  is _truthy_. An `if` on it always goes in. A silent failure.

**The event loop.** Why "waiting" inside a function doesn't freeze the server.
Without this, `async` in Node will always feel like magic.

**And after that:** closures, `this`, `undefined` vs `null`, `===` vs `==`.

Reading: MDN, the "Using promises" guide. A short, steady slot of time, separate
from the project.

---

## 2. Three error patterns that kept coming back

They aren't one-off slips; they're habits, and that's why they can be fixed.

### 2.1. Copying an assert without translating the intent

It happened three times in the same session:

- In the `GET`'s 403 test, the assert was `toHaveProperty("id")` — in other
  words, that the response included the other doctor's patient data. That's a
  security hole, and the test was celebrating it.
- In the `PATCH`'s 403 test, the assert was that the body contained
  `"recovered"` — in other words, that the intruder had managed to change it.
- In the same test, the assert was `rowCount === 0`, copied from the `DELETE`,
  when a `PATCH` doesn't delete anything and that row is always there.

**In a denial test, almost every assert goes the opposite way from the happy
path you copied it from.**

Practical rule: before accepting an `expect`, read it out loud in plain English.
"I assert that the change was applied" — is that what you want to test? Ten
seconds.

### 2.2. Misspelled strings

`/Authorization` with a slash, `Autorization` without the h. Twice on the same
day.

The problem is that **TypeScript doesn't protect strings**. A header name is a
`string` you build yourself; the compiler doesn't know whether it's spelled
right. And the symptom is misleading: the header isn't found, there's no token,
and you get a **401** when you expected something else.

Rule: if an authorization test returns a 401 for no reason, the first thing to
check is how that word is spelled.

### 2.3. Reasoning correctly and then doing the opposite

In the 404 test the question was whether any data needed to be set up. The
answer was right: "no, because the `beforeEach` already wipes everything". And
right after that, a user and a patient were inserted.

Trust your own reasoning. If you've reached a conclusion and written it down,
stick to it.

---

## 3. Concepts worth reviewing

**Types disappear when you compile.** Not a trace of a `type` is left in
`dist/`. That's why a type **doesn't validate** what arrives in `req.body` —
that's what the validation middleware is for. And that's why the test that
checks the API never returns `password_hash` is the only thing protecting that
promise at runtime, not the `UserView` type.

**A table is not the same as a database.** `owner_id` points to the `users`
table, which lives in the **same** database. That's a foreign key.

**Constraints.** Rules the database itself enforces, no matter who's asking:
`PRIMARY KEY`, `UNIQUE`, `FOREIGN KEY`. You can read them by their name —
`patients_owner_id_fkey` is table, column and type. Validating in the code only
protects the path that goes through your API; the constraint always protects
the data.

**The result of `pool.query`.** `rowCount` is a number: how many rows. `rows` is
an array with the content, and each item is an object whose keys are the column
names. Counting rows isn't the same as looking inside them.

**Read the whole error.** `WHERRE` with two r's, an `fkey` that said exactly
which column pointed to a user that didn't exist. The message almost always
points right at the spot.

---

## 4. Two families of red

Telling them apart saves hours.

**An assert fails:**

```
Expected: 404
Received: 401
```

The code reached the end and returned something else. **There's a bug in your
code.**

**Something blows up:**

```
error: deadlock detected
error: duplicate key value violates unique constraint
```

It's an exception: the test didn't even get to check anything. It could be your
code — or the environment.

Three signs that it's the environment and not you:

1. Tests you haven't touched are failing.
2. They were passing twenty minutes ago with the same code.
3. The error speaks the language of the database or the network, not the
   language of your domain.

**Rule: when something you haven't touched fails, don't search in what you did
touch. Look for what changed around it.**

---

## 5. Real-project things you've already run into

This isn't theory: it happened to you.

**Shared state and concurrency.** The whole suite shares a single database and
assumes nobody else is touching it. The VS Code Jest extension was running in
the background with `--watch` and truncating and inserting at the same time:
deadlocks and duplicate keys. The real fix is to isolate each test —
transactions with `ROLLBACK`, or one database per process.

**_Flaky_ tests.** A test that fails one time in ten is worse than one that
always fails: people learn to just rerun it, and the day it catches a real bug
nobody will pay attention. With a flaky test, **one green run proves nothing**:
verifying means running it ten times.

**`push` doesn't merge.** `push` uploads what your local branch already has;
the one that brings in commits from another branch is `merge`. Skipping the
merge and pushing gives a perfectly valid success message that carries none of
the new work. It already happened.

**`.git/index.lock`.** It's the "busy" sign Git puts up before writing to the
index. If the process dies without removing it, it blocks everything. You can
delete it, but only after checking that no Git process is really still running.

**The branch decides what you see.** Being on `main`, looking at a file, and
thinking work was lost when it's committed on another branch. Check which branch
you're on before drawing conclusions.

---

## 6. Suggested order

1. **JavaScript fundamentals**, outside the project and every day. It's the
   investment with the highest return.
2. **Real SQL**: joins, indexes, `EXPLAIN`, transactions. The database is a
   backend's main tool.
3. **Read errors slowly** before touching anything.
4. And keep building, because that's what works.

---

## 7. Pending technical debt in the project

Written down so it doesn't get lost:

- Duplicated fixtures: the same `INSERT` block repeated in many tests. Extract
  them into _factories_ once the edge cases are done. _(Done: `test/builders.ts`
  and `test/integration/db.ts`.)_
- Test isolation: replace `TRUNCATE` with transactions and `ROLLBACK`.
- Coverage: measure which lines no test touches. _(Done: `npm run
test:coverage`.)_
- CI with GitHub Actions: run the gate on every push. _(Done:
  `.github/workflows/ci.yml`.)_
- Pagination in `GET /patients` and an index on `owner_id`. You really notice
  them with large amounts of data (a _seeding_ script with faker).
- `patient.service.ts`: the variable `owner_Id` with a capital I.
- The `RETURNING` of the `update` in the repository doesn't return `owner_id`,
  unlike the `create`.
