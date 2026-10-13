# Architecture

The app is plain HTML, CSS and JavaScript. There is no framework and no build step, so what's in the repo is exactly what GitHub Pages serves.

## Files

| File | Role |
|---|---|
| `index.html` | Static shell: `#top` (header), `#main` (current tab), `#tabs` (bottom bar), `#sheet` (bottom sheet), `#toast`. |
| `css/styles.css` | Colour tokens at the top (`:root`, plus dark-mode overrides), then components. Cards are rounded and controls are angular (see the "Angular controls" block at the end). |
| `js/app.js` | The whole app, wrapped in one IIFE. |
| `sw.js` | Service worker. Network-first for app files, cache-first for Google Fonts. |

## How `js/app.js` is organised

1. **Utilities:** `$`, `esc` (HTML escaping), `d6` (crypto-random, unbiased), `rollN`, `sum`, `clamp`.
2. **Missions:** `MISSIONS` (map zones, objectives, rounds, short brief) and `DETAILS` (setup, scoring, special rules, win and tips text). `M()` returns the current mission.
3. **State:** one game object `G`, saved to `localStorage` after every change.
   ```js
   G = {
     v: 2, mission: "vault", vp: [0, 0],
     units: [{ id, side, n, status: "reserves"|"field"|"dead", ready, supp, stuck, engaged, veh, relic, resRound, deadRound }],
     round, started, init: [red, green], turn,   // 0 = Red, 1 = Green
     act: { id, step: "move"|"attack"|"end", mr, eng, bonus, ... } | null,   // the activation in progress
     forges: { 0: [r, r], 1: [r, r] },   // round each forge was last captured
     gone: { objId: true },               // removed or burned objectives
     scored: { roundNo: true },           // rounds already scored
     winner: null | 0 | 1 | -1,           // -1 = draw
     log: [{ r, s, t }]
   }
   ```
   `UI` holds view-only state: current tab, open sheet, dice tool settings, setup choices.
4. **Rules logic:**
   - `startRound` and `roundBody` (initiative, every unit ready, Stuck In);
   - `nextTurn` (alternation and back-to-back activations);
   - `checkWin`, `makeReady`;
   - the scoring helpers `computeScore`, `needsScoring` and `scoringCard`.
5. **Rendering:**
   - `render()` rebuilds the header, the current tab (`renderBattle`, `renderDice`, `renderMission`, `renderRules`) and the open sheet (`unitSheet`, `actSheet`, `capSheet`, `setupSheet`, `confirmSheet`) as HTML strings.
   - Anything user-supplied goes through `esc()`.
6. **Actions:** every button has `data-a="actionName"` and the action itself lives in the `A` object. One click listener sends each click to its action, and checkboxes use `data-t` on a `change` listener.
   - State changes go through `commit(fn)`. It saves an undo snapshot, runs `fn`, checks for a winner, saves and re-renders.

## Common changes

**Add a mission**
1. Add an entry to `MISSIONS` with:
   - `name`, `deploy`, `src`, `vp` (true for VP scoring), `rounds`;
   - `zones` (two SVG polygon point strings, Red first, on a 60×44 grid);
   - `objs` (made with `O(id, x, y, type, label)`, where type is `c`, `n`, `h0`, `h1`, `vault`, `forge0` or `forge1`);
   - `brief`;
   - optionally `score` (ids of the only objectives that score).
2. Add matching text to `DETAILS` (setup, scoring, special, win, tips).
3. Add the scoring rule in `computeScore()`.

**Change colours or fonts:** edit the tokens at the top of `css/styles.css`. Light values sit on `:root`, and dark values appear twice: once in the `prefers-color-scheme` block and once in `[data-theme="dark"]`. Keep both in sync.

**Change the saved-game format:** bump `v` in `freshGame()` and the check in `load()`, or migrate old fields in `start()`.

**Ship an update:** bump `CACHE` in `sw.js` so installed copies refresh.

## Testing

There is no test suite yet. Before pushing:
- Play a short game on a phone-width window (about 390px) in both themes.
- Check that the page never scrolls sideways.
- `node --check js/app.js` catches syntax errors.
