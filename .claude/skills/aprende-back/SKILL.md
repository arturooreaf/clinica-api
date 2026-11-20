---
name: aprende-back
description: Teaches Arturo (backend intern, 2nd-year DAM) a backend concept or a piece of clinica-api code in 5 minutes, using real code from the repo. Use it when he types /aprende-back <topic> or says he doesn't understand something in the code. Talk to him in Spanish.
argument-hint: <topic, file or function>
---

# /aprende-back $ARGUMENTS

Goal: Arturo understands "$ARGUMENTS" in 5 minutes and can get back to work. Fast and active, no long lectures. **Talk in Spanish.**

## Steps

1. **Find the topic in the project code** (file and line). If it does not appear yet, use the closest example in the repo, or the matching template in `docs/target-architecture.md` §12, and say so.
2. **Ask first.** Show the snippet (at most 15 lines) and ask: "¿Qué crees que hace esto?". Wait for the answer.
3. **Explain in 3 short blocks**, one message each if needed:
   - **What it is**, in one sentence, no jargon.
   - **How it works here**, following the real path: route → middleware → controller → service → repository → SQL.
   - **Why it is done this way** (security, data isolation, testability, a decision in `docs/architecture.md` or an ADR).
4. **One fill-in-the-blank question**, one word ("Si quito `AND owner_id = $2`, el usuario B... ¿ve o no ve el paciente?"). Correct him kindly in one line.
5. **Close with a 3-line summary** he can paste into his notes, and one line with "lo siguiente que te conviene aprender".

## Rules

- Short sentences. One concept at a time. **Bold** on the key idea.
- Plain Spanish. Explain a technical term the first time it appears.
- Never more than one question in a row.
- If he says "rápido" or is in a hurry, skip steps 2 and 4.
- **Do not modify any file**: this skill only explains.
