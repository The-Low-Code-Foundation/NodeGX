# P99 — next session

**Status: 📋 building. HLT-001 ✅, HLT-002 ✅, HLT-003 ✅, HLT-006 ✅ (s4, `149695838`).**
Open: **HLT-004, 005, 007, 008, 009, 011, 012**, then **HLT-010 last**.

Read [README.md](./README.md) §5 for the board and §7 for the rules every task inherits. Read it
**before claiming a row** — peers have been building this phase in parallel.

## Start here

**The one thing s4 leaves open is not a task — it is Richard's look.** HLT-006 met every
acceptance criterion except **AC5**: six frames are committed in [shots/](./shots/) and he has not
ruled WORTHY on them yet.

- `hlt006-picker-{dark,light}.png` — the picker open, 25 named tokens with swatches and values
- `hlt006-palette-row-{dark,light}.png` — scrolled to the foot: `Palette 61` closed, then
  *Colors in project*
- `hlt006-control-{dark,light}.png` — the same surface with the enumeration suppressed

**Ask him in plain words, showing the pictures.** Do not re-open the design on his behalf.

## 🔴 The pattern this phase has established, four times out of four

**Every task file so far has been materially wrong, and the correction was the work each time.**
HLT-001's census (78 sites, not 19). HLT-002's "detached" webview (hidden, not detached).
HLT-003's three wrong claims. HLT-006's §2 (right about enumeration, blind to the echo).

⇒ **Measure your row's §2 before writing a line.** See
[[measure-the-artefact-before-believing-the-task-file]]. Budget a first hour for it; it has paid
for itself every single time.

## What s4 changed for the rows after it

- **`ColourTokensForPicking.ts` is the shared token enumeration** (`models/StyleTokensModel/`).
  The colour picker and the Styles panel both read through it. **HLT-012 extends it; do not start
  a second list** — a second copy of "which tokens belong where" is exactly how HLT-007(b) happened.
- **A leaf module, not the barrel.** `@noodl-models/StyleTokensModel`'s `index.ts` re-exports
  `StyleTokensModel`, which drags `projectmodel` → `bugtracker` → Electron and makes a jest suite
  report `Tests: 0 total`. Import the leaf path.
- **`scripts/devtools/drive-hlt006-token-picker.js`** is a worked template for a picker drive:
  reach arm (hit-test), a control that is proven by CALLING the mutated seam, an unarm step, and
  a duplicate arm for the trade the fix itself can cause.

## 🔴 Three traps s4 paid for — do not re-derive them

1. **A webpack export cannot be monkey-patched, and both refusals look like success.**
   `m.fn = mutant` is a **silent no-op** (exports are getter-only via `__webpack_require__.d`) —
   the arm checking `typeof m.fn === 'function'` stayed true, so the drive printed *"armed"* and
   reported the **fixed** number on an unmutated run. `Object.defineProperty` then **throws**
   (non-configurable). ✅ Mutate the **data** — a prototype method — and **prove it by calling it**.
2. **That mutation outlives your process.** It sits on a prototype in the *renderer*, so a fixed
   run started after a control run reads the control's zero and calls the fix broken. Unarm first
   and grade that you did.
3. **`Icon` renders an empty `<span>`,** so `header.querySelector('span')` returns the icon, not
   the label. A working disclosure graded as absent for one run because of it.

## Rules that bit in s4 and will bite again

- 🔴 **A pipe eats the exit code.** `npm run test:ci … | tail -40` reported *"exited with code 0"*
  over an `npm error … code 1`. Read the runner's own line — `3036 specs, 8 failures, seed …` —
  and check the 8 **by name**, never the exit status through a pipe.
- 🔴 **Backticks inside a template literal end it.** A comment reading ``NOT the first `overflow`
  div`` inside a CDP `ev(\`…\`)` string broke the drive with `missing ) after argument list`.
- ⚠️ **CSS changes need a webpack rebuild before you shoot.** A frame taken four seconds after the
  edit is a picture of the *old* rule. Poll the live `document.styleSheets` for your declaration
  before capturing.
- ⚠️ **`MEMORY.md` is at its 17,510 budget exactly.** File new findings into a memory that already
  has a pointer, or into a `*-pointers.md` index — both cost the index nothing. Do not trim another
  session's trap to pay for your row.

## Gates, both, every time (README §7)

```
npm run typecheck:editor && npm run typecheck:editor-tests
cd packages/noodl-editor && npm run test:main      # 527/527, 8425/8425 at 149695838
cd packages/noodl-editor && npm run test:ci        # floor: 8 by name — 3 SUB-006, 3 SUB-011, 2 NDA-017
npm run lint:ci                                    # ratchet, 876 vs 3916 baseline
```

⚠️ `typecheck:core-ui` is red at 45 `TS2307` independently of this phase — pre-existing tsconfig
alias condition, no P99 file named.

## Driving

`npm run dev:debug -- --quiet` (background, ~90s), then `npm run cdp -- health`. **Drive a copy** —
opening a project writes three files into it. **`npm run dev:stop` when done**, and announce the
teardown to whoever you announced the launch to. One heavy job at a time.
