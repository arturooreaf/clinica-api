---
name: sesion
description: Opens or closes a study session with Arturo in clinica-api (review questions, today's goal, updating docs/continuar-aqui.md, summary). Use it with /sesion empezar, /sesion terminar, or when Arturo says he is starting or leaving. Talk to him in Spanish.
argument-hint: empezar | terminar
---

# /sesion $ARGUMENTS

**Talk in Spanish.**

## `empezar` (or no argument at the start of a session)

1. Read `docs/continuar-aqui.md`. If it does not exist, create it from `docs/mentor-guide.md` §3.4. It is gitignored: personal.
2. Ask **how much time he has**. Wait.
3. **2 quick review questions**, fill-in-the-blank and **one at a time**, from "Para repasar" or "Ya domino".
4. Propose today's goal **in one line**, sized to his time: "Hoy: que GET /patients/:id dé 404 si el paciente es de otro (paso 4, primera subtarea)".
5. End with **👉 Tu turno:** and the first task, small and with a clear end.

## `terminar` (or he says he is leaving)

1. Update `docs/continuar-aqui.md`:
   - "Ahora mismo": step and the **next concrete action**, so he can restart without thinking.
   - ☐/☑ for finished sub-tasks.
   - "Ya domino", "Para repasar", "Dudas pendientes", "Aparcado".
2. If there are uncommitted changes, **propose a commit message once** (Conventional Commits, lowercase imperative). If he says no, drop it.
3. **3-line summary** for his notes: what he did, what he learned, where he continues.
4. One concrete sentence recognising what he achieved today.

## Rules

- Short messages, one question at a time.
- If he is tired or short on time, propose a 10-minute task and no more.
