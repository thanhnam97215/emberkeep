# Emberkeep — Last Light Defense

An original tower-defense × arcade survival game. Defend the last Hearth at the center of the keep against 10 waves of Night Shades. Build living flame-towers, freeze the swarm, call down storms, and blast clumps with your Nova.

No install, no network, no build step. Just open the file and play.

## How to run offline

1. Keep `index.html`, `style.css`, and `game.js` together in this folder.
2. Double-click `index.html`, or open it in any modern desktop browser (Chrome / Edge / Firefox / Safari).
3. Click **Light the Hearth**, build a few towers, then press **Start Wave 1**.

That is all — the game runs entirely from local files. There are no CDN links, no fonts, images, or API calls.

## How to play

- **Goal:** Survive all **10 waves**. Win by clearing wave 10 (including the Hollow King boss). Lose if the Hearth's HP reaches 0.
- **Enemies** march from the edges toward the Hearth in the center. If one reaches it, the Hearth takes damage.
- **Build towers** by picking a card, then clicking the field. Towers fire automatically at the nearest foe in range.
- **Earn gold** by banishing enemies (+ a bonus after each cleared wave) and spend it on more towers or upgrades.
- **Nova Blast** is your active skill: it damages and knocks back every enemy near your mouse. It has an 8-second cooldown, so save it for clumps or leaks.

### Towers

| Tower | Cost | Role |
|---|---|---|
| 🔥 Ember Spire | 50g | Fast, cheap, reliable damage |
| ❄ Frost Bloom | 80g | Low damage, slows enemies 45% for 1.7s |
| ⚡ Storm Eye | 140g | Slow, heavy splash damage vs groups |

Click any placed tower to **Upgrade** it (up to Lv 3: +60% damage and +range per level) or **Sell** it for a 70% refund.

### Enemies

- **Shade** — the basic marcher. Balanced speed and HP.
- **Wisp** — fast, fragile, glowing. Catches slow defenses off guard.
- **Brute** — slow armored hexagon with high HP and heavy Hearth damage.
- **Hollow King** — the wave 10 boss: huge HP, crowned, hits the Hearth for 30.

## Controls

- **Mouse:** click tower cards, click field to place, click a tower to select / upgrade / sell. Right-click or `Esc` cancels placement.
- **1 / 2 / 3:** select Ember / Frost / Storm.
- **Space:** Nova Blast at your mouse cursor (or click the NOVA button).
- **P:** pause / resume. **R:** restart. **M:** sound on/off. **Enter:** start / play again.

## Tips

- Frost near the Hearth buys your Ember towers extra shots.
- Storm shines where paths converge and enemies clump.
- Don't overspend early: keep ~50g in reserve for a clutch tower mid-wave.
- Nova + Frost together can save a leaking lane.

## Files

- `index.html` — entry point, HUD, start / pause / victory screens.
- `style.css` — all visuals, layout, and responsive styling (system fonts only).
- `game.js` — full game logic: waves, towers, enemies, projectiles, Nova, particles, and synthesized sound (Web Audio, no audio files).
- `README.md` — this file.

## Originality

Emberkeep was written from scratch for this entry: original name, art (all drawn in Canvas/CSS), mechanics, wave design, and code. No assets or code were copied from an existing game.
