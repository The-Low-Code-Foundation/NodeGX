# ISL-044 — The editor reads right to a keyboard, a screen reader and an eye

**Status: ⬜ not started. Scoped 2026-10-07 at `088579843` by the second ledger sweep (Track G).** **Source:** 6 bugs
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
| [P101-INS003-ICONBTN](../../bugs/p101-ins003-iconbtn-icon-buttons-have-no-accessible-name.md) | medium | scheduled | Icon-only buttons across the editor have no accessible name (the inspector's collapse button among them) |
| [P101-INS003-SHIFTTAB](../../bugs/p101-ins003-shifttab-shift-tab-from-the-canvas-is-trapped-in-the-preview.md) | medium | scheduled | Shift+Tab from the canvas goes into the embedded preview and stays there |
| [P109-S20-LONGTOAST](../../bugs/p109-s20-longtoast-a-long-toast-pushes-its-title-off-the-window.md) | medium | scheduled | A long toast grows past the top of the window, so its title and first sentences cannot be read |
| [P103-CMG009-OGIMAGE](../../bugs/p103-cmg009-ogimage-og-image-width-and-height-offer-the-spacing-scale.md) | low | scheduled | Page's og:image:width / og:image:height fields offer spacing tokens |
| [P78-TPL008PJ-NESTEDSIGNAL](../../bugs/p78-tpl008pj-nested-signal-a-signal-a-row-passes-up-from-its-own-for-each-reads-broken.md) | low | scheduled | A signal a For Each row passes up from a For Each of its own reads as a broken wire in the deploy's wire check — the wire works in both viewers |
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
