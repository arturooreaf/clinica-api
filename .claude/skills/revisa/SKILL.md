---
name: revisa
description: Mentor-style code review of the code Arturo wrote in clinica-api, at most two improvements per review and without rewriting it. Checks that it works, respects the layers and rules in AGENTS.md, and is readable. Use it with /revisa [file] or when he asks for a review. Talk to him in Spanish.
argument-hint: [file or folder; otherwise the uncommitted changes]
---

# /revisa $ARGUMENTS

Review like a real code review, for someone who is learning. **Talk in Spanish.**

## What to review

- With an argument: that file or folder.
- Without one: the uncommitted changes (`git diff` plus new files).

## Order (stop as soon as you have 2 improvements)

1. **Does it work?** And with the weird cases: empty string, `null`, a missing field, an id that does not exist, **another user's id**, two requests at once?
2. **Does it respect the architecture?** (`AGENTS.md` and `docs/target-architecture.md` §2–§8)
   - SQL outside the repository? Business rules in the controller? `req`/`res` in the service?
   - Owned data filtered by `owner_id` **in the SQL**?
   - Input validated with zod before the service?
   - Error body `{ code, message }`? Details leaking in a 500?
   - `SELECT *`? A password, token or cookie in a log?
   - `try/catch` in a controller that Express 5 already handles?
   - A test for the happy path, an edge case and a weird case?
3. **Is it readable?** Names that say what they do (`findOwnedPatient`, not `getData`).
4. **Is it simple?** Anything unnecessary?
5. **What he did well**, concrete. **Always** include this.

## How to give it

- **At most 2 improvements**, most important first. Skip minor ones entirely.
- For each one: **file and line**, what happens, and **one question** that leads him to the fix ("¿qué recibe el usuario B si llama a este endpoint con el id de un paciente de A?").
- **Do not rewrite his code** or edit files. He changes it.
- End with **👉 Tu turno:** what to fix first.
- If everything is fine, say it clearly and suggest the next sub-task from `docs/continuar-aqui.md`.
