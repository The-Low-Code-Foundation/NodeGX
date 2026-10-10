# NSP-018 — The spec speaks: port descriptions and `get_node_type` come from the spec

> **Grown by R6 (2026-09-30):** not only descriptions — the **catalog itself** (`node-catalog.json`:
> ports, types, defaults, groups, display names, enum labels, dynamic-port mechanisms) is *generated
> from the specs* for every specced node, and the runtime's registration is graded against it rather
> than being its source. The catalog-parity gate in `packages/nodegx-node-spec/tests/catalog-parity.test.ts`
> (s1) is the per-node precondition; `get_node_type` answers per-instance ports from NSP-020's
> `ports(params)`. The extractor in `scripts/node-catalog/` keeps running for the unspecced remainder
> and a merge prefers the spec — one catalog, two sources, the spec winning where it exists.

**Opened 2026-09-29.** **Depends on NSP-011.**
**Status: 🟡 s75 (2026-10-10): AC1, AC3, AC4, AC5 met; AC2 counting — 247 of 507 input reducers have their words (52 specs fully: the pilot five, NSP-011's 13, the most-used logic nodes, and the most-placed visual, record, user and popup nodes), the typecheck gate waits for the rest.**

## 1. The person sentence

> **What a person reads in the property panel and the docs, and what an agent reads over MCP,
> comes from the same spec the tests grade — so it cannot say one thing while the node does
> another.**

## 2. What to build

- **Descriptions from the spec.** Each spec port carries its `doc` string; for a specced node, the
  catalog (`catalog:generate` → `node-catalog.json`) takes the description from the spec, and a
  gate fails if the runtime definition's `description` differs from it. The runtime keeps its
  field (the editor reads it), but the spec is where it is edited.
- **Rules in words.** From each reducer's branches, a short generated list — *"Increase: at Max
  Value with Limits Enabled → Unchanged, Count Changed stays silent"*. Generated from the spec's
  structure plus a one-line `says` on each branch, never free prose.
- **`get_node_type` returns the rules** for specced nodes, inside the MCP tool budget.
- **`idioms` — the code this node replaces** (optional field on a spec). A short list of the
  hand-written code shapes that do what the node does, each one line with a tiny example:

  ```ts
  idioms: [
    { says: 'a number in state with +1 / −1 / reset handlers', example: 'const [n, setN] = useState(0)' },
    { says: 'a clamped counter', example: 'setN((n) => Math.min(n + 1, max))' },
  ],
  ```

  **Nothing in this phase reads it.** It is the lookup table a future *import your app into a
  canvas* agent would need (README §8) — which node to reach for when it meets a pattern in
  someone's React — and it is cheapest to write while the person writing the spec has the node's
  behaviour in their head. It is not served by `get_node_type` (it would spend the MCP budget on
  a feature that does not exist yet).

## 3. Acceptance criteria

1. For every specced node, the catalog description equals the spec's; editing only the runtime's
   description fails the gate (planted, shown).
2. Every reducer branch has a `says` line; a branch without one fails the spec's typecheck.
3. `get_node_type` for Counter includes its rules; the MCP tool-surface budget gates stay green
   (memory: *5 budgets, 8 free* — read them, don't assume the headroom).
4. `docs:nodes:check` stays clean after regenerating (memory: a regenerated artefact can delete a
   hand edit — diff before and after).
5. `idioms` is typed and optional; the ledger reports how many specced nodes carry it (a count,
   not a gate), and every T1 node specced in NSP-011 has at least one.

## 4. Watch for

- Memory: *a documentation sentence can grade the code it describes — move the code, not the
  sentence.* When a description and the spec disagree, the spec (read from the code) wins, and the
  description changes.
- Memory: *a stale MCP `dist/` hides a merged vocabulary field.* Rebuild the MCP package before
  reading what `get_node_type` returns.

## 5. Built — s72, 2026-10-09

**AC1 ✅ — the catalog takes a specced node's descriptions from its spec.** `scripts/node-catalog/generate.js`
loads the registry from source (`scripts/node-spec/load-specs.js`, now shared with `spec-ledger.js`), writes each
specced port's description from the spec, and **throws in both modes** when the runtime's registration says other words,
naming the node, the port, the runtime file and both sentences. Outcome ports (`done`, …) are derived, not declared,
and keep the runtime's words. Before: `catalog:check` exit 0. After: exit 0, the catalog byte-identical (no description
disagreed). **Plant:** "or does nothing" → "or quietly does nothing" in the runtime's `counter.ts` only → `catalog:check`
exit 1 with the Counter · input "increase" disagreement; restored by `cp`, `cmp`-identical. CI: the `node-catalog` job in
`pr.yml` runs `catalog:check` (comment added). The parity test's description half now holds by construction.

**AC2 🟡 — `Patch.says`, the rules generator, the count.** `says?: string` on `Patch` (spec.ts): the case a branch answers,
in words. `scripts/node-spec/rules.js` reads every `defineNode({ type }).on({ … })` from the TypeScript AST and turns
each said branch into `<case> → <the pulses, then the outcome>; <a sibling's pulse this branch lacks> stays silent`:

```
increase: at Max Value with Limits Enabled → Unchanged; Count Changed stays silent
increase: otherwise the count goes up by one → Count Changed, Done
startValue: after the first: only where Reset returns to → Count Changed stays silent
```

The case is the author's; everything after the arrow is the spec's structure. Nothing that runs a spec reads `says`
(`shapeOf` builds a branch's shape from named keys only). `generate.js` writes the lines as the catalog node's
`rules: { [inputPort]: string[] }`, and `catalog:merge` carries them to the enriched catalog. `spec-ledger` prints the
count: **`in words: 4 of 507 input reducers … 1 spec(s) fully: Counter`**, and names the two specs the source read can't
see (Add / Remove Record Relation, built in the `relationNode` factory). `--json` has `said`.
**Why the gate is not on yet:** making `says` required, measured on the whole registry, gives **510 `tsc` errors**
(`tsc` reports per reducer, so there are more branches than that). The gate is a one-line flip (`says?` → `says`) once
the count reads 507 of 507. Limits: input reducers only (`afterInputs`, `world`, `person` patches are not read yet), and
a `says` must be a literal in the patch's own object literal (the reader throws on anything else).

**AC3 ✅ — `get_node_type` returns Counter's rules.** `NodeTypeDetail.rules` (noodl-mcp `catalog.ts`) on
`detail:"full"`, and on the `ports` path **narrowed to the asked ports** (`ports: ["increase"]` gets `increase`'s two
lines). **Not on the default summary**, on purpose: CMP-006 measured 45 real calls (26 default, 18 `ports`, 1 full), so
`ports` is the path that reaches agents. The summary's size is a measured contract (AWP-005 §2), and a big visual node's
rules can't be priced until it has them. `tests/nsp018RulesOnTheWire.test.ts` (5 tests) has an arming check, and its
negative summary assertion is there to be overturned with a measurement. **Plant:** the `detail.rules =` line removed →
the two relay tests red, the other three green; restored, `cmp`-identical. Budgets: `toolDisclosure` reads `[surface]
8261 tokens / 20 resident tools — 19 under the 8280 budget`. No tool description changed (a result field is free).
`cmp006…`, `cmp009…` and `toolDisclosure` are green beside it (4 suites, 54 tests).

**AC4 ✅ — `docs:nodes:check` clean.** It was **red before this work** with two stale pages (`visual/page-stack.md`,
`visual/for-each.md`), from P109's ISL-048 (`c22c9aceb`) and ISL-049 (`a5d6abb33`), which regenerated the enriched catalog
and not the pages. Regenerated: the diff is exactly those two pages. After the rules landed, the catalog and enriched
regenerated with a Counter-only diff (`rules`, +17 / +10 lines), and `catalog:merge:check` and `docs:nodes:check` are clean.
The docs pages don't render `rules` yet (§6).

**AC5 ✅ — `idioms`.** `Idiom { says, example }` and `NodeDecl.idioms?` (spec.ts). Eighteen specs carry them: the 13 T1
nodes of NSP-011 and the pilot five. `spec-ledger` prints `idioms: 18 of 108 specs`, and **`--check` fails a T1 NSP-011
spec without one.** Plant: Or's renamed away → `"Or" is a T1 node NSP-011 specced and its spec has no idioms"` and
exit 1; restored. **R11 note:** `idioms` is the one place React names belong in a spec (`useState`, `useEffect`). It
describes the code a node *replaces*, not the node's behaviour, and the task's own example is React.

## 5.1 s73, 2026-10-09 — the pilot five and NSP-011 in words; the reader stops dropping pulses

**38 of 507, 16 specs fully** (`spec-ledger`: Counter, Switch, Condition, String Format, Boolean, Number, String, Color,
Boolean To String, Color Blend, Inverter, Log, Number Remapper, String Mapper, Substring, Value Changed; And and Or
have no input reducers). Catalog regenerated → merged → docs (the pages don't render `rules` yet); the three `--check`s
exit 0.

**The reader dropped pulses.** `rules.js` kept only the string-literal elements of `emit`, so Switch's Flip
(`emit: [s.on ? 'switchedToOff' : 'switchedToOn', 'switched']`) would have read "Switched, Done", one pulse short. A
said branch's `emit` and `outcome` must now be literal and a spread in it is refused. Each throws naming file:line and
the reducer. Switch's Flip and State are split into their two cases. That is behaviour-neutral, because mutants come
from the patches the reducer returns, not from how the source is laid out; Switch conformance on the runtime is still green.

**The reader follows helpers.** A reducer that calls a named function (same file, or a `./sibling` import in
`src/nodes`) or is one (`saveValue: onSet`) is read through it. The four Variables' words live once, in
`variable-base.ts`. `'deferred' as const` reads as a literal. An `idioms` entry (`{ says, example }`) is never a branch.
`tests/rules-reader.test.ts` (12) grades it on fixture files beside a control on the real tree. Two plants: the emit
guard removed → exactly the ternary case red; helper-following off → exactly the three following cases red. Both
restored by `cp`, `cmp`-identical.

**Deferred work is said in words, for now.** Condition and String Mapper do their visible work in `afterInputs`, which
the reader does not read. Their input reducers' words say what the end of the frame will do ("tested at the end of
the frame — On True or On False, from the frame's last value"). The tail after the arrow is still only what the
reducer itself puts on the wire.

**Found by writing the words: [P107-D38](../../bugs/p107-d38-boolean-to-string-s-selector-changed-fires-without-a-flip.md)**.
Boolean To String's Selector Changed fires on any different raw Selector value, and its description says "when Selector
flips". The honest second case reads "a different value, even one that picks the same string". That is a ruling for
P109: correct the words or compare truthiness.

**Batch 2: the most-used logic nodes (59 of 507, 24 specs fully).** Ranked by how often the shelf templates
(`templates/`) place each unworded spec: Group 1,791 · Text 1,251 · Function 1,054 · Set Variable 614 · Button 537 ·
Expression 344 · Variable 228 · For Each 191 · Text Input 167 · Router Navigate 131 · States 106. Worded: Function,
Set Variable, Expression, Variable, Router Navigate, States, Static Data, Cloud Function. `rulesInWords` now leaves a
`pending` outcome off the wire, as it did `deferred` (Router Navigate read "→ pending"). Most of these nodes do
their visible work at the end of the frame or when the world answers, so the words carry it. The tail after the
arrow is only what the reducer itself sends.

**Found by writing the words: [P107-C155](../../bugs/p107-c155-the-spec-format-cannot-say-a-port-is-wired.md)**.
Function's Script setter runs the code only `if (!this.isInputConnected('run'))` (:386); so does Expression's text
setter (:611). The spec format has no notion of a wired port, and the runtime target never wires one, so both targets
take the unwired arm and agree by construction. Five branch sites are left after NDA-017 §2: Function, Expression,
Run Tasks, Page, and `layout.ts`. The words name the precondition: "new code, with Run not wired: …".

**Not worded yet, and why (the next batch's design question):** Group (22 reducers), Text, Button, For Each and Text Input
build some patches the reader cannot see through. Group returns a shared `NOTHING` constant (an identifier, not a
literal). Group's Focus builds its pulse as `emit: [...listing.emit]`, which the reader refuses, rightly. For Each returns
`run(s, view, (w) => …)`, whose patch is computed from a mutable draft, and its Refresh is `{ ...run(…), outcome }`,
a spread. Options: rewrite those branches as literals (Group's `NOTHING` → `{ says, send: [] }`; Focus split into its
listed / not-listed cases), or give the format a reducer-level form for a computed patch, such as
`said('words', patch)`, read as words with an unknown wire. Lean: literals where the branch count is small, since the
tail after the arrow is the point. For Each's `run` is the one that may need the second form.

**Census:** `spec-census:check` was red at HEAD (test-mention counts from other phases' committed tests, +1 in a
dozen places). Regenerated from a clean `git archive HEAD` export. With and without s73's inputs the output is
byte-identical. `spec-census:check` is in no CI workflow.

## 5.2 s74, 2026-10-10 — the most-placed visual and record nodes in words; `said` for a computed patch

**186 of 507, 37 specs fully** (+127 reducers). Batch 1: Group 22, Text 16, Text Input 18, Button 6, For Each 5. Batch 2, the
next by template use (Options and Timer skipped: stranger-guarded): Image 19, Checkbox 10, Columns 9, Update Record 8, Router 6,
Create Record 4, Delete Record 4, Icon 2. Catalog regenerated → merged → docs: the diff is thirteen `rules` blocks, nothing
removed, the pages unchanged (they don't render `rules`); the three `--check`s and `spec-ledger --check` exit 0.

**The computed-patch question, decided both ways (§5.1's lean).** Where a branch is a constant or a spread of a computed
listing, it is written out as literals: `NOTHING` (Group, Text, Button, Text Input) → `{ says, send: [] }`; Group's Focus,
which spread a computed listing into `emit`, is six literal cases (off the page / already listed / listed, each with and
without outcomes the frame has resolved and not reported); Pointer Events Mode and Accept File Drops are split on their
ternary. Behaviour-neutral (the interpreter's visual batch, which plays all five with mutants, is 19 / 19). Where the patch
is built from a draft of the whole state — For Each's `run`, Text Input's Value / Backspace / Clear through `setText`,
`edit` and `clear` — a new **`said('words', patch)`** (spec.ts, beside `Patch.says`) puts the words on the computed patch.
The reader reads it as a **`computed`** branch: its line is the words alone, with no wire after the arrow and **no
sibling's pulse named silent** (the patch may send it). So the words carry what the wire does, as they already did for
Condition's end-of-frame work. `said` is for a computed patch only; a literal patch's wire half is read, and that is the
point. `tests/rules-reader.test.ts` 14 (two new). Two plants: the `said` arm off → exactly the two new cases red; the
computed guard off → exactly the "no sibling named silent" case red; both restored by `cp`, `cmp`-identical. spec.ts is
stranger-guarded: hashes rewritten, `tests/stranger.test.ts` re-run in the same commit.

**Gates.** The interpreter's suites for every worded spec (visual, records, navigation) 465 / 465 with the reader, ledger and
parity; the stranger 46 passed, 18 skipped; the MCP rules relay and tool budget 23 / 23. A runtime spot-check of Group found
a seed-dependent `clickAway` survivor that the HEAD spec has too: [P107-S74-CLICKAWAY](../../bugs/p107-s74-clickaway-group-s-click-beside-it-has-a-twin-branch-no-scenario-tells-apart.md).

**What the words say for a visual node.** A visual node's inputs mostly set what the next paint, act or drop reads, so most
lines are `always: read at …` / `always: … at the next paint` — the reader's job there is the honest case, not the wire.
The tails that do carry something are the actions (Focus, Blur, the scrolls, Set / Insert / Backspace / Clear) and the
switches that end a gesture (Accept Drops off over a drag, Accept File Drops off over a file).

## 5.3 s75, 2026-10-10 — Options, Timer and the next fourteen in words; the Group's click-away hole closed

**247 of 507, 52 specs fully** (+61 reducers, 15 specs). Re-ranked by template use: Options 9, Timer 3, User 2, Log Out 1,
Record 4, Animate To Value 6, Log In 3, Filter Collection 8, Sign Up 4, Request Magic Link 3 (and Sign In With's press, which
shares its helper), Repeat 3, External Link 3, Show Popup 6, Close Popup 4, UUID 1. Five spec files are stranger-guarded
(Options, Timer, Animate To Value, Repeat, UUID; their scenario files are unchanged), so they share one commit, one hashes
rewrite and one stranger run. The catalog diff is sixteen `rules` blocks and nothing else.

**Behaviour-neutral splits.** Where a branch's wire was computed, it is split into literal arms that return the same patches:
Timer's Stop (its outcome was a ternary); Repeat's Start (`send: count changed ? ['count'] : []`); Animate To Value's Jump To
(a `set` built by mutation); the shared `press` helpers in user-actions.ts and user-handovers.ts (first press of the frame /
another press); Record's Id Source and Repeater Component (split on whether they bind); User's Run On Value Change. Record's
Id goes through `said`, because its patch comes from a draft (`changes(s, st, …)`) and its pulses are the reaction's.

**P107-S74-CLICKAWAY fixed.** A mouse click beside the Group while a finger's gesture is under way takes the branch that leaves the
gesture alone (`pointerUp` ends only the gesture of the pointer that started it). No scenario held a finger, clicked beside the Group, and then waited
for the hold. One new Group scenario does (trace read: Picked Up at 500 ms, Cancelled at the lift). Seed 20736: interpreter
mutants 3,659 → 3,660 / 3,668 (8 listed equivalents); runtime CONFORMS, 1,435 / 1,435 scenarios, 200 / 200 generated.

**Gates.** `tsc --noEmit` (node-spec) clean. The suites that play every touched spec, with the reader,
ledger, parity and pilot (batch-visual, -time, -records, -data, -navigation, batch, world, rules-reader, spec-ledger,
catalog-parity, pilot): 11 / 11, 630 passed, exit 0. Stranger, hashes rewritten for the five guarded specs: 46 passed,
18 skipped, exit 0 (563 s). noodl-mcp `nsp018RulesOnTheWire` + `toolDisclosure` 23 / 23 (`[surface] 8261 / 8280`,
unchanged). `catalog:check`, `catalog:merge:check`, `docs:nodes:check`, `spec-ledger --check` exit 0. Not run: the full
node-spec suite, the editor's `tsc`, `test:main`.

## 5.4 s76, 2026-10-10 — rules priced on the default summary, and kept off it

§6 item 3, by CMP-006's method (count the traffic, price through the real function). **Traffic:** every `get_node_type`
call in every transcript under `~/.claude/projects`, deduplicated by tool-use id: **67 calls, 2026-09-10 … 10-09** (41 default,
20 `ports`, 6 `full`). CMP-006's 45 earlier calls are no longer on disk: transcripts older than about a month are gone, so
its count is the only record of them. **Price:** the 141 type-requests on the default path, each through `getNodeTypeSummary`
and pretty-printed as `jsonResult` sends it, without and with the type's `rules`. At 52 worded specs, 108 of the 141 requests
hit a type with rules.

| | rules on the summary | signal inputs' rules only | `antiPatterns` (CMP-006 AC3) |
|---|---|---|---|
| whole default traffic | **+30.7%** (358,979 → 469,110 B) | +11.9% | +5.8% |
| weighted median / max | +30.5% / +84.2% (Update Record) | | 17% / 59% |
| storefront basket (AWP-005 ratchet 8,350 on the wire) | ~7,530 → ~10,449 tok of payload | ~8,116 | |
| biggest summary (gate 3,000) | Group 1,792 → 2,694 tok | 2,092 | |

**Kept off.** It costs five times what `antiPatterns` cost, and the cost lands on the types asked for most (Group +50%,
Text Input +47%, For Each +48%). It also grows with each spec given words, and 260 reducers are still to come. Signal inputs
alone would still break the basket ratchet. The `ports` path already hands an agent a port's rules when it sets that port,
and the tool description already sends agents there. So the negative assertion in `nsp018RulesOnTheWire.test.ts` stays, now
with these numbers in its header (and in `NodeTypeDetail.rules`' doc comment). What would overturn it is a replay showing
that rules on the default change what an agent builds. The benefit is unmeasured, as it was for CMP-006.

**The same traffic, used to rank AC2.** Of the 51 specs still owing words, only Slider (`net.noodl.controls.range`) was
asked for, once. Templates (s75), MCP traffic (s76): both rankings are used up. The remaining order is by cost (one spec
file at a time), because the gate needs every reducer anyway.

## 6. Left

1. **AC2's words for the other 260 reducers** (s75), batch by batch (done: the pilot five, NSP-011's 13, the top logic nodes, the top visual and record nodes, and s75's fifteen; next by template use — re-rank first; what is left is mostly unplaced in the templates, so rank by the editor's picker use or by CMP-006 traffic). Then
   flip `says?` to `says` in `Patch`, which is the typecheck gate. Every patch-returning function then owes one, so decide
   first whether `afterInputs` / `world` / `person` patches get read as rules too.
2. **The record-relation pair:** the rules reader can't see reducers written inside `relationNode`. Teach it the factory,
   or move `says` up to the factory's call site.
3. ~~**The default summary**~~ — priced and kept off (§5.4): +30.7% of the default path's traffic. Reopen only with a replay
   that measures the benefit.
4. **The docs pages** (`scripts/generate-node-docs.js`) could render `rules` under the port table. That's the "docs"
   half of the person sentence.
