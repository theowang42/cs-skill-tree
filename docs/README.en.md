# 🌲 cs-skill-tree

[简体中文](../README.md) | English

**A computer science skill tree, like the talent tree in an action game: light up what you know and see where your frontier is.**

- 63 skills you could put on a résumé (Python, Docker, PostgreSQL, Linux systems programming, PyTorch…) in 10 branches, each with its own icon
- Every branch has the same five rows, from beginner to frontier
- Mastered skills are filled black, available ones have a black outline, the rest are light grey. Available skills are your **frontier**
- Opening a skill shows one sentence and a few links to good places to learn it
- Set a **goal direction** to mark what to learn next; progress lives in your browser with export, import and share links, or on an optional SQLite server

👉 https://theowang42.github.io/cs-skill-tree/

![The skill tree with some skills lit and one selected, showing its prerequisite path and a short panel of links](screenshot.jpg)

## Run locally

Requires Node 22.18 or newer. It uses the built-in `node:sqlite` and runs TypeScript directly, so no database server is needed.

```bash
npm ci
npm run dev        # front end only, progress in the browser
npm run dev:api    # front end plus API, progress in SQLite
npm test
```

All content lives in `db/seed/*.sql`, one row per skill. `npm run db:build` rebuilds the database and checks it for cycles, layer violations, numbering gaps and missing content. See [ARCHITECTURE.md](ARCHITECTURE.md) for the schema, commands and API.
