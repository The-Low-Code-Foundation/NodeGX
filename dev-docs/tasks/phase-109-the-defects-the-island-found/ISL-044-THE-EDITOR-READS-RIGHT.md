# ISL-044 — The editor reads right to a keyboard, a screen reader and an eye

**Status: 🟢 s43 (2026-10-11): 5 of 6 — ICONBTN `e76db56b4` + `9b3d1f3a8`, NESTEDSIGNAL `c3d6b2f66`, OGIMAGE `eba414b90`, LONGTOAST `12a971c32` fixed; SHIFTTAB re-measured and closed (not a trap, `9b3d1f3a8`); LISTDEFAULTTYPE waits on Richard's ruling (asked s43). Scoped 2026-10-07 at `088579843` by the second ledger sweep (Track G).** **Source:** 6 bugs
from the ledger (`dev-docs/bugs/`) that no phase owned: 3 medium · 3 low; 1 to ask. **Side:** noodl-core-ui (IconButton), the editor (keyboard focus around the preview, ToastLayer, the token picker, wire health, the Function panel)

## 1. The person sentence

**Every editor button has a name a screen reader says, Tab and Shift+Tab never get stuck in the preview, a long toast keeps its title on screen, a field offers only the tokens that fit it, a working wire never reads as broken, and a panel shows the type a port really has.**

## 2. Why these belong together

Six things the editor shows or says wrongly. Icon-only buttons have no accessible name; Shift+Tab from the canvas goes into the embedded preview and stays; a long toast pushes its title off the window; og:image size fields offer spacing tokens; a signal a nested For Each row passes up reads as a broken wire; a Function output left on "String" is untyped (a ruling).

## 3. The bugs

Worst first. Each file holds the measurement, the reproduction and, for most of them, the proposed fix. This table is
generated from the ledger headers. **The ledger file is the source**, so read it before you start.

| bug | severity | status | what a person sees |
|---|---|---|---|
| [P101-INS003-ICONBTN](../../bugs/p101-ins003-iconbtn-icon-buttons-have-no-accessible-name.md) | medium | fixed | Icon-only buttons across the editor have no accessible name (the inspector's collapse button among them) |
| [P101-INS003-SHIFTTAB](../../bugs/p101-ins003-shifttab-shift-tab-from-the-canvas-is-trapped-in-the-preview.md) | medium | wontfix | Shift+Tab from the canvas goes into the embedded preview and stays there |
| [P109-S20-LONGTOAST](../../bugs/p109-s20-longtoast-a-long-toast-pushes-its-title-off-the-window.md) | medium | fixed | A long toast grows past the top of the window, so its title and first sentences cannot be read |
| [P103-CMG009-OGIMAGE](../../bugs/p103-cmg009-ogimage-og-image-width-and-height-offer-the-spacing-scale.md) | low | fixed | Page's og:image:width / og:image:height fields offer spacing tokens |
| [P78-TPL008PJ-NESTEDSIGNAL](../../bugs/p78-tpl008pj-nested-signal-a-signal-a-row-passes-up-from-its-own-for-each-reads-broken.md) | low | fixed | A signal a For Each row passes up from a For Each of its own reads as a broken wire in the deploy's wire check — the wire works in both viewers |
| [P109-S20-LISTDEFAULTTYPE](../../bugs/p109-s20-listdefaulttype-a-listed-output-left-on-string-is-untyped.md) | low | needs-ruling | A Function output added to the list shows Type "String" in the panel, but its port is untyped until another type is picked |

## 4. Order of work

SHIFTTAB and ICONBTN first (a keyboard or screen-reader user cannot work). Then LONGTOAST, NESTEDSIGNAL, OGIMAGE. LISTDEFAULTTYPE needs a ruling.

## 5. Rules for every row

- **Re-measure first.** Each row was measured once, by the session named in its `found:` line, and this task was written
  from the ledger without re-running them. Re-run each reproduction at HEAD before building. A row that no longer
  reproduces is closed in the ledger with the commit that fixed it, not fixed again.
- **A control on every fix:** the old code red on exactly the fix's arms.
- **When a fix lands**, set the ledger file to `status: fixed` with `commit:` (and `regression:`).

## 6. Related work and collisions

- P101 (the inspector) found ICONBTN and SHIFTTAB and is live; check its task files before building.
- Editor behaviour is checked in the running editor (the run-editor skill), on a throwaway profile and a copy of a project.

## 7. Acceptance criteria

- **AC1** — every row in §3 is re-measured at the session's HEAD. Each one still firing is recorded, and each one that is
  not is closed in the ledger with the commit that fixed it.
- **AC2** — every `needs-ruling` row is asked in plain words and ruled (P109-S20-LISTDEFAULTTYPE).
- **AC3** — every row ruled or written "as proposed" is fixed, one commit each (or one per shared mechanism), with its
  regression green.
- **AC4** — `node scripts/bugs.js` lists none of this task's rows as `open`, `scheduled` or `needs-ruling`.

## 8. Record

### s43 (2026-10-11) — 5 of 6

| row | state | what happened |
|---|---|---|
| OGIMAGE (low) | ✅ `eba414b90` | `tokenCategoriesForPort('og:image:width')` was `['spacing']` at HEAD (HLT-012's new row, red). An explicit `^og:` refusal sits before the generic dimensions |
| NESTEDSIGNAL (low) | ✅ `c3d6b2f66` | `nodegx deploy` on HEAD's todo list named all four. The cause was in the deploy's check: one runtime pass, on an export taken before any For Each had minted its ports. It now runs again while a pass changes the exported port types (the todo list settles in three; 2,036 wires, none named). GAM-023 has a todo-list row. In the running editor the warnings model never flagged them |
| ICONBTN (medium) | ✅ `e76db56b4`, `9b3d1f3a8` | `ariaLabel` is rendered as `aria-label`, and the props require it when no `label` is drawn. The compiler listed 69 callers, all named (45 files; a subagent did the naming, its diffs read hunk by hunk). A census spec covers the `.jsx` caller. In the running editor: 22 `IconButton`s on screen, each named only by `aria-label` (so all were nameless on HEAD). The same reading found three other nameless buttons, the narrow top bar's Design, Preview and Deploy, now named. No nameless button on screen after |
| LONGTOAST (medium) | ✅ `12a971c32` | The card is at most `100vh − 90px` and its message scrolls. In the editor, with a 3,500-character warning: the title at y 46 and the message scrolling. An injected style restoring HEAD's card put the title at y −974 |
| SHIFTTAB (medium) | ✅ closed, not a trap (`9b3d1f3a8`) | Re-measured with P101's recipe: 30 Shift+Tabs from a canvas node walk the preview's controls (1–5), then the editor's chrome and left panel (6–30). The guest hands focus back. Closed `wontfix` with the measurement |
| LISTDEFAULTTYPE (low) | ❓ asked | In plain words at the end of s43 |
