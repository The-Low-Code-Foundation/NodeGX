# P107 — next session

**Written 2026-10-13 (s103, Opus).** Read the [README](README.md) §2–§7, then
[P107-S95-MINABOVEMAX](../../bugs/p107-s95-minabovemax-a-counter-with-min-above-max-says-nothing-anywhere.md). Its s102 and
s103 paragraphs are the record of R35's first half.

**Model: Opus.**

**Richard's priority (s96):** *"start focussing asap on the remaining node to spec … so the npm package stuff can be finished, and
the backend specs."* Every picker node is graded (ledger 142 of 147, 3 contracts, 2 exempt, 0 owed). What is left is ports,
words and the fixes the specs found.

**s103 in one paragraph.** R35's runtime sentences are declared for every site except two. States v5 declares four keys.
The handoff called States "the easiest" site, but its `:723` call only *withdraws* a warning. The sentences come from the
error bus, which reaches the editor keyed by the code. Declaring one key makes the runtime target record the whole namespace,
so all four raises a play can reach had to be modelled. The Focus warning (`focus/not-mounted`) was the three sites "Group",
"Text Input" and "the controls' helper". They are one sentence on seven specs: Group, Text Input, Button, Checkbox, Dropdown,
Radio Button and Slider. Icon's `visual/icon-source-not-an-icon/iconIconSource` is declared on the six nodes that have an
Icon Source. `visual/` belongs to the base visual class, so the runtime target now grades only the keys a spec names in
`visual/` and `dimensions/`. The runner gained `editorOnly`: a mutant that changes only what the editor is told is not a
survivor on a target that has no editor. The enriched catalog had been stale since s101 (17 cloud nodes), and s103's first
commit made States stale too. Both are fixed by `catalog:merge`.

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 … NSP-015 | as s44 (NSP-013 left: AC2's export half and the deep run for s11–s14; NSP-014 / NSP-015 left: AC2's export half, P18's) | s1 … s44 |
| NSP-000 the census | ✅ regenerated s102 from HEAD (test counts only) | `7d9a55dcd` |
| NSP-016 the visual nodes | ✅ s71; s73 SCROLLROOM | `aa8abb06f` … `fd6385beb` |
| NSP-018 the spec speaks | ✅ s77 | s72 … s77 |
| NSP-019 Richard reads it | ✅ s95; R35's sentences s102–s103 | s77 … s103 |
| NSP-009 the ratchet | ✅ s64; floor.runtime **142**, floor.ports **133**, `owed` empty | `6a1ed0084` … s101 |
| NSP-010 a change is a version | ✅ s78 (21 histories now) | `36e08e29e`, `64f9576d9` |
| NSP-017 the escape hatches | 🟡 Left: AC1's export half (P18's) | s64 … s68 |
| NSP-023 the spec without React | ✅ (s50) | s45 … s57 |
| NSP-006 the stranger | ✅ rounds 1–4; round 4 re-graded s103 (Dropdown), its guarded files now include the three warning modules | `649e6864d`, s70 … s103 |
| NSP-020 ports without a viewer | 🟡 left: Router's labels (ADAPTERLABEL) | s79 … s102 |
| NSP-021 the second editor | 🟡 Left in §3.2: which runtimes. Round trip (§3.3) = P112 OWN-006 | s87 … s93 |
| NSP-022 the cloud-only nodes | ✅ 17 of 17; Aggregate v2 (R36) | s96 … s100 |
| **R35 (the settings say when they make no sense)** | 🟡 **half 1: 7 of 9 sites** — Counter (s95), Date Add + Date Difference (s102), States, Focus ×7, Icon Source ×6 (s103). Left: For Each, layout. Half 2 not started | `0d81cd398`, s102, `e9e322a90`, s103 |

## What s104 does (in order)

1. **For Each** (`repeater/items-not-a-collection`, foreach.tsx :320). This is a namespace job, not a single sentence. Declaring
   the key makes the runtime target record every `repeater/` key, and foreach.tsx raises about 15 more on the error bus:
   template-script-syntax-error :361, template-script-threw :521/:534, input-mapping-threw :577, no-template-for-item :598,
   row-build-failed :620, template-component-not-found :627, no-template :785, no-items :793, items-copy-threw :821,
   no-target :836, operation-threw :926, items-empty-entry :1034, input-mapping-syntax-error :1099. Start with a probe: declare
   only the key and run `NSP_ONLY="For Each"` at one seed. The divergences list the raises a play actually reaches, and
   those are the ones to model. A play is not likely to reach all of them. `itemsProblem` needs `Model.instanceOf` and
   `Collection.instanceOf`, so read how the registry (`registry.ts`) represents a record and a collection before copying it.
   `describeValue` is already in `src/nodes/describe-value.ts`.
2. **Layout** (`dimensions/wired-dimension-becomes-grow`, layout.ts :314-336). Measured in s103, not built. The sentence needs
   the parent's direction (`parentLayout`), whether `width` / `height` is **wired** (`isInputConnected`), and the rendered
   `flexGrow`. Those are graph and render facts, and a single-node play holds none of them. `dimensions/` is already a shared
   namespace in the target, so declaring the key on one node does not pull in the others. This is a format question
   (`PlayContext.wiredInputs`? a layout parent in the context?). Write the options down, and take it to Richard or to Fable
   rather than building it.
3. **R35 half 2: census the contradictions nobody raises.** Slider's Min / Max is the next by name. Each one found is a
   runtime change plus a spec version, as Counter v2 was. Ask before changing runtime behaviour (R3 (a)).
4. **The rules column** (s95's step 3) still does not list a node's diagnostics (`rules.js` → `catalog:generate`). After the
   regen, run `catalog:merge` as well. s103 learned that `catalog:generate` does not refresh the enriched catalog.
5. **The static reading** (s95's step 4, not asked yet; offer it). The Problems panel and the agent's checker could evaluate
   a spec's `diagnostics` over saved params with no preview running. Say what it costs and ask.
6. **P107-S95-SEED20738.** s103 measured more of the same survivors against HEAD's specs, so they predate it: Slider
   `person.click` ×2 (20739), Text Input frame-end drop-set (20740), Dropdown `person.blur` (20739, and stranger round 4 at
   today's seed). Delete Record and DbModel2 are as s102 left them. A hand scenario per survivor ends it.

**The recipe for a diagnostic** (s102 + s103):
- Read the runtime's call, then **grep the node's namespace** (`'<ns>/`) for `raiseRuntimeError` and `reportOutcome(…{ code })`.
  Every raise there reaches the editor under its code, and the target records the whole namespace once one key is declared.
  `visual/` and `dimensions/` are the exceptions: only the named keys are recorded there (`SHARED_DIAGNOSTIC_NAMESPACES`).
- Copy the sentence with its `:line` citation. Keep editor-only state in its own field and **set it on every press**. A
  "set only when it moves" split leaves swap-branch pairs that no play can tell apart.
- Bump the version, with a `changes` entry whose migration is `none`, and add a scenario that warns and then clears.
- Run `golden.js --type`, conformance at 2 seeds, and plant a one-letter mutant in the sentence: it must give divergences.
- A new state key must go into `tests/page-model.helper.ts` (G1). Add it **before** the State type's last field, because
  `page-model-plants.test.ts` anchors on the last field of Slider, Dropdown and Radio Button.
- A spec in a stranger round (Dropdown, Counter, …) owes that round a re-grade (`NSP_ONLY=<type> npx jest
  tests/stranger.test.ts`, 35 min for round 4). Any module the spec newly imports joins the round's guarded files. Then run
  `node -e "require('./tests/stranger-suite-hashes.helper.js').write()"`.
- Run `catalog:generate`, then `catalog:merge`, then `catalog:check` and `node scripts/node-catalog/merge.js --check`.

**Census from HEAD (s102):** `git archive HEAD packages scripts/node-spec dev-docs/tasks/phase-107-the-node-says-what-it-does |
tar -x -C <scratch>/headtree`, run `node <scratch>/headtree/scripts/node-spec/census.js`, copy `census.json` and `CENSUS.md`
back, and commit only those two. Not regenerated in s103: no test counts changed that it reads.

## Traps s103 hit

- **The handoff's "easiest first" was wrong for States.** Its diagnostic call only withdraws. The raises are on the error bus.
  Read the namespace, not the call.
- **A declared equivalent can go to 0 at the package's fixed seed** when a new diagnostic kills the survivors it covered
  (`batch-time.test.ts` reads ×0 as dead). Do not drop the declaration if it still fires on other seeds. Pin one with a hand
  scenario that only that branch reaches (States' To Last / To First).
- **`docs:nodes:check` reads 37 stale pages**, including other workstreams' (today's P112 Condition note, Drag, Video,
  Timer). They are build artefacts (`docs-site:build` regenerates them). s103 did not regenerate them.
- **A peer committed catalog files mid-session** (`74c19d5ab`, P112). Diff a regenerated catalog against HEAD before staging
  it. s103's diff held only its own sentences.

## Human decisions

- None opened by s103. Still Richard's from before: P107-S89-NIGHTBOOK (P78's); 14 deprecated types have no `replacedBy`.
  P107-S102-SIGNUPBACKEND has one product question inside it: should Sign Up get a Backend picker? Layout's diagnostic (step 2)
  will need a format decision.

**Open, filed this phase:** P107-S102-SIGNUPBACKEND (low, the runtime's), P107-S101-VERBSPECCED (low, P116's table),
P107-S97-NULLBODY, P107-S97-USERIDBOOLEAN (low); P107-S95-MINABOVEMAX (7 of 9 sites done; For Each and layout left, then
half 2), P107-S95-SEED20738, P107-S94-DEVHEAP (medium), P107-S93-NOTANAME (low), P107-S92-VIDEOEMBEDSEED (low),
P107-S89-NIGHTBOOK (medium), P107-S89-CFEXAMPLES (low), P107-S89-XMLEXAMPLE (low); P107-S86-STOREDWIRE (medium);
P107-S83-SENDFORM; P107-S79-ADAPTERLABEL (low).

**Routed to P18 (the export):** `nodegx-export/src/emit/dragLib.ts` :69 / :356 (R26). **P109 holds:** D38, the Page Stack, the
Router, LIBRARYDOCS, CHR007SNAPSHOT; P107-S82-STATESVALUEPORT and P107-S82-STATESLOADGATE. **P112 holds:** P107-SIZE.

NSP-010's and NSP-017's uncommitted notes (not this phase's sessions') were left out again.

## Gates (s103, 2026-10-13)

- **Runtime conformance**, seeds 20739 and 20740 (States also 20741): States v5, Group v8, Button v4, Checkbox v5, Dropdown v9,
  Radio Button v5, Slider v6, Text Input v7 and Icon v2 all ran 200 / 200 with **0 divergences**, and every hand scenario
  passed (except States' known row STATESVALUEPORT). The reds are the SEED20738 survivors only, measured against HEAD's specs.
  Icon 105 / 105 mutants.
- **Controls:** States, one letter → 4 scenarios + 5 sequences red, the clear dropped → 6 + 17. Focus module, one letter →
  Button 8 + 13; the flag never set → 8 + 13. Icon, one letter → 1 + 90.
- **Stranger round 4** (Dropdown, 36 min): AC2 1104 / 1106 caught plus 2 editor-only; AC1 red only on `person.blur`
  (SEED20738); hash gate refreshed (39 files) and green.
- node-spec package (no stranger) **1,954 / 1,954**; `golden --check` 125 specs fresh, version rule held, 21 histories;
  `spec-ledger --check` 142 / 133; `catalog:check` and `merge.js --check` up to date; `spec-disagreements --check` up to date.
- Runtime: typecheck 0 errors; graph + nsp-019-diagnostics + nsp-020 port-context + ports-parity **459 / 459**.
- **Editor** `tests-unit/nsp-019` + `nsp-020` + `sb-017`: **548 / 548**. **MCP** nsp020: **9 / 9**.
- **`test:ci`: Jasmine 3,015 specs, 0 failures**, seed 20715, fresh `test-results.json` (finished 19:27:27Z), HEAD `6f1d8b9e` +
  the working tree (peers' open edits included). Run alone, `.webpack-cache` cleared.
