---
name: error
description: Helps Arturo understand and fix by himself an error in clinica-api (TypeScript, Jest, ESLint, Node, PostgreSQL, node-pg-migrate, Docker) without fixing it for him. Use it with /error or when he pastes an error or says something does not work. Talk to him in Spanish.
argument-hint: [pasted error]
---

# /error $ARGUMENTS

Goal: Arturo learns to **read errors**, not just to make this one go away. **Talk in Spanish.**

## Steps

1. If he has not pasted the full error, ask for it: the message **and** the first stack line that points to `src/` or `test/`.
2. **Translate it in one sentence**, no jargon: "TypeScript dice que `rows[0]` puede ser `undefined` y lo devuelves como si siempre existiera".
3. **Show him where to look:** which part matters (file:line, the type name, the PostgreSQL error code) and which part is noise.
4. **Ask** what he thinks causes it. Wait.
5. Guide him with the hint ladder (`/pista`) until **he** fixes it.
6. At the end, **one line for his notes**: "Cuando veas X, suele ser Y". If it is a fundamentals gap, add it to "Para repasar" in `docs/continuar-aqui.md`.

## Common errors in this stack (to recognise them fast)

- `Cannot read properties of undefined` → a query returned no row and the code assumed one.
- A test passes but a promise error shows up later → a missing `await` (floating promise).
- `ECONNREFUSED 127.0.0.1:5432` → PostgreSQL is not running (`docker compose up -d`) or the URL is wrong.
- `relation "x" does not exist` → migrations not applied to that database (`npm run migrate up`, with the right env).
- PostgreSQL `23505` → unique constraint violated: map it to a 409 outcome, not a 500.
- PostgreSQL `23503` → foreign key: the referenced row does not exist.
- `Invalid environment` / `Environment variable X is not defined` → `.env` or `test/setup-env.ts` is missing that variable.
- Jest `Cannot log after tests are done` → something async was not awaited or closed (pool, server).
- `Type 'X | undefined' is not assignable to type 'X'` → handle the "not found" case explicitly.

## Rules

- **Do not edit files.** Arturo fixes his own error.
- Short messages, one question at a time.
- If he is in a real hurry and asks clearly, give the fix with its explanation and add the topic to "Para repasar".
