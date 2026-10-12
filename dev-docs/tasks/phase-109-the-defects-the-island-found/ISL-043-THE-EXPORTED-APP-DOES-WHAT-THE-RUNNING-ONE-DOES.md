# ISL-043 — The exported app does what the running one does

**Status: ⬜ not started. Scoped 2026-10-07 at `088579843` by the second ledger sweep (Track G).** **Source:** 8 bugs
from the ledger (`dev-docs/bugs/`) that no phase owned: 2 high · 6 low. **Side:** nodegx-export (plan, emitters, the report, the package build)

## 1. The person sentence

**`nodegx export` finishes on every real project, builds on Windows, and the React app it writes behaves as the runtime does, States, Parse Feed, HTTP Request, Color Blend and the Date nodes included.**

## 2. Why these belong together

Two rows stop the export itself: "Cannot access 'snapActionList' before initialization" on four real projects, and no build on Windows (a bare `npx` spawn). Five are runtime fixes from ISL-026, ISL-030 and ISL-032 whose exported twins still have the old behaviour; s21–s25 filed them for P18 in handoffs, but the ledger never named an owner. One is the export report naming an inert marker as dropped.

## 3. The bugs

Worst first. Each file holds the measurement, the reproduction and, for most of them, the proposed fix. This table is
generated from the ledger headers. **The ledger file is the source**, so read it before you start.

| bug | severity | status | what a person sees |
|---|---|---|---|
| [P100-UPG001-SNAP](../../bugs/p100-upg001-snap-nodegx-export-crashes-on-snapactionlist-before-initialization.md) | high | scheduled | nodegx export stops outright with "Cannot access 'snapActionList' before initialization" on four real projects |
| [P78-D82](../../bugs/p78-d82-nodegx-export-and-nodegx-core-do-not-build-on-windows.md) | high | scheduled | @nodegx/export and @nodegx/core do not build on Windows (a bare `npx` spawn) |
| [P109-S25-EXPORTSTATESRUN](../../bugs/p109-s25-exportstatesrun-an-exported-states-move-that-sets-at-once-leaves-the-old-animation-running.md) | low | scheduled | An exported States move that sets every value at once leaves the previous move's animation running, which lands the old state's value |
| [P109-S25-EXPORTFEEDZONE](../../bugs/p109-s25-exportfeedzone-an-exported-parse-feed-reads-a-zoneless-date-in-the-machines-zone.md) | low | scheduled | An exported Parse Feed reads a date with no zone in the machine's zone, and a zone name it does not know as UTC |
| [P109-S24-EXPORTBADBODY](../../bugs/p109-s24-exportbadbody-an-exported-http-request-reports-a-body-it-cannot-read-as-json-as-a-network-error.md) | low | scheduled | An exported HTTP Request reports a body it cannot read as JSON under http/network-error, where the runtime now says http/bad-body |
| [P109-S21-EXPORTBLENDNAN](../../bugs/p109-s21-exportblendnan-an-exported-color-blend-renders-nannannan-for-a-blend-value-that-is-not-a-number.md) | low | scheduled | An exported Color Blend still renders "#NaNNaNNaN" for a Blend Value that is not a number, where the runtime now keeps the colour it last showed |
| [P109-S21-EXPORTDATEUNITWIRED](../../bugs/p109-s21-exportdateunitwired-a-wired-date-unit-is-not-exported-for-a-reason-that-is-gone.md) | low | scheduled | The export refuses a Date Add or Date Difference whose Unit is wired, for a reason that is gone (the runtime no longer throws on an unknown unit) |
| [P100-UPG001-VARIANT](../../bugs/p100-upg001-variant-export-reports-the-inert-variant-marker-as-a-dropped-parameter.md) | low | scheduled | The export report says the inert `_variant` / `_size` marker was dropped |

## 4. Order of work

SNAP and D82 first (no export at all). Then the five twins, each against the runtime fix it follows (named in its ledger file). VARIANT last.

## 5. Rules for every row

- **Re-measure first.** Each row was measured once, by the session named in its `found:` line, and this task was written
  from the ledger without re-running them. Re-run each reproduction at HEAD before building. A row that no longer
  reproduces is closed in the ledger with the commit that fixed it, not fixed again.
- **A control on every fix:** the old code red on exactly the fix's arms.
- **When a fix lands**, set the ledger file to `status: fixed` with `commit:` (and `regression:`).

## 6. Related work and collisions

- 🔴 **P18 (code export v2) is live and holds an uncommitted pile in `packages/nodegx-export`** (plan.ts, emit/component.ts, emitApp.ts, cryptoLib.ts and about 20 tests on 2026-10-07). Ask P18 before touching those files, or hand the rows to P18 if it is running.
- Sibling: [ISL-035](ISL-035-AN-EXPORTED-APP-LOADS-WHAT-THE-DEPLOYED-ONE-LOADS.md) (kit dependencies, list filters in the export). One session should take both.
- The editor's tsc compiles nodegx-export too: run `tsc -p packages/noodl-editor` after touching export `src/`.

## 7. Acceptance criteria

- **AC1** — every row in §3 is re-measured at the session's HEAD. Each one still firing is recorded, and each one that is
  not is closed in the ledger with the commit that fixed it.
- **AC2** — every `needs-ruling` row is asked in plain words and ruled (none today).
- **AC3** — every row ruled or written "as proposed" is fixed, one commit each (or one per shared mechanism), with its
  regression green.
- **AC4** — `node scripts/bugs.js` lists none of this task's rows as `open`, `scheduled` or `needs-ruling`.
