# Phase 107 — closing

**Closed:** 2026-10-14 by Richard's ruling on the [board](../../BOARD.md), on R38 + R40 landing (s105). 104 sessions,
228 commits, 2026-09-30 to 2026-10-14. Read this instead of the README's status line; the README and the 36 task files
stay as the record.

## The number it was judged on

```
npm run spec-ledger        # 2026-10-14
SPEC COVERAGE: 142 of 147 picker nodes conform on the runtime (96.6%); 3 specced as a contract
(Script, Function, Visual Function); 2 on the export, inside a declared reach (Counter, Switch); 2 exempt; 0 owed
ports: 133 of 147 drawable without a viewer (NSP-020)
```

The ratchet (NSP-009) holds those floors in PR CI. A new picker node ships with a spec or names the task that owes it.

## What it gave

- **247 defects logged, 214 fixed** (`dev-docs/bugs/p107-*`): 2 blockers, 28 high. Almost none were caught by any
  existing test; all were in old Noodl. Among them: one Animate To Value with an empty easing curve stopped every
  animation in the app; a stray `}` in JSON Stream Parser froze the app; Object's and Record's `Changed` signals had
  never fired; HTTP Request's auth presets had never sent a credential.
- **The thesis held twice.** An agent built the pilot five in vanilla JS from the spec and the suite alone, green on
  its first run ([NSP-006](NSP-006-A-STRANGERS-TARGET.md)); another built the Dropdown on a plain DOM page with no
  React ([NSP-023](NSP-023-THE-SPEC-WITHOUT-REACT.md)). That is the rehearsal for a Swift runtime (P110 PKT-005).
- **The editor learns from the spec.** The catalog is generated from it ([NSP-018](NSP-018-THE-SPEC-SPEAKS.md)); the
  *How this node works* modal runs it ([NSP-019](NSP-019-RICHARD-READS-IT.md)); ports are drawn without a viewer
  ([NSP-020](NSP-020-PORTS-WITHOUT-A-RUNNING-VIEWER.md)); cloud nodes get their settings from it (R37).
- **Agents are refused more.** A wire to a port a node does not have (R19/R20), a node inside a parent it cannot live
  in (R23), a type the wire cannot cast (R21) — all refused by the validator over MCP, from the spec.
- **A behaviour change is a version** ([NSP-010](NSP-010-A-CHANGE-IS-A-VERSION.md)): 22 specs carry a history with a
  migration answer each.

## What it did not give

- **The export.** 2 of 147 conform on the export, and only inside a narrowed reach. The exporter compiles graph
  shapes, not nodes, and defers the suite's wrapper ([NSP-005 §3](NSP-005-THE-EXPORT-ADAPTER.md)). The honest grade for
  a compiler is graph scenarios, not single nodes. → **Board lane 6** (P18, P109 ISL-043).
- **A spec copies the runtime, faults included.** Conformance proves two implementations agree; it does not prove the
  node makes sense (Richard, s95: a Counter with Min above Max said nothing anywhere —
  [P107-S95-MINABOVEMAX](../../bugs/p107-s95-minabovemax-a-counter-with-min-above-max-says-nothing-anywhere.md)).
  R35 added `diagnostics` to the format and 9 of 9 sites declare theirs; that is a start, not a guarantee.
- **The benefit to agents is unmeasured** ([NSP-018 §5.4](NSP-018-THE-SPEC-SPEAKS.md)). Nobody built the same app with
  and without these changes and counted. → **Board lane 7**, SEE-010.
- **The scripts.** Script, Function and Visual Function are contracts, not graded behaviour. About half of a real app's
  logic lives there (P110 §1). → SEE-004 (the script becomes nodes), when lane 7 reaches it.

## Where every leftover went

| left open | goes to |
|---|---|
| NSP-005, NSP-011–015, NSP-017: "AC2's export half" | board lane 6 |
| NSP-020: Router's labels (ADAPTERLABEL) | P112 OWN-006, the editor suite |
| NSP-021 §3.2: which runtimes | P110, the day it unparks |
| R38, R40 | s105, landing as this is written |
| the 31 open `p107-*` ledger rows | the ledger; `node scripts/bugs.js` lists them |

## From now on

A spec is touched when a node changes or a new one is added, and the ratchet says so. No new NSP rulings; a question
about a node's behaviour is a ledger row with `kit: node-spec`.
