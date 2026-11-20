# Orsola & Loredana's Digital Platforms Trattoria

A review game for the Digital Platforms guest speaker sessions (ESSEC MMD, Fall 2026). Every session is a pasta on the menu, and each pasta has mini-games and a quiz. The difficulty "cooks up" from Spaghetti to the Lasagna final boss.

Built from the Claude Design export with Claude Code. It's plain HTML, CSS and JavaScript with no framework and no build step, so it deploys to Vercel as is.

## Run it on localhost

The levels load their questions from `data/*.json`. Browsers block that when you double-click `index.html`, so start a tiny local server in this folder. Pick one:

```bash
npx serve .
```

```bash
python3 -m http.server 8000
```

Then open the address it prints (`http://localhost:3000` for serve, `http://localhost:8000` for Python).

## Files

| File | What it does |
|---|---|
| `index.html` | The page shell (header, footer) and one `<template>` per view: Il Menù, **Level** (one reusable template for every pasta), La Mia Cucina, Prenota un Tavolo |
| `styles.css` | Every style. Colours, fonts and components follow `DESIGN-SPEC.md` |
| `script.js` | Saved progress, the 4 game engines (`order`, `timed-sort`, `match`, `quiz`), the views and the router |
| `data/levels.json` | The 6 dishes, which are open or locked, the ranks and the progress format |
| `data/spaghetti.json`, `data/penne.json` | Each level's games, answers, questions and page text |

### Addresses

| Address | Page |
|---|---|
| `#menu` | Il Menù (home) |
| `#spaghetti`, `#penne`, … | A level page, built from the level template and `data/<pasta>.json` |
| `#cucina` | La Mia Cucina (profile) |
| `#prenota` | Prenota un Tavolo (login) |

## Add the next pasta (e.g. Fusilli, Session 3)

1. Create `data/fusilli.json` in the same shape as `data/penne.json`.
   - Fill in `level`, `pasta` and `page` (kicker, venue, blurb, table, credit).
   - Add the `games`. Each one needs a unique `id`, such as `fusilli.quiz`, and a `type`: `order`, `timed-sort`, `match` or `quiz`.
2. In `data/levels.json`, change the Fusilli entry to:
   ```json
   { "level": 3, "pasta": "Fusilli", "status": "open", "file": "fusilli.json", "session": "Speaker name" }
   ```

That's it. You don't need to copy an HTML page. The menu card, the level page at `#fusilli`, the bill, the chef hats, the golden forks, the drying rack and the "Next dish" buttons all pick it up. Fusilli, Farfalle, Ravioli and Lasagna already have pasta drawings ready in `script.js` (`ART`).

## Scoring

| Game type | Rules |
|---|---|
| Order | 100 if correct on the first check, −20 per failed check, minimum 20 |
| Sauce Sorter | +10 for a correct snippet, −5 for a wrong one (never below 0), 45 seconds |
| Matching | +20 per pair, −5 per miss (never below 0). The golden fork needs zero misses |
| Quizzes | 10 points per question |

A chef hat is awarded for each finished game, and a golden fork for each perfect score. Progress is saved in the browser under `odp-trattoria-v1`. Ranks follow the thresholds in `data/levels.json`.

## Deploy (from Session 1)

1. **GitHub:** create a new public repo and push this folder to it.
2. **Vercel:** sign in with GitHub → New Project → Import the repo → Deploy.

From then on every push rebuilds the live site, and every pull request gets its own preview link.

## Later: real accounts

"Prenota un Tavolo" is a prototype. It keeps only a nickname in this browser and never stores passwords. For real sign-up, login and shared leaderboards, connect **Supabase**.
