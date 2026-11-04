# 🌲 cs-skill-tree

[简体中文](../README.md) | English

**A computer science skill tree that grows outward from the center: light up what you know and see your frontier and next step.**

- Core CS courses sit at the center (CS61A/B/C, CSAPP, 6.006, 18.06, Stat 110), with 6.S081, CS168, CS149, CS229, 15-445 and 6.824 further out: 17 courses in all
- Around them, 43 skills you could put on a résumé (Python, Linux, CUDA, PyTorch, vLLM inference, Linux kernel development…), each with its own icon
- Like a game skill tree: long chains with forks only at key nodes, and 13 career directions at the branch tips
- Mastered skills are filled black, available ones have a black outline, the rest are light grey
- Opening a skill shows one sentence and a few links

👉 https://theowang42.github.io/cs-skill-tree/

![The skill tree with core courses at the center and the AI infrastructure chain growing upward](screenshot.jpg)

## Run locally

Requires Node 22.18 or newer. It uses the built-in `node:sqlite` and runs TypeScript directly, so no database server is needed.

```bash
npm ci
npm run dev        # front end only, progress in the browser
npm run dev:api    # front end plus API, progress in SQLite
npm test
```

All content lives in `db/seed/*.sql`, one row per skill. `npm run db:build` rebuilds the database and checks it for cycles, layer violations, numbering gaps and missing content. See [ARCHITECTURE.md](ARCHITECTURE.md) for the schema, commands and API.
