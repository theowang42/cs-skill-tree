# 🌲 cs-skill-tree

[简体中文](../README.md) | English

**A computer science skill web that grows outward from the center: light up what you know and see your frontier and next step.**

- 46 skills you could put on a résumé (Python, C, Linux, CUDA, PyTorch, vLLM inference, OS kernels…), each with its own icon
- Foundations sit at the center; AI infrastructure, systems, AI products, quant, security, robotics and blockchain grow out in different directions
- Mastered skills are filled black, available ones have a black outline, the rest are light grey
- Opening a skill shows one sentence and a few links

👉 https://theowang42.github.io/cs-skill-tree/

![The skill web with foundations at the center and AI infrastructure growing upward](screenshot.jpg)

## Run locally

Requires Node 22.18 or newer. It uses the built-in `node:sqlite` and runs TypeScript directly, so no database server is needed.

```bash
npm ci
npm run dev        # front end only, progress in the browser
npm run dev:api    # front end plus API, progress in SQLite
npm test
```

All content lives in `db/seed/*.sql`, one row per skill. `npm run db:build` rebuilds the database and checks it for cycles, layer violations, numbering gaps and missing content. See [ARCHITECTURE.md](ARCHITECTURE.md) for the schema, commands and API.
