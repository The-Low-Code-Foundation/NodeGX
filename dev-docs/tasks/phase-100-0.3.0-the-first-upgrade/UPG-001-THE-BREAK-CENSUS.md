# UPG-001 — The break census: what a 0.2.4 project loses in 0.3.0

**Opened 2026-09-22** with the phase. **Status: 🟡 STARTED — 4 rows measured, 5 classes named and
unmeasured (§4).** Measured against `cline-dev` HEAD `7043fb6e6`, `v0.2.4..HEAD` = **427 commits**.

## 1. The person sentence

> **Someone upgrading from 0.2.4 can read one page and know, before they install, every way their
> existing project will behave differently — and each one either migrates itself or says so out
> loud.**

## 2. 🔴 Why this is the first task, and why it is a census rather than a fix

Three other things read from this table and none of them can be written first:

- **the version number** — §3 of the [board](README.md) claims 0.3.0 on the strength of there being
  at least one real break. One row (§3.1) is enough to carry that, but the notes need all of them.
- **the release notes** (UPG-006) — a break nobody wrote down becomes a support mystery. The
  compatibility policy says exactly that, and calls it the price of the speed it buys.
- **the migrations** (UPG-003 and whatever else R2 rules in) — you cannot write a migration for a
  break you have not named.

**The method, and it is not "read the commit subjects."** 427 subjects will produce a plausible
list that is wrong in both directions: subjects say `fix` for things that changed behaviour, and
say nothing for the change buried in a `feat`'s third bullet. Each row below is measured from the
artefact — the diff, the rule, the model file — and says what was read.
[[measure-the-artefact-before-believing-the-task-file]].

## 3. The rows measured so far

| # | class | verdict | decision |
|---|---|---|---|
| 3.1 | Text styles are no longer editable | 🔴 **BREAK — real, ruled on the numbers** | the *conversion* is open: UPG-003, **R3** |
| 3.2 | Built-in port renames | ✅ **CLEAN this release** | none. Do not re-measure |
| 3.3 | New validator rule on existing work | 🟡 **NOISE, not a break** | one line in the notes |
| 3.4 | Shipped looks becoming project-owned Looks | 🟡 **NOT on the load path** | needs the drive in §4.1 before it is closed |

### 3.1 🔴 Text styles are no longer editable — BREAK

**Read from:** `aa0cd5b13` (P99 / HLT-007 a) and its own measurement, quoted in full on the
[board §4.1](README.md).

**17 of 19 current-format projects on this machine carry text styles.** 39 of 154 legacy-format
ones do, including **16 shipped library prefabs**. After 0.3.0 they still load, still apply at
runtime, and a Text node can still pick one — **and the editor will not list, rename or delete
them.** Converting them to Looks was considered and not built.

🔴 **The removal is ruled ON THESE NUMBERS and is not reopened.** `HLT-007…md:17-24` records all
three askings, and the third *"gave the 17-of-19 figure and named his two projects"*. Richard:
*"Remove it anyway. I don't feel like it's going to cause a massive backlash. **You could argue that
we could convert the existing text styles into Looks in the new styles system, as a compromise.**
Most of them will just be using the default text styles that come baked into the old editor."*

**So do not carry this row to Richard as "the upgrade was never considered" — it was.** The open
question is the compromise **he** raised and P99 left `📋 Not built`: convert them to Looks, or ship
a release note. **R3.** [[ask-richard-a-ruling-in-plain-words]] — an answer carried without its
question drifts into a prohibition, and this row was drafted that way once already.

### 3.2 ✅ Built-in port renames — CLEAN, and this row exists so nobody measures it twice

Renaming a port on a shipped built-in node breaks every project that wired it: no alias, no
migration, no console line, no Problems entry. The signal simply stops firing. This repo has done it
**seven times** and shipped nothing for projects already on disk
([[a-rename-of-a-built-in-port-ships-no-migration]]; P86 D1, still unowned).

**Measured for `v0.2.4..HEAD`:**

```
git diff v0.2.4..HEAD --name-only -- packages/noodl-runtime/src \
  packages/noodl-viewer-react/src/nodes packages/noodl-viewer-cloud/src/nodes   → 57 files
git diff v0.2.4..HEAD -U0 -- <same three trees> | grep -E "^-\s*(name|displayName):"
  → 2 hits, both "-  name: string;" — a TypeScript interface field, not a port
```

**No port was renamed into 0.3.0.** The P86 debt is older than this release and stays out of scope
([board §7](README.md#7-out-of-scope)).

⚠️ **The grep is narrower than the class.** It catches a rename done as an edit to a `name:` line in
those three trees. It would not catch a port deleted and re-added elsewhere in the same diff, a port
removed outright, or a rename in a tree outside the three. §4.2 owns closing that gap; this row
claims only what the two commands measured. [[a-reading-that-fits-is-not-one-that-excludes]]

### 3.3 🟡 A new validator rule fires on existing work — NOISE, not a break

`f37698014` (P99 / HLT-014) adds `dialog-without-name`
([`rules/dialogWithoutName.ts:137`](../../../packages/noodl-editor/src/editor/src/validation/rules/dialogWithoutName.ts#L137)).
A project that validated clean on 0.2.4 can show a new entry on 0.3.0 without the author changing
anything — which reads like a regression from the author's chair.

**`severity: 'warning'`** — read from the rule, not from the commit message. It does not fail a
build, a deploy or an export. P99 measured **0 hits across all ten templates**, so our own corpus is
silent and only a hand-built project can see it.

**Decision: one line in the release notes** under what's new rather than under what broke. No
migration. 🔴 **But it is a class, not a row** — any rule added in this window behaves this way, and
§4.3 owes the list.

### 3.4 🟡 Shipped looks become project-owned Looks — not on the load path

`0ef525aeb` (P94 / STY-002) turns phase 9's `ElementConfig` variants — stamped into a node's
parameters and forgotten — into ordinary Looks the project owns.

**Measured:** `models/Looks/looks.ts` has exactly **two** non-test callers —
`StyleTokensModel/StyleVocabulary.ts:53` and
`propertyeditor/components/VariantStates/PickVariantPopup.tsx:26` (the third hit is
`tests-unit/sty-002/looks.test.ts`). Both are **authoring-time**: the
vocabulary a picker reads, and the picker itself. **Nothing calls it from a project load path**, so
opening a 0.2.4 project does not rewrite its parameters, and a node still wearing `_variant` /
`_size` markers keeps them.

That is the answer to "does it convert on load" — **no** — and it is the good answer. What it does
not answer is whether such a node still *renders* the same, because the same commit also changed
what a shipped look contains (the config's `defaults` **plus** the variant's own properties) and
translated the state names (`active`→`pressed`, `focus`→`focused`, `placeholder` dropped as
unlandable). **A grep cannot answer a rendering question.** §4.1.

## 4. The remainder — named, unmeasured, in priority order

🔴 **Said in the words `⬜ never measured`, so no later session mistakes this list for a finding.**

1. **⬜ never measured — §3.4's drive.** Open a copy of a real 0.2.4-era project carrying
   `_variant` parameters in a 0.3.0 build and compare what renders, both themes. This is the one
   remaining row that could turn a 🟡 into a 🔴. Use a **copy** ([[open-a-copy-of-a-real-project-in-the-editor]])
   and note that opening dirties every component. **Needs the editor — a peer's `dev` stack was live
   when this was written; check first.**
2. **⬜ never measured — the port class, properly.** §3.2's grep is narrower than the class: ports
   deleted rather than renamed, and the trees outside the three.
3. **⬜ never measured — the other validator rules added in this window.** §3.3 is one of a class.
   Enumerate the `DiagnosticCode` entries added since `v0.2.4` and read each severity.
4. **⬜ never measured — the backend storage plane** (P97 BRG-004/005: the Postgres adapter, the
   migration, `NODEGX_STORAGE_URL`). The compatibility policy's own table restates WFA-003 as
   applying to **deployed backends holding live data** — which is a different and stricter
   population than "projects on disk", and the only one in this census that can lose somebody's
   rows rather than their styling.
5. **⬜ never measured — the exporter** (P94 STY-004 "stops dropping every style that is a link",
   and the stale golden it uncovered; P83's export chain). An export that now emits different output
   for the same project is a break for anyone diffing or deploying it.

## 5. Acceptance criteria

1. Every class in §4 is measured and lands in §3 with a verdict and a named decision, or is struck
   with the reading that struck it. **No class is left carrying `⬜ never measured`.**
2. Each row says **what was read** — a command, a file and line, or a drive with shots. A row whose
   evidence is a commit subject does not count. 🔴 A row asserting an **absence** carries the
   known-firing control that proves the instrument was armed
   ([[assert-an-absence-with-a-known-firing-signal-beside-it]]).
3. **Person-verifiable:** Richard reads §3 alone and can say, for each row, whether it needs a
   migration, a note, or nothing — without opening the diff.
4. The table is the single source UPG-003 and UPG-006 read from. Neither restates a break in its own
   words; both link to the row.
5. Demonstrated honest by its own method: the census names at least one thing the 427 commit
   subjects do **not** say, and at least one thing they say that turned out not to be a break.
   (**§3.3 already satisfies the second half** — `feat … fails the project validator` reads like a
   break and is a warning.)

## 6. Out of scope

- **Fixing anything.** A row's fix belongs to the task the row creates. This file measures.
- **The P86 port-rename debt** (§3.2) — older than this release.
- **Pre-NodeGX / Noodl 2.x imports.** The compatibility policy waives them and this phase does not
  un-waive them. The population here is **0.2.x NodeGX projects**, which the policy explicitly does
  **not** waive.
