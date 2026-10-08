# Next session — P109 session 32

**Phase:** [README](README.md) · **Audit:** [AUDIT-2026-10-01.md](AUDIT-2026-10-01.md) · scoped at `27d891bf3`.
**Session 31 (2026-10-08 → 09, on `cline-dev`; a `/clear` mid-session, picked up from the transcript):** landed by compare-and-swap,
each row graded on the runtime at seeds 13 and 20732 with a control and the interpreter's mutants at both seeds:
ISL-031's **C77** (`167c40e9c`, ISL-031 ✅); ISL-048's Component Stack **C107–C112** (`cd5f66a1a`…`62b89308b`), its address
**C119, C121–C125** (`f13a3d88f`…`b5b06bcb6`), **C113** (`2cc6d1dd7`), the catalog's **C127** (`df238bd79`), and the Drag's
**C106, C102, C105** (`a36403e21`…`3049f95d5`, every known row of the Drag gone) and ruled **C104, C103** (`9e19b3841`, `3506fc6e9`).
Scoped **C138, C139** into ISL-048 and **C135–C137, C140–C143** into ISL-049 (`cd934e7db`). Board: **24 of 50 closed**; ISL-048
**24 of 29**. Records: ISL-048 §9–§10.

## Do, in this order

1. **ISL-049 (the Repeater, 11 rows, nothing to ask).** C128 first (high), with C135, C140, C141 — the same stop reached by other
   lines: one catch in the operation that spans `getTemplateForModel` and `_mapInputs` (C141's throw is in the record's `change`
   listener: catch there too). Then the ruled C129–C131, C136, C137, and C142, C143. Every row is MODELLED: a Repeater spec version
   (P107 plans v3), the trace diff of every scenario, mutants at two seeds. P107 s62–s63 rewrote the Repeater spec (v2, 291
   scenarios) — read NSP-016 §7.24 and the spec's header first. C141 has no regression yet (a lone node cannot grade it; it needs a
   graph scenario with a writer — `bugs.js check` names it).
2. **ISL-048's last five.** C138 (ruled "Read it as a number" — Drag spec **v3**: C106 took v2, P107's handoff still says v2; tell
   them). C139 (ruled: a new Component Stack option that keeps its pages through Mounted off and on — a new input: name, description,
   spec version, and the catalog regenerated in a worktree). C114 (Children Count a frame late after a remount — read why first).
   C120 and C126 wait on P107's world (the browser's history stepping back and an entry replaced) — ask P107 when it is next free.
3. **ISL-050 (the Columns):** C133 first (high), then C134, C132 — unchanged from s30's list.
4. ISL-013 slice 2, ISL-018 AC5, ISL-012 AC3. **Track G** (ISL-039 … ISL-047) waits on Richard's order.

## What s31 learned

- **A recorded scenario can fail to reach the path its name claims.** C106's NaN scenario wrote NaN once; the spec's `!==` and the
  fix's `Object.is` traced alike, because a NaN sent again is silent on the wire (an output publishes only a change). The generated
  sequences found it (a drag between two NaN paints); the regression added that. Before trusting "no trace changed", ask what an
  output that repeats its value hides.
- **A wait loop can match itself.** `while pgrep -f "jest|vitest"` written inline in a Bash command matched its own shell (the
  pattern is in its argv) and waited an hour, twice. Write `pgrep -f "[j]est|[v]itest"`.
- **A port behind a switch needs the switch in the catalog.** C127: the probe alone would have said every page always has a Path.
  `parameterEncoding.patterns[].when` is the generic answer (`applyEnablingConditions`); only the Page Stack carries one today, and
  `catalog-parity.test.ts` probes a `when` pattern with and without it.
- **A view-only fix grades in the viewer.** C103 and C104 change what the Drag renders, not its wire: graded with DEF-027's harness
  (real Drag, wrapper and Text, `renderToStaticMarkup`), each with a control on the Drag before. C103's wrapper column is this
  session's reading, not the ruling's; the catalog example's browser render is owed.

## Gate readings taken s31 (2026-10-09)

- Last landing tree (`cd934e7db`'s code): viewer 1,826 / 1,826, viewer tsc 0, page model and catalog parity 332 / 332, spec tsc 0,
  Drag v2 22 / 22 at 20732. Earlier batches: spec landing gates 505 / 523 (18 skipped), Page Stack v15 150 / 150, catalog `--check`,
  merge check, encoding selftest 20 / 20, nine MCP catalog and budget suites 132 / 132.
- `bugs.js check`: six problems — s30's five and C141's "regression none yet" (P107's, now scoped here).

## Decisions for Richard (not yours)

- **Track G's order** (asked s29): ISL-039 data-loss blockers, ISL-040 security holes, or ISL-013 slice 2 first.
- Carried: the layout of an unlabelled control in a real browser; `P109-S24-SIGNINWITHERRORKEPT`, `P109-S22-BUILTINBOUNDARY`,
  `P109-S20-LISTDEFAULTTYPE`, `P109-S18-REFRESHROWSTATE`, ISL-010 AC4 and the Effort port, pushing `cline-dev`, publishing the
  Garden kits at the origin.

## Handed over (owed by another phase)

- **P107:** the s31 hashes above (not messaged — the session could not find P107's peer name); Drag spec is now v2 (C106), so
  C138 is v3; `catalog-parity.test.ts` gained the `when` probe (C127); `conformance.test.ts` lost the Drag's `WITHHELD` entries and
  all three Drag known rows. C120 / C126 need the world's history.
- **P18 (export):** none of s31's fixes checked on the exported app (the Component Stack's answers and address, the Drag's axis,
  NaN start, waited snap, children and CSS). Plus s30's list.
- **Release notes, add (s31):** a Component Stack answers every push, replace and Reset; its address survives `&`, `#`, `%` and a
  malformed escape, a page pushed by its label has a URL, and the browser's Back resets only a stack with Use Routes; writing the
  same Name no longer resets it; a Drag draws every child, takes its CSS Class and Style, reports a locked axis truthfully, and a
  NaN start no longer blanks the page; the catalog tells an AI author a stack page has a Path when Use Routes is on.

## Worktrees

`p109-isl048`, `p109-drag`, `p109-c127`, `p109-s31-land` hold nothing unlanded (their commits are on `cline-dev` as cherry-picks);
`p109-c77`, `p109-c101`, `p109-s30-*`, `p109-isl031-drag`, `p109-s12` are spent. Remove them with `git worktree remove` when
convenient. The probes (`zz-s31-*.test.ts`) live untracked in `p109-isl048` and `p109-drag`; never commit them.

## Recipes

- **Landing over a peer's open edit (s30, exact):** cut a landing worktree from current `cline-dev`, cherry-pick, gate. Then in the
  primary tree: snapshot each dirty landing path (`cp p <scratch>/p.peer`), `git show <old HEAD>:p > p.base`, `git show <new>:p >
  p.mine`, `git merge-file -p p.peer p.base p.mine > p.merged` (resolve an adjacent-hunk conflict by hand: theirs + yours); check the
  multiset of changed lines `diff(p.mine, p.merged)` equals `diff(p.base, p.peer)`. Then in ONE command: `cmp` each peer file
  against its snapshot (abort if it moved), `git update-ref refs/heads/cline-dev <new> <old>`, `git checkout HEAD -- <each clean
  landing path>`, `git reset -q -- <dirty paths>`, copy the merged files in.
- **A control:** back up the file by name, `git show <commit before>:$f > $f`, run the probe, restore in the same command and `cmp`.
- **A fast runtime probe:** a throwaway test calling `runConformance(spec, withViewerNodes(runtimeTarget()), { sequences: 0,
  mutants: false, scenarios })` with `loadScenarios(type)` filtered by name (s30's `zz-s30-probe.test.ts`, never committed). Without
  `known`, a Video scenario needing a pointer fails on C100 — mark such scenarios `"row": "NSP-016 §6 C100"` as the others are.
