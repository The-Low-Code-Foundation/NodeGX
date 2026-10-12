# OWN-010 — Every bug teaches the kit

**Opened 2026-10-02**, from Richard: *"Can we make sure that bugs that we find here in the NodeGX repo, like phase 109,
will contribute to the continuous improvement of whatever npm thing we create from phase 107 and 112?"*
**Depends on** the ledger (`dev-docs/bugs/`, already built), P107 NSP-010 (a behaviour change is a version), and R2
(publishing). The first part is built (§6); the rest waits for the packages to exist.
**Status: 🟡 the ledger half built 2026-10-02; the package half not started.**
**Model:** **Opus.** Tagging the ledger, the changelog and the release gate are well specified. At the start of a session on this task, and again if the work changes kind, say which model you are running on and whether this line says Richard should switch (README §0.2).

## 1. The person sentence

> **Every bug any phase finds in a node, the project format or the editor kit becomes a test that ships with the
> package, and the next version's changelog says which bug it learned from. Someone who installs the package gets
> everything this repo has been bitten by, without reading this repo.**

## 2. Why

The templates (P78, P108, P109) are where NodeGX meets real apps, and they find most of the defects: the ledger held
159 bugs on 2026-10-02, 84 of them in the runtime, from P107 (76), P109 (24), P78 (21) and P108 (17). Once the specs
and the kit are on npm, a bug fixed here and not carried into the package is a bug every outside user still has, and a
bug the package already pinned is one this repo can stop rediscovering.

The second direction was measured the same day: **`P109-S5-STRINGFORMAT` was filed against String Format from a code
comment, and the spec already said the opposite**, in a scenario committed on 2026-09-30. The spec and the runtime both
fill a repeated placeholder every time; the comment and the port description were the defect (`P107-D2`). The wrong bug
had become a reason to write a Function. So the loop runs both ways: bugs teach the packages, and the packages check
the bugs.

## 3. What to build

1. **The ledger half (built, §6).** Two header lines, `kit:` and `regression:`; `bugs.js check` fails a fixed kit bug
   without a regression or with one that does not exist; `--kit` and `kits [--suggest]`; and the rule *run the spec
   before filing a bug about a node* in `dev-docs/bugs/README.md`.
2. **Tag the backlog.** `node scripts/bugs.js kits --suggest` proposed `kit: node-spec` for 76 untagged bugs on
   2026-10-02. Read each one, tag it, and for every one that is already `fixed`, find or write its regression. A
   suggestion is a match on the `area` text, not a verdict: a bug naming three nodes gets one of them as its hint.
3. **The changelog is made from the ledger and the specs.** For each package release: every `fixed` bug with that
   `kit:` since the last release, and every spec `changes` entry (NSP-010) since the last release, which names its bug.
   Generated, never hand-written. Where it is published follows memory's *changelogs live on nodegx.io*.
4. **The release gate.** A package does not publish while one of its `kit:` bugs is `blocker` and open; every other
   open kit bug is listed in the release notes as a known issue. R6 rules the first sentence.
5. **The way in from outside.** Once the packages are public, people outside will hit bugs. A GitHub issue about a
   package becomes a ledger file (`found: github #N`), with the same `kit:`, and the same rule: play it through the
   spec first. Memory: *reply on GitHub issues without asking*.
6. **A bug becomes a stranger's sentence.** When OWN-008's strangers hit a kit bug, it goes in the ledger with
   `kit: editor-suite` (or the package it is about) and the brief gains the sentence: the same loop for the method.

## 4. Acceptance criteria

1. (Built.) `bugs.js check` rejects an unknown `kit`, a fixed kit bug with no `regression`, and a `regression` path that
   does not exist, and accepts a correct one: shown on a scratch copy of the ledger (§6).
2. Every `fixed` bug tagged `node-spec` names a regression scenario that exists, and that scenario fails on the commit
   before the fix (read with `git show <sha>:<path>`, never checked out).
3. The first release of each package carries a changelog generated from the ledger and the spec `changes` entries, and
   no entry was typed by hand.
4. A planted open `blocker` with a package's `kit:` stops that package's release (R6).

## 5. Watch for

- A regression that passes on the code before the fix tests nothing. AC2 is there for that.
- Memory: *a none-owned blocker is the one most likely already fixed*. Tagging the backlog means re-measuring a bug
  before writing its regression, not trusting its file.
- Bugs come from peers all the time (the count went from 155 to 159 while this task was written). `kits` reads the
  files every time; never record a count as a constant.

## 6. Built

**2026-10-02 (the ledger half).** `scripts/bugs.js`: `KITS`, `kit:` and `regression:` checked in `check`, `--kit` on the
listing, `kits [--suggest]` (suggestions from the node-spec scenarios' file names and P107's `census.json` display
names, longest name first). `dev-docs/bugs/README.md`: "Bugs and the packages".
- Real ledger: `check` → *159 bug(s), every header valid*, exit 0 (no bug carries `kit:` yet, so nothing old can fail).
  `kits --suggest` → 76 suggestions, all `node-spec`.
- Control, on a scratch copy holding four planted bugs: `kit: bogus` → rejected; `fixed` + `kit` with no regression →
  rejected; a regression path that does not exist → rejected; a fixed kit bug whose regression is
  `scenarios/Counter.json "…"` → accepted. Exit 1, three problems, exactly the three planted.
- The String Format case: measured on the spec and on `stringformat.ts`'s loop copied verbatim, the repeated
  placeholder fills every time. The P109 session marked its bug `duplicate`, `of: P107-D2` (`bcdbaaad4`).

**2026-10-11 (s9, P112 OWN-011).** 🔴 The ledger half above was built on 2026-10-02 and **never committed**: nine days in
the working tree, while committed bug files already carried `kit:` tags nothing in HEAD read. Committed in `efcb43788`
with two additions: `mcp` in `KITS` (a P107 bug had reached for `kit: noodl-mcp`; before, `--kit mcp` listed 0 because
no bug could carry it), and `node scripts/bugs.js gate <kit>` — R6's release gate: exit 1 while the package has an
open, needs-ruling or scheduled blocker, the lesser ones printed as known issues, exit 1 on a kit name that is not one.
Measured live: with P112-S9-NPXDEPS open, `gate mcp` exited 1. `bugs.js check` reports 16 problems in other phases'
files (none P112's); nothing runs it as a gate yet.
