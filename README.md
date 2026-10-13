# Auspex: Battle Ledger

**Auspex** is a phone-first web app to run a game of **[40k Reforged](https://discord.gg/BpjkaNmMVB)** at the table. Reforged is a fan-made, alternating-activation ruleset for Warhammer 40,000 models.

One shared phone, tablet or laptop does the bookkeeping. You keep the miniatures, tape measure and line of sight on the table.

## Features

- **Red vs Green, numbered units.** No army lists to type in. Set how many units each side has and play.
- **Round tracker:** initiative roll (ties re-rolled), whose turn it is, how many units have activated, and back-to-back activations when one side runs out of ready units.
- **Activation flow (Move → Attack → End):**
  - Deploy from reserves, or roll for Forward Deploy.
  - Move Roll with Suppressed and extra-dice adjustments.
  - Advance, Reposition and Pile In distances.
  - **Too Close** distances for Assault, Heavy and Velocity weapons.
- **Dice tools:** Strength vs Toughness wound lookup, a dice roller with re-rolls, and a button that rolls the successes as the next step.
- **Unit status:** Suppressed counter with Resolve tests, Stuck In, engaged, vehicle or monster, destroyed.
- **Five missions** (see [docs/MISSIONS.md](docs/MISSIONS.md)):
  - Vault Breaker, the official Reforged mission
  - Take and Hold
  - Purge the Foe
  - Supply Drop
  - Scorched Earth
- **Mission choice:** pick a mission or draw one at random. Each mission has a map plus setup, scoring, special rules, how to win and tips.
- **Scoring:** VP scoreboard and an end-of-round scoring card for the VP missions.
- **Undo and battle log**, plus light and dark mode.
- **Saves locally:** the game is stored in the browser. Reopening the app returns to the last game.
- **Works offline** once loaded over https, and can be installed to the home screen.

## Run it locally

No build step and no dependencies. Any static file server works:

```bash
# Python 3
python3 -m http.server 8000
# then open http://localhost:8000
```

Opening `index.html` directly from disk also works, but offline caching only runs over `http://localhost` or `https://`.

### Updating

When you change any file, also bump `CACHE` in `sw.js` (e.g. `auspex-v1` → `auspex-v2`). This makes installed copies pick up the new version. Phones may need the app closed and reopened once.

## Project structure

```
index.html             Page shell: header, main area, tab bar, sheet container
css/styles.css         All styling: colour tokens for light/dark, layout, controls
js/app.js              All logic: game state, rules helpers, missions, rendering, actions
sw.js                  Service worker for offline use
icons/                 App icons (SVG + PNG)
MISSIONS.md       The five missions in full
```

## Data and privacy

Everything stays on the device. The game is saved in `localStorage`. There is no server, account or tracking. The only external requests are for Google Fonts.

## Disclaimer

This is an unofficial, non-commercial fan project. It is not affiliated with, endorsed by or sponsored by Games Workshop or the 40k Reforged team.

- Warhammer 40,000 and all related names are trademarks of Games Workshop Ltd.
- 40k Reforged is a free community ruleset. Get the full rules from the [40k Reforged Discord](https://discord.gg/BpjkaNmMVB).
- The in-app rules reference is a short summary of the 3.3.6 core rules, not a replacement for them.
- Take and Hold, Purge the Foe, Supply Drop and Scorched Earth are this project's own adaptations of classic mission ideas, rewritten for Reforged.

## License

The code is released under the [MIT License](LICENSE). The licence covers this project's code and text only, not any third-party rules or trademarks.
