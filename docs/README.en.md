# 🌲 cs-skill-tree

[简体中文](../README.md) | English

**A computer science skill tree you light up as you learn, so you always know where your learning frontier is.**

- 225 skills (183 concepts plus 42 languages, frameworks and platforms) linked by 325 prerequisite edges
- Every skill lists concrete checks for "you have learned this", so self-assessment stays honest
- **Learning frontier**: skills whose prerequisites you have all mastered but you have not learned yet
- Pick a **goal direction** such as agent development, backend or OS kernels to see the skills it needs, the order to learn them and how ready you are
- Progress lives in your browser, with export, import and share links; an optional server keeps it in SQLite

👉 https://theowang42.github.io/cs-skill-tree/

![The skill tree with mastered skills filled in and one skill selected, showing its prerequisite path and the learning order for the backend goal](screenshot.jpg)

## Run locally

Requires Node 22.18 or newer. It uses the built-in `node:sqlite` and runs TypeScript directly, so no database server is needed.

```bash
npm ci
npm run dev        # front end only, progress in the browser
npm run dev:api    # front end plus API, progress in SQLite
npm test
```

All content lives in `db/seed/*.sql`, one row per skill. `npm run db:build` rebuilds the database and checks it for cycles, layer violations, numbering gaps and missing content. See [ARCHITECTURE.md](ARCHITECTURE.md) for the schema, commands and API.
