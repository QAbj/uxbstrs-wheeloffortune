# Codex Patch Log - Additional UI/Animation/Wheel Scaling Fixes

## Start
- Task started.
- Target files identified: `wheel.html`, `styles.css`, `script.js`.
- Goals: visibility toggle in modifiers matrix, font range max=48, under-wheel live/winner card animation flow, unified wheel scaling up to 100vh, no regression of prior fixes.

## Actions
- Initialized log file.
- Replaced modifier matrix row action from delete to visibility toggle using `imgs/view-on.svg` / `imgs/view-off.svg`.
- Added base-item `visible` persistence through localStorage export/import (`items.json`) while preserving backward compatibility with previous formats.
- Updated derived item generation to exclude hidden base items from wheel slices and winner selection.
- Expanded font size settings range/clamping from max 24 to max 48.
- Replaced prior winner overlay flow with a single docked result card under the wheel:
  - idle pointer-selected item display,
  - slot-like cycling class during spinning,
  - transition to center on winner,
  - click outside / Esc returns card to dock position.
- Added transparent full-screen hit area only for click-outside detection when card is centered.
- Refactored wheel sizing to use unified `--wheel-size` source and synchronized wrapper/canvas sizing for 30–100vh behavior.
- Updated wheel stage spacing to preserve under-wheel card visibility.

## Validation
- `node --check script.js` (pass)
- Local runtime smoke check via `python3 -m http.server 4173` + Playwright UI interaction/screenshot (pass)

## End
- Patch complete.
