# 🌲 cs-skill-tree

[简体中文](../README.md) | English

**A computer science skill tree that grows from the bottom up: light up what you know and see your frontier and next step.**

- 140 skills you could put on a résumé, from intro programming, data structures, computer systems and operating systems to PyTorch, CUDA, vLLM inference and agents, each with its own icon
- Like a game skill tree: columns growing upward, long chains that fork only at key nodes, and 13 careers along the top row as final nodes that light up on their own once everything they need is lit
- Two states only: lit or not lit

👉 https://theowang42.github.io/cs-skill-tree/

![The skill tree growing up from intro programming, with the Python → NumPy → machine learning → PyTorch chain in the middle](screenshot.jpg)

## Run locally

Requires Node 22.18 or newer. It uses the built-in `node:sqlite` and runs TypeScript directly, so no database server is needed.

```bash
npm ci
npm run dev        # front end only, progress in the browser
npm run dev:api    # front end plus API, progress in SQLite
npm test
```

All content lives in `db/seed/*.sql`, one row per skill. `npm run db:build` rebuilds the database and checks it for cycles, layer violations, numbering gaps and missing content. See [ARCHITECTURE.md](ARCHITECTURE.md) for the schema, commands and API.
