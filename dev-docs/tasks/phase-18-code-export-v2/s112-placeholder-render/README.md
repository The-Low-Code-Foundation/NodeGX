# The placeholder render (P18 session 112, 2026-10-15)

`pick-desk` has one page with three Dropdowns, each showing its placeholder "Choose a size":

| Dropdown | authored | runtime (label span) | export at HEAD `8ca7aef05` | export, patched |
|---|---|---|---|---|
| pickDefault | nothing (opacity defaults to 0.5) | opacity **0.5** | full, `rgb(0, 0, 0)` | `color(srgb 0 0 0 / 0.5)` |
| pickFull | Placeholder opacity 1 | opacity 1 | full | full |
| pickRed | colour `#cc0000`, opacity 0.3 | opacity **0.3** of `rgb(204, 0, 0)` | full `rgb(204, 0, 0)` | `color(srgb 0.8 0 0 / 0.3)` |

So the visible fade is 0.5 / 1 / 0.3 in the runtime, 1 / 1 / 1 at HEAD, and 0.5 / 1 / 0.3 patched. `readings.json` has
every measured field; the three PNGs are the same page in each arm.

**What differs and is not this row** (filed as P18-S112-NATIVESELECT): the exported Dropdown is the browser's own
`<select>`, so its box is the native size (about 22 px tall against the runtime's 32 px), its chevron is the native
one, and with no authored colour its text is the UA's `FieldText` (black) where the runtime's inherits `--foreground`
(`rgb(15, 23, 42)`). **One cost of the carry:** the native chevron is drawn in the text colour, so it fades with the
placeholder; the runtime's chevron does not.

## Running it again

With `X` set to this folder, from the repo root:

1. Emit both arms with `npx tsx $X/emit.ts $X/pick-desk $X/out-head` (and `out-work`), from
   `packages/nodegx-export` at the commit you want for each.
2. In each `out-*`, replace `src/App.tsx` with `import { HomePage } from './pages/Home'; export function App() { return <HomePage />; }`,
   bundle `src/main.tsx` with `node_modules/.bin/esbuild` (`--bundle --outdir=dist --loader:.module.css=local-css
   --jsx=automatic`, `NODE_PATH=node_modules`), and write a `serve.html` that loads `/dist/main.css` and `/dist/main.js`.
3. `node $X/drive.cjs`. It serves the runtime with `scripts/devtools/render-from-disk.js` and both builds statically,
   opens one headless Chrome (`--use-mock-keychain`), prints the readings and writes the screenshots.
