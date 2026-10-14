# P107 — next session

**Written 2026-10-14 (s104, Opus).** Read the [README](README.md) §2–§7 (§7 now ends at R40), then
[P107-S95-MINABOVEMAX](../../bugs/p107-s95-minabovemax-a-counter-with-min-above-max-says-nothing-anywhere.md). Its s102,
s103 and s104 paragraphs are the record of R35.

**Model: Opus.**

**Richard's priority (s96):** *"start focussing asap on the remaining node to spec … so the npm package stuff can be finished, and
the backend specs."* Every picker node is graded (ledger 142 of 147, 3 contracts, 2 exempt, 0 owed). What is left is ports,
words and the fixes the specs found.

**s104 in one paragraph.** For Each v11 declares what it tells the editor. A probe came first: one key declared with an empty
message lists the runtime's sentences as divergences. It reached 9 `repeater/` keys, and reading foreach.tsx found one more a
play reaches behind an earlier difference. Ten keys are declared, and four the runtime can raise are unreachable in a play. It
conformed on its first run. The rules column in the *How this node works* modal now lists a node's warnings under "It warns you
when". `catalog:generate` writes `warnings` (`{ key: says }`) on the 13 specs that declare any. Richard ruled three questions
(R38–R40, all as recommended). R39 is built: a Slider with Max below Min now tells the editor, in the runtime and in Slider
v7. Three of the four SEED20738 survivors named in s103 are pinned by hand scenarios (Slider ×2, Text Input). R38 and R40 are
ruled and not built.

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 … NSP-015 | as s44 (NSP-013 left: AC2's export half and the deep run for s11–s14; NSP-014 / NSP-015 left: AC2's export half, P18's) | s1 … s44 |
| NSP-000 the census | ✅ regenerated s104 from HEAD (test counts only) | `7450a121e` |
| NSP-016 the visual nodes | ✅ s71; s73 SCROLLROOM | `aa8abb06f` … `fd6385beb` |
| NSP-018 the spec speaks | ✅ s77 | s72 … s77 |
| NSP-019 Richard reads it | ✅ s95; R35's sentences s102–s104; **the rules column lists a node's warnings (s104)** | s77 … `99625cc67` |
| NSP-009 the ratchet | ✅ s64; floor.runtime **142**, floor.ports **133**, `owed` empty | `6a1ed0084` … s101 |
| NSP-010 a change is a version | ✅ s78 (22 histories now) | `36e08e29e`, `64f9576d9` |
| NSP-017 the escape hatches | 🟡 Left: AC1's export half (P18's) | s64 … s68 |
| NSP-023 the spec without React | ✅ (s50) | s45 … s57 |
| NSP-006 the stranger | ✅ rounds 1–4; nothing s104 touched is guarded | `649e6864d`, s70 … s103 |
| NSP-020 ports without a viewer | 🟡 left: Router's labels (ADAPTERLABEL) | s79 … s102 |
| NSP-021 the second editor | 🟡 Left in §3.2: which runtimes. Round trip (§3.3) = P112 OWN-006 | s87 … s93 |
| NSP-022 the cloud-only nodes | ✅ 17 of 17; Aggregate v2 (R36) | s96 … s100 |
| **R35 (the settings say when they make no sense)** | 🟡 **half 1: 8 of 9 sites.** For Each was added in s104. Left: layout, which is R38. **Half 2:** the Slider (R39, s104). The wider census was not asked for | `0d81cd398` … `4973cc4c2`, `f41a09be3` |
| **R38 a spec knows which way its parent stacks** | ❌ ruled s104, not built | — |
| **R40 warnings read from saved settings** | ❌ ruled s104, not built | — |

## What s105 does (in order)

1. **R38 and R40 together.** Both edit the spec format (`spec.ts`, and `adapter.ts` / `scenario.ts` for R38). Those are
   FORMAT_FILES, guarded in all four stranger rounds. One session that does both pays for one re-grade of the rounds, not two.
   Round 4 alone takes about 36 minutes.
   - **R38, the format.** A scenario says how the node's parent stacks it: `parent: 'row' | 'column'`, read like `wired`
     (spec.ts :266, P107-C155). The default is `'column'`, which is what the runtime target's holder always is
     (node-spec-target.ts :2437, `props: { layout: 'column' }`). With that default, every existing trace stays byte-identical.
     The runtime target's holder takes `props.layout` and `style.flexDirection` from it. Then declare
     `dimensions/wired-dimension-becomes-grow` (viewer-react layout.ts :314-336) on the 11 specs with a size port: Group, Text,
     Image, Video, Button, Checkbox, Text Input, Dropdown, Slider, Radio Button and Radio Button Group. The sentence needs four
     things: the parent's axis, `wired(port)`, a percent along that axis that is not fixed (`layout-map.ts` `sizeRule`, the
     `fill` case), and `style.flexGrow`. Read `Layout.size` :84-108 for what `flexGrow` is set to before writing the sentence.
     `dimensions/` is a shared namespace in the target, so only the named key is graded. Each spec gets a version bump and a
     scenario that warns, then clears when the wire goes or the axis turns. Dropdown is in round 4.
   - **R40, the static reading.** Some warnings are a function of saved settings alone: Counter, Date Add, Date Difference,
     the Slider's Max, and For Each's two "does not compile" keys. Others need events or the play's fixture world (a Focus, a
     Refresh, For Each's `template-component-not-found` against the play's four templates). Reading those statically would
     give false alarms. Proposal: a declared flag on `DiagnosticDecl` (`settings: true`?) marks the first kind. Add a function
     in the package that plays a spec with a node's saved params only and returns those warnings. Then add ONE rule in the
     editor's `validation/rules` (`SemanticValidator`). The Problems panel (`ProjectValidationService`) and the MCP's validator
     both run it, and the validator already imports `@nodegx/node-spec` (`drawnPortLookup.ts`). Skip a node that has a wired
     value input, because the wire's value replaces the saved one. Before shipping, measure false alarms over Richard's
     projects (the `portContextFor` corpus: 201 projects).
   - **Dropdown's `person.blur` survivor** (SEED20738, seed 20739 and round 4). Its scenario file is guarded, so add the hand
     scenario during this same re-grade.
   - Then re-grade all four rounds and refresh the hashes:
     `node -e "require('./tests/stranger-suite-hashes.helper.js').write()"`.
2. **Drive the rules column in the editor.** It was not driven in s104. Graded only as an element tree over the real catalog
   (`tests-unit/nsp-019/nodeRules.test.tsx`). Open *How this node works* on a Counter, a Slider and a Repeater, and check that
   "It warns you when" is visible under the ports. Read visibility with `elementFromPoint`, not with the element's rect.
3. **P107-S95-SEED20738, the rest.** Delete Record and DbModel2 have not been re-measured since s102. The Video and C96 half is
   as s95 left it.

**The recipe for a diagnostic** (s102–s104):
- **Probe first** (s104): declare ONE key in the node's namespace with `message: () => undefined`, then run
  `NSP_ONLY=<type> NSP_SEED=<seed>`. The divergences list the runtime's sentences, but **only each play's first difference**,
  so the count is a floor. Read the namespace in the source for the rest: `grep "'<ns>/"` for `raiseRuntimeError`,
  `setDiagnostic`, `reportOutcome(…{ code })`, `clearWarning`.
- A Refresh-style Failure reaches the editor through the outcome's raise, **once per invocation answered**. A rebuild nobody
  asked for tells nothing.
- Keep the sentences in state (`warnings`). Each `message` is `(_i: unknown, s: State) => …`: an **untyped** `(_i, s)` broke the
  inference of the whole declaration (a signal reducer's `view` became `Inputs`).
- **`says` is shown to people** in the modal, as written and as "No longer: …", and in the rules column. Write it plain and
  short: no "registry array".
- Bump the version, with a `changes` entry whose migration is `none`. Write scenarios that warn and then clear. Run
  `golden.js --type`. Run conformance at 2 seeds. Plant a control (one letter in a sentence, or a dropped withdrawal), which
  must turn red.
- A new state key goes into `tests/page-model.helper.ts` (G1) for a visual spec. Add it before the entry's last field.
- Run `catalog:generate`, then `catalog:merge`; the warnings column reads them. Then run `catalog:check`, `merge.js --check`,
  `spec-ledger -- --check` and `spec-disagreements.js --check`.

## Traps s104 hit

- **zsh does not split `$FILES`.** `git add $FILES` added nothing, and `commit-tree` made an EMPTY commit. It was replaced by
  compare-and-swap on the ref (`git update-ref … <new> <empty>`), because a peer had committed under it. Use an array:
  `FILES=(…); git add "${FILES[@]}"`.
- **A temp-index commit must read the tree of the parent it commits on**, in the same command:
  `P=$(git rev-parse HEAD); read-tree $P; add; commit-tree -p $P; update-ref … $C $P`. If `read-tree` runs earlier and a peer
  commits in between, the commit reverts the peer's work. Check `git show --stat` after every commit.
- **Scenario files differ in JSON layout.** For Each's is indent 1 with no final newline; the controls' are indent 2 with a
  newline. Detect the layout before rewriting a file. One rewrite turned a 21,000-line diff into one line, and HEAD's copy was
  restored.
- **A swap-branch survivor whose effect the next paint repeats in the same settle** is invisible to anything that paints
  first. Kill it with a reader that does not paint. The Slider's survivors were killed by the Focus signal (Unchanged off the
  page, Done on it).

## Human decisions

- None open from s104 (R38–R40 ruled). Still Richard's from before: P107-S89-NIGHTBOOK (P78's); 14 deprecated types have no
  `replacedBy`. P107-S102-SIGNUPBACKEND has a product question inside it: should Sign Up get a Backend picker?

**Open, filed this phase:** P107-S102-SIGNUPBACKEND (low, the runtime's), P107-S101-VERBSPECCED (low, P116's table),
P107-S97-NULLBODY, P107-S97-USERIDBOOLEAN (low); P107-S95-MINABOVEMAX (status `fixed`; R38 is its last site),
P107-S95-SEED20738 (Dropdown, Delete Record, DbModel2, Video/C96 left), P107-S94-DEVHEAP (medium), P107-S93-NOTANAME (low),
P107-S92-VIDEOEMBEDSEED (low), P107-S89-NIGHTBOOK (medium), P107-S89-CFEXAMPLES (low), P107-S89-XMLEXAMPLE (low);
P107-S86-STOREDWIRE (medium); P107-S83-SENDFORM; P107-S79-ADAPTERLABEL (low).

**Routed to P18 (the export):** `nodegx-export/src/emit/dragLib.ts` :69 / :356 (R26). **P109 holds:** D38, the Page Stack, the
Router, LIBRARYDOCS, CHR007SNAPSHOT; P107-S82-STATESVALUEPORT and P107-S82-STATESLOADGATE. **P112 holds:** P107-SIZE.

NSP-010's and NSP-017's uncommitted notes (not this phase's sessions') were left out again.

## Gates (s104, 2026-10-13/14)

- **Runtime conformance:**
  - For Each v11 at seeds 20739 and 20740: 305 / 305 scenarios, 200 / 200 sequences, 0 divergences, 321 / 321 mutants.
    Control: 14 scenarios and 6 sequences red.
  - Slider v7: at 20739, 74 / 74 and 773 / 778; at 20740, 74 / 74 and 788 / 794. 0 divergences, and the mutants not killed
    are declared equivalents. Control: 2 scenarios and 30 sequences red.
  - Text Input: at 20739, 119 / 119 and 5903 / 5911; at 20740, 119 / 119 and 5917 / 5925. The rest are declared equivalents.
- node-spec package (no stranger) **1,954 / 1,954**. `golden --check`: 125 specs, 9,415 scenarios fresh, 22 histories.
  `spec-ledger --check` 142 / 133. `catalog:check` and `merge.js --check` up to date. `spec-disagreements --check` up to
  date. `spec-census` regenerated from HEAD.
- Runtime: typecheck 0 errors; graph + nsp-019-diagnostics + nsp-020 port-context + ports-parity **459 / 459**.
- viewer-react nda-012-visual-value-ports + fld-004 **27 / 27**.
- **Editor** `tests-unit/nsp-019` + `nsp-020` + `sb-017`: **551 / 551** (3 new). **MCP** nsp018 + nsp020: **14 / 14**.
- **`test:ci`: Jasmine 3,015 specs, 0 failures**, seed 87145, exit 0, fresh `test-results.json` (09:34:48 CEST, 2026-10-14),
  HEAD `7450a121` plus the working tree (peers' open edits included). Run alone, with `.webpack-cache` cleared.
