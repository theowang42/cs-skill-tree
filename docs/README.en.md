# 🌲 cs-skill-tree

[简体中文](../README.md) | English

**A star map of computer science. You sit at the center, the skills you know are lit stars, and the edge of the lit region is your learning frontier.**

- 225 stars (183 concepts plus 42 languages, frameworks and platforms) joined by 325 prerequisite edges. Fundamentals sit near the center; each ring outward is more advanced
- Every star lists concrete checks for "you have learned this", so self-assessment stays honest
- **Frontier** stars glow cyan: all prerequisites mastered, not learned yet. They are what to learn next
- Beacons on the rim are career directions. Set one as your **goal** to see the learning order and how ready you are
- Select a star to trace its prerequisite path back to the center and the stars it unlocks; lighting one sends light along the edges to newly unlocked stars
- Progress lives in your browser with export, import, share links and a replay of your growth; an optional server keeps it in SQLite

👉 https://theowang42.github.io/cs-skill-tree/

![The star map with a lit region, one star selected with its prerequisite path drawn to the center, and the learning order for the backend goal](screenshot.jpg)

## Run locally

Requires Node 22.18 or newer. It uses the built-in `node:sqlite` and runs TypeScript directly, so no database server is needed.

```bash
npm ci
npm run dev        # front end only, progress in the browser
npm run dev:api    # front end plus API, progress in SQLite
npm test
```

All content lives in `db/seed/*.sql`, one row per skill. `npm run db:build` rebuilds the database and checks it for cycles, layer violations, numbering gaps and missing content. See [ARCHITECTURE.md](ARCHITECTURE.md) for the schema, commands and API.
