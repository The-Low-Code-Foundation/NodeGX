# HTX-006: a NodeGX menu inside a three.js page

The account is in [README §10](../README.md#10-sessions), session 9. This folder holds what it rests on.

**The pictures to read:** [`shots/G1.png`](shots/G1.png) (the menu in the game), [`shots/G5.png`](shots/G5.png) (the
same menu after the width was changed and it was exported again), [`shots/CTRL-no-cut.png`](shots/CTRL-no-cut.png) (the
same, with the stylesheet that stops the game's styles taken out: the game's Courier, capitals and letter spacing get in).

## What is here

| path | what |
|---|---|
| [`game/`](game/) | the game: `index.html`, `game.js`, `game.css`, and three.js 0.177.0's two minified files (MIT, `vendor/THREE-LICENSE`). Written once by hand for this page. It is not NodeGX and does not change. |
| `packages/nodegx-export/tests/fixtures/game-menu` | the NodeGX project: one component, `Menu/Settings` (a volume slider, a Resume button; in: `volume`; out: `volume`, `resume`), and a Preview page that places it |
| [`drive.cjs`](drive.cjs) | the drive: export, play, widen, export again, a hand edit, all on copies in `work/` (gitignored) |
| [`readings.json`](readings.json), [`compare.py`](compare.py), [`compare.txt`](compare.txt) | what it read, and the comparison |

The game mounts the menu when it pauses and takes it away when it resumes. That is all `game.js` knows of it:

```js
import { mountSettings } from './Settings.js';
menu = mountSettings(overlay, { volume: game.volume });
menu.outputs.volume.subscribe((v) => { game.volume = v; showVolume(); });
menu.outputs.resume.subscribe(() => resume());
// …and on resume: menu.destroy();
```

## The drive (`node drive.cjs`, about 25 s; Chrome from Claude's bash needs the sandbox off)

| step | what happened | read |
|---|---|---|
| E1 | `nodegx export --target html --component Settings <menu> --out-dir <game>` | 7 files written; `shasum` of the game's 6 own files kept |
| G0 | the game runs | frames advance; no menu on the page |
| G1 | a real click on Pause | the menu in the overlay, "Paused Volume Resume", the slider at 0.8; the game's frames stop |
| G2 | a real click a quarter of the way along the slider | the game's volume 0.25, its HUD "volume 25%" (through `outputs.volume`) |
| G3 | a real click on Resume | `outputs.resume` reached the game: running, no menu on the page, resumes 1 |
| G4 | Escape, then Escape | the menu again at 0.25 (the volume the game now holds), then gone; resumes 2 |
| REF | the menu in its own app (the whole HTML export, its Preview page) | its look, element by element |
| W, E2 | the panel's width 280 → 420 px in the project's `nodes.json`, as Studio saves it; exported again | 1 file written (`components/Settings.css`), 6 unchanged; **`shasum` of the game's own files equal to E1's** |
| G5 | reloaded, paused | the panel 420 px wide; everything else as G1 |
| CTRL | G5 with the cut's `@import` taken out for one load, then put back byte for byte | the game's styles reach in |
| H | a line added by hand to `components/Settings.css`, then the export again | exit 3: "A file this export wrote was changed since, by hand or by something else: components/Settings.css. … Nothing was written." Every file in the folder byte-identical before and after |

The look, 18 computed properties on each of the menu's 5 elements (`compare.txt`):

- **In the game (G1) against its own app (REF): 0 of 90 differ.** The game's `p { text-transform: uppercase; letter-spacing }`
  and its `button { border: 1px solid lime; font-family: Courier }` do not reach the menu.
- **Wider (G5) against G1: 5 differ, every one a width** (panel 280 → 420 px, its four children 232 → 372 px).
- **Without the cut (CTRL) against G5, the same build: 30 of 90 differ**: the game's font on all five, its capitals and
  letter spacing on the title and label, its border and padding on Resume, `content-box` sizing everywhere. So the
  zero above is a reading that can see a leak.

## Said plainly

- **The Studio step was a file write, not Studio's screen.** The drive changes the one parameter in the component's
  `nodes.json` that Studio writes when the width is changed. It does not open Studio. That is the next drive, with the
  task's last line (a copy of ThreadSpace's or the Dig's menu, Richard's choice).
- **The Resume button wears the browser's grey outset border**, in the game and in the menu's own HTML app alike. The
  React export prints the same bare `<button>`. Whether the running app draws that border was not measured.
- **At mount the slider's value output sends 0, then 0.8**, React's order (`useState(0)`, then the effect that
  follows the input). A NodeGX parent's callback hears both. The page subscribes after the mount returns, so it hears
  0.8, the value the part settles on. Whether the running app sends the 0 was not measured.
