# Design spec — Digital Platforms Trattoria

Reference implementation: the Claude Design export (`*.dc.html`, one file per page). When in doubt, copy what those files do.

## 1. Look and feel

Warm, playful Italian trattoria. Cream paper, red-and-white checkered tablecloth strips, chalkboard handwriting for titles, chunky rounded buttons with a solid "pressed" shadow.

### Colour tokens

| Token | Hex | Use |
|---|---|---|
| `--cream` | `#FFF7EC` | Page background |
| `--ink` | `#2B1D14` | Body text |
| `--ink-soft` | `#4A3B2C` | Secondary text |
| `--muted` | `#6B5A45` | Labels, locked states |
| `--tomato` | `#C0392B` | Primary buttons, accents, checkers |
| `--tomato-dark` | `#8E2A1F` | Button shadow, meatballs |
| `--error` | `#A93226` | Error / wrong text |
| `--basil` | `#2E6B34` | Secondary buttons, footer, success |
| `--basil-dark` | `#1E4A23` | Button shadow, success text |
| `--pasta` | `#F2C14E` | Pasta drawings, HTML pot |
| `--pasta-deep` | `#E0A82E` | Progress fills, focus ring, strand borders |
| `--crust` | `#D49A22` | Pasta outlines |
| `--dough` | `#F6E6CC` | Chips, tracks, nav hover |
| `--paper-edge` | `#F0DDBD` | Card borders |
| `--bill-dash` | `#E3C9A0` | Dashed bill borders |
| `--success-bg` / `--error-bg` | `#E3F0DF` / `#FDECEA` | Answer states |

### Type

Google Fonts:
- **Fredoka** (500–700): headings, buttons, numbers.
- **Caveat** (700): chalkboard / handwritten titles ("Il Conto", "Benvenuti, studenti!", "Still in the kitchen…").
- **Nunito** (400–800): body text.
- **JetBrains Mono** (500): code snippets in Sauce Sorter.

- H1: Fredoka 700, `clamp(40px, 6vw, 66px)` on home, `clamp(34px, 5vw, 52px)` on levels.
- Body: Nunito, 15–18px.

### Recurring elements

- **Checkered strip:** `repeating-conic-gradient(var(--tomato) 0 25%, var(--cream) 0 50%) 0 0 / 16px 16px`, 16px tall, at the top and bottom of every page and on top of the game panel.
- **Buttons:** pill, min-height 44px, Fredoka 600.
  - Red: `box-shadow: 0 4px 0 #8E2A1F`.
  - Green: `0 4px 0 #1E4A23`.
  - Ghost: white with a 2px ink border.
  - All buttons press down 3px on `:active`.
- **Il Conto (the bill):** white card, `2px dashed var(--bill-dash)`, `box-shadow: 0 6px 0 var(--paper-edge)`, tilted ±1–1.5deg. Caveat title, dotted row separators. Used for the score counter on every page and every game.
- **Header:**
  - Logo: a green circle with two yellow squiggles, then "Orsola & Loredana's Digital Platforms" (Caveat, tomato) over "Trattoria" (Fredoka).
  - Nav: Il Menù · La Mia Cucina · red "Prenota un Tavolo" button, which reads "Tavolo di {nick}" when signed in.
- **Footer:** basil green band, "Buon appetito e buono studio!" in Caveat.
- **Focus ring:** `3px solid var(--pasta-deep)`, offset 3px.

## 2. Pages

### Il Menù (`index.html#menu`) — `design-source/Main.dc.html`
- **Hero:**
  - "Benvenuti, studenti!" (or "Bentornati, {nick}!"), then "Pick a pasta. Play a game. Earn your Parmigiano." with the last line in red.
  - Buttons: "Mangia! Start playing" → Spaghetti, "See my kitchen" → profile.
- **Bill card:** Parmigiano points (XP), chef hats x/7, golden forks x/7, dishes finished x/6, pasta drying rack bar.
- **Menu grid:** `repeat(auto-fill, minmax(168px, 1fr))`, one card per level.
  - Open card: white, 3px tomato border, solid red shadow. Shows a level label and a status chip ("Pronto!", "In cottura" or "Finito!"), the pasta drawing, the name, the session, a list of games, "x / n games cooked" and a "Mangia! Play" button.
  - Locked card: dashed border, lock icon and a **closed cloche** drawing. "Session N · [Speaker TBC]", then "Still in the kitchen…" (Caveat), then a disabled "Coming soon" button.
  - Lasagna gets a red border and a crown (BOSS).
- **"Come funziona":** 3 steps (Pick a dish → Play the mini-games → Collect Parmigiano).

### Level pages (`index.html#<pasta>`, one reusable template) — `design-source/Spaghetti.dc.html`, `Penne.dc.html`
- **Hero:** a round plate with the pasta drawing, "Level N · Session N · date", "Pasta · Speaker" and a summary.
- **Level bill:** the best score per game, then "Totale Parmigiano".
- **Game tabs:** cards with a kicker, a name and a status ("Not cooked yet" or "Best: X XP · golden fork"). The active tab gets a red border and shadow.
- **Game panel:** a white card with a checkered top. Each game shows its own mini bill: Punti plus Tentativi, Tempo or Domanda.
- **Footer links:** previous/next dish and back to the menu.

### La Mia Cucina (`#cucina`) — `design-source/Cucina.dc.html`
- **Avatar:** a chef hat, "Chef {nick | Ospite}" and the rank.
  - Ranks by XP: 0 Lavapiatti, 100 Commis, 250 Cuoco, 450 Sous-chef, 650 Chef de Cuisine.
  - A progress bar shows the way to the next rank.
- **Pasta drying rack:** a wooden rod with 6 pegs and hanging strands per level. Full colour = level finished, faded = partly done, dashed grey = locked.
- **Chef hats:** one per game completed (7).
- **Golden forks:** one per perfect score (7).
- **Reset progress:** an inline two-step confirm, with no browser dialogs. It keeps the nickname.

### Prenota un Tavolo (`#prenota`) — `design-source/Prenota.dc.html`
- **Reservation card:** tilted red card behind, checkered top, cloche icon.
- **Tabs:** "New table" / "I have a booking".
- **Fields:** "Nickname or email" and a password with a Show/Hide button.
- **Validation:** the field is required, an email must have a valid format and the password must be ≥ 6 characters. Errors use `role="alert"`.
- **On success:** saves only `nick` (the part of an email before the @, capitalised) and shows "Tavolo confermato!" with a menu link and Log out.
- **Note shown on the card:** prototype only, never stores passwords, use Supabase for real accounts.

## 3. Game engines (data in `data/*.json`)

| Type | Used by | Rules |
|---|---|---|
| `order` | Untangle the Spaghetti, Dal Forno al Tavolo, Passa il Piatto | Shuffled pool (never already solved) and numbered empty slots. Tap a pool item → next empty slot. Drag it onto a specific slot (it swaps out anything already there). Tap a filled slot → back to the pool. "Assaggia! Check" marks wrong slots red. Score 100, −20 per failed check, min 20. On success, show a green "Ricetta del giorno" recap box. |
| `timed-sort` | Sauce Sorter | Start screen. 45 s countdown bar (turns red ≤ 10 s). One snippet at a time drops in with a bounce animation onto a dark code "counter". Three big pot buttons (HTML yellow, CSS tomato, JS basil). +10 right, −5 wrong (floor 0), streak counter, inline feedback explaining the right file. Ends on timeout or after 12, then shows a recap of index.html / styles.css / script.js. |
| `match` | La Brigata | Left: roles with PLANNING (green chip) or PRODUCTION (red chip). Right: shuffled outputs. Select a role, then an output. +20 match, −5 miss. Matched pairs turn green and lock. |
| `quiz` | both quizzes | One question at a time, 4 lettered options. After answering, the correct option turns green and a wrong pick turns red, then show "Esatto!" or "Non proprio." with the explanation. 10 pts each. A final screen shows the score and "Ask me again". |

**Win overlay** (perfect or near-perfect results):
- About 34 pasta-shaped confetti pieces (penne, farfalle, spaghetti curls) fall in palette colours.
- A centred card shows animated red lips (chef's kiss) with a floating heart, "Perfetto!" or "Che bello!" in Caveat 46px, "MWAH! CHEF'S KISS", a line of text and a "Grazie, chef!" button.
- It auto-closes after about 4 s.
- With `prefers-reduced-motion`, all animation is off.

**Progress:** after each finished game, write `{best, done, perfect}` under `games[gameId]` in localStorage (`odp-trattoria-v1`). Every page reads it on load and on window focus.

## 4. Responsiveness and accessibility
- Fluid layouts: flex-wrap and auto-fit grids, max content width 1120px, 24px side padding. Everything stacks at phone width.
- Real `<button>`, `<a href>`, `<label for>`. `aria-pressed` on tabs and selectable chips. `aria-live="polite"` on the game panel. Decorative SVGs get `aria-hidden`.
- Touch targets ≥ 44px. Text contrast ≥ 4.5:1 (the palette above passes on cream and white).
