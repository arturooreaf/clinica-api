# Project documentation

Index of all the documentation. If you do not know where to start, start
here.

---

## Understanding the project

| Document                                           | What for                                                                                                                                                                       |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`architecture.md`](architecture.md)               | The layers, what each one does and is forbidden to do, the full journey of a request, and the questions I may be asked about the design                                        |
| [`openapi.yaml`](openapi.yaml)                     | The API specification. **Do not move it:** `src/app.ts` reads it on startup with `path.join(__dirname, "../docs/openapi.yaml")`; if it is not there, the server does not start |
| [`target-architecture.md`](target-architecture.md) | Where the API is going: the gap between today and a production-grade design, code templates and a step-by-step roadmap                                                         |
| [`mentor-guide.md`](mentor-guide.md)               | How the AI mentor teaches in this repo (session shape, hint ladder, progress file). Agent rules live in [`../AGENTS.md`](../AGENTS.md)                                         |

---

## Day-to-day reference

| Document                                         | What for                                                                                                              |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| [`reference/commands.md`](reference/commands.md) | Every project command: startup, quality checks, tests, database, Git, dependencies, and what to do if something fails |
| [`reference/api.md`](reference/api.md)           | Guide to using the endpoints, with request and response examples                                                      |
| [`reference/testing.md`](reference/testing.md)   | The automated test suite (Jest) and a manual test sequence with `curl`                                                |
| [`postman/`](postman/)                           | Exported Postman collection. Excluded from Prettier in `.prettierignore`                                              |

---

## Study notes

My own notes on what I have been learning. They are not project
documentation: they are so I do not forget.

| Document                                                     | What for                                                                        |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| [`cheatsheets/tests.md`](cheatsheets/tests.md)               | Jest, supertest, the two phases, what to test and what not                      |
| [`cheatsheets/javascript.md`](cheatsheets/javascript.md)     | My weak spots in core JavaScript, with the specific error each one caused       |
| [`cheatsheets/environments.md`](cheatsheets/environments.md) | Why `.env` and `.env.test` exist, and the whole chain down to the test database |

---

## Layout of this folder

```
docs/
├── README.md              this index
├── architecture.md        how it is built on the inside
├── openapi.yaml           API specification (DO NOT MOVE)
├── postman/               exported collection
├── reference/            day-to-day reference
│   ├── commands.md
│   ├── api.md
│   └── testing.md
├── cheatsheets/              study notes
│   ├── tests.md
│   ├── javascript.md
│   └── environments.md
└── study-plan/              areas to strengthen
    └── README.md
```

---

## Known documentation debt

- `reference/api.md` and the manual section of `reference/testing.md`
  overlap: both explain how to try the endpoints by hand with `curl`. They
  should be merged into one, or each should state clearly what it covers.

## Areas to strengthen

- [`study-plan/README.md`](study-plan/README.md) — areas to strengthen found
  while working on the project: weak fundamentals, recurring error patterns,
  and pending technical debt.
