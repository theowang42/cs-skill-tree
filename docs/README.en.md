# cs-skill-tree

[简体中文](../README.md) | English

**A CS skill tree like a game talent tree: light up what you know and see how many skills you are from 20 jobs.**

👉 https://theowang42.github.io/cs-skill-tree/ (the site is in Chinese for now)

![Picking AI application engineer on the home page, lighting up a few known skills in its mini tree, then opening its skill tree](demo.gif)

- **How far from a job**: the home page lists 20 jobs with their recent demand trend; tap one and it opens with its skill tree, tap the skills you know and it shows how many are left
- **181 skills in 10 areas**: foundations, web, client and games, systems, security, data and quant, machine learning, large models, AI infra, robotics, in learning order. Each area is one talent tree, and a skill lights up only after its prerequisites
- **Every skill spelled out**: a one-line bar for “you know it”, a 4 to 6 step learning flow (each step can be lit), and resources tagged by type and whether they are free
- **One tree per job**: only the skills that job needs, e.g. [backend engineer](https://theowang42.github.io/cs-skill-tree/career/backend/) or [LLM algorithm engineer](https://theowang42.github.io/cs-skill-tree/career/llm-algo/)
- **No sign-up**: progress stays in your browser; export, import or share it as a link

![The foundations area growing right from “you”, lit skills in black](screenshot.jpg)

## How to use

1. On the home page, pick the job you want and press “就学这个” (learn this)
2. Open the tree and light up from “you” outward until you reach what you don't know. That is where you are
3. Before lighting a skill, follow its learning flow and tick each step

The tree picks its direction for your screen: usually rightward on a computer, upward on a phone. Scroll or drag to pan; hold Ctrl / ⌘ while scrolling, or pinch, to zoom. With a skill selected, `D` lights it, `X` clears it, `Esc` goes back.

## Run locally

Requires Node 22.18 or newer. No database server needed.

```bash
npm ci
npm run dev        # dev server
npm test           # check the content, run all tests
```

## Change the content

All content lives in `content/`, one Markdown file per skill and per career. The format is described in [CONTRIBUTING.md](../CONTRIBUTING.md) (Chinese). `npm test` checks the content and reports anything wrong.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the database and front end, and [ART.md](ART.md) for the visual rules.

## License

Code is [MIT](../LICENSE). The content in `content/` is [CC BY-SA 4.0](../content/LICENSE.md): reuse and adapt it freely with attribution, and share adaptations under the same license.
