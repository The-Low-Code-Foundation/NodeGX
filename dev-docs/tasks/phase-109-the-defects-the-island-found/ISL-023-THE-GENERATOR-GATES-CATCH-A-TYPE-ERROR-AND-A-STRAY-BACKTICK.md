# ISL-023 — The generator's gates catch a type error and a stray backtick

**Status: ✅ closed — session 10, 2026-10-03 (AC1–AC6 met, §8; AC2's revert is read on the gate — the full generators were not re-run). Scoped 2026-10-01 at 27d891bf3.** **Source:** [AUDIT](AUDIT-2026-10-01.md) F32 + F33; P105
README §7 ("Backticks"); P108 s4 (from the audit; the transcript was not re-read here) · **Side:** tooling (the template
generators and their jest gates). Applies to every `scripts/generate-*-template.ts` and the `packages/noodl-mcp/tests/`
modules they import, not only the garden's.

Two kinds of mistake in a generator are found late, and named somewhere else. A type error is never reported by anything
the template's author runs. A backtick, or a dollar-brace, typed into a comment inside one of the generator's template
literals ends the string early, and the error names a file two files away.

## 1. The person sentence

**A person who makes a typo in a template generator is told the file and the line that has it, by the command they
already run, before anything is written.**

## 2. What was measured

All rows **re-read by me at HEAD `27d891bf3`** (read only: no `tsc`, no jest, no generator was run while scoping).

| reading | where |
|---|---|
| `noodl-mcp`'s jest transforms with `['ts-jest', { tsconfig, diagnostics: false }]`, so no type error fails a spec | `packages/noodl-mcp/jest.config.js:10` |
| Every `template:*` script runs `ts-node -T` (transpile only, no typecheck): site-builder, members, landing, pixel, story, rocket, todo, planner, garden. The repo's other `ts-node` scripts (`build:editor`, `dev`, `test:ci`, `catalog:examples`…) run without `-T` | `git show HEAD:package.json` lines 98, 141-148; lines 45-63, 87-88 |
| 🔴 **Two committed files import `ENGINE` (and `helper`) twice.** That is TS2300 "Duplicate identifier" under `tsc`, and it transpiles and runs silently, because the two `import` lines compile to two `require`s of the same module | `packages/noodl-mcp/tests/cg005Olive.test.ts:21` and `:24`; `packages/noodl-mcp/tests/ig004Island.test.ts:15` (in a list) and `:21` |
| How they got there: two lanes each added their own import line on 09-30 (lanes S and P in `cg005Olive.test.ts`, lane B beside an earlier line in `ig004Island.test.ts`). The lines differ, so git merged them without a conflict | `git blame`: `2414f239d` / `6fe9dafc5`; `fe5db4b32` / `112611263` |
| ⚠️ **F32's "never gated" does not hold as written.** `pr.yml` runs `npm run typecheck:mcp` (`tsc -p packages/noodl-mcp --noEmit`) on every push to `cline-dev`, and that program covers `tests/**/*.ts`. So CI would catch the duplicates. But the local remote-tracking ref `origin/cline-dev` is `3c628911c` (2026-09-22), so as far as this checkout knows, none of the push's commits has been pushed, and CI has not seen them. Locally, nothing the author runs typechecks | `.github/workflows/pr.yml:13`, `:45-51`; `packages/noodl-mcp/tsconfig.json` `include`; `git rev-parse origin/cline-dev` |
| The generator *entry points* in `scripts/` are in no typecheck program at all. The root `tsconfig.json` `include` does not list `scripts/`, and no gate runs `tsc -p scripts` | root `tsconfig.json:50-58`; `scripts/tsconfig.json` |
| The garden's generator already has a pre-step: it runs the engine's jest spec and writes nothing if it is red. That spec runs under the same `diagnostics: false` | `scripts/generate-garden-template.ts:22-37` |
| **The backtick rule is lore, written in at least ten places.** P105 README: "Backticks inside any comment of a template-literal script or stylesheet end the generated file early; the error names something else two files away. Use none." IW-002 §5 repeats it for `${`. File headers repeat it | `phase-105-the-coding-garden/README.md:134-135`; `phase-108-the-island-works/IW-002-THE-JOB-MODEL.md:62`; `cg007Look.ts:22-23`; `cg003Scripts.ts:29`; `ig004Island.ts:35`; `iw006Earn.ts:32`; `iw008Crew.ts:27`; `tpl005Components.ts:671-672`; `tpl007Scripts.ts:985`; `tpl007Components.ts:2880` |
| 🔴 **The existing backtick gates are blind to the defect they name.** Each one checks the *produced* string: `script.includes('`')` and `script.includes('${')`. An unescaped backtick in the source never reaches the produced string, because it ends the literal. It is a parse error in the generator, or a different string. An unescaped `${x}` is an *interpolation*, so the produced string holds the value of `x`, not the characters. These gates can only see an *escaped* backtick or dollar-brace. The "known-firing" control beside one of them grades `includes`, not the gate's reach | `cg002Engine.test.ts:1249-1255` (control at `:1254`); `cg003Template.test.ts:425-428`; `cg005Olive.test.ts:828-830` |
| The surface is large. Lines that open a multi-line template literal (`= \`` with no closing backtick on the line): **184 in 21 tracked generator files**, the most in `tpl007Scripts.ts` (48), `cg003Scripts.ts` (44) and `cg002Scripts.ts` (25) | a line scan over the tracked `cg00*`, `ig00*`, `iw00*`, `tpl0*`, `sb0*` non-spec files in `packages/noodl-mcp/tests/` (the peer's untracked `tpl011*` files are not counted) |
| The audit records that the backtick recurred in session 4 although every lane brief warned of it. Not re-read here | AUDIT F33 |

**Noted, not touched.** In this working tree the root `package.json` is a Nightbook app manifest (`"name": "nightbook"`,
179 lines changed against HEAD, every `template:*` script absent). It is another session's uncommitted edit. Every reading
above about the scripts is from `git show HEAD:package.json`. Do not "fix" the working-tree file. Also, in the working tree
`scripts/generate-planner-template.ts` is deleted and `generate-planning-template.ts` and `generate-nightbook-template.ts` are
untracked. That makes ten generators on disk and nine at HEAD; `template:planner` at HEAD names the file that is now gone.

## 3. Where it bites

- **Every lane merge.** Two lanes that each import the same name give a duplicate that jest and the generator both accept.
  Today the duplicates are harmless. The same mechanism also lets through a wrong type or a misspelt field on a shared
  record, and those are not harmless. Nothing local reports it, and CI reports it days later, if the branch is pushed.
- **Every script edit.** 184 multi-line template literals hold game code, CSS and engine text. One backtick in a comment
  costs a hunt, because the error does not name the line that has it. A `${name}` in a comment is worse: if `name` exists in
  the generator's scope, the generated script silently contains its value.
- **The next template.** The rule lives in prose: two task files and at least eight file headers. A new template author reads it
  only after meeting the bug.

## 4. Related work and collisions

- **The diagnostics hole has been known since P55**, and every phase wrote it as a trap, not a fix:
  `phase-55…/HANDOVER-SESSION-4.md:139`, `phase-55…/HANDOVER-SESSION-5.md:106`, `phase-58…/HANDOVER-SESSION-3.md:134`,
  `phase-77…/SBR-012…:161`, `phase-77…/TASKS.md:818`, `phase-79…/NEXT-SESSION-PROMPT.md:871`,
  `phase-83…/HLS-008-WHAT-WAS-BUILT.md:150`, `phase-83…/NEXT-SESSION-PROMPT.md:143`, `phase-85…/NEXT-SESSION-PROMPT.md:59`.
  No task owns changing it.
- **`typecheck:mcp`** was added to `pr.yml` by an earlier phase (its comment says eight errors had built up). This task does
  not replace it. It brings the same check to the place the template author works, and to `scripts/`.
- **ISL-005** (Functions share code) would remove most of the `${ENGINE}` interpolations, and so most of the large literals.
  It makes the backtick rarer, but not impossible: CSS and glue scripts stay literals. The two tasks do not collide.
- **ISL-024** (where a template lives) moves these files. Build this gate so it reads a list of generator files, not a
  hard-coded `packages/noodl-mcp/tests/` glob, or the move will switch it off silently.
- Owner grep: `grep -rn -i "diagnostics: false\|ts-node -T\|backtick\|dollar-brace" dev-docs/tasks` → only lore and traps,
  no owner.

## 5. Design

**🔒 Rulings: none needed** (the board marks this task "—"). Both halves are tooling, with no behaviour a person of the
product sees. Two choices are the builder's, recorded here so they can be overturned:

1. **Keep `diagnostics: false` in jest.** Turning it on would make every spec in `noodl-mcp` fail on any type error in any
   file it imports, and would slow the 2-worker suite. Instead, add a typecheck *step* where the author already is: the
   `template:*` scripts lose `-T`, or (cheaper) run one `tsc --noEmit` over the generator's own files before writing.
   The garden's engine pre-step (`generate-garden-template.ts:22-37`) is where it belongs.
2. **Gate the source, not the output.** The backtick gate reads the generator's `.ts` source with the TypeScript scanner. It
   lists every template literal and every `${…}` substitution in it, and it names the file and line of any substitution not
   on that file's declared list (`ENGINE`, `FOLD_HELPERS`, `ISLAND_ENGINE`, `WORD_HELPER`…). It also reports the
   parser's syntax errors with file and line. The produced-string gates stay, because they still catch an *escaped*
   backtick or dollar-brace reaching a script. Their comments must stop claiming more than that.

Constraints:
- The typecheck must cost seconds, not minutes, because the generators run often and peers share the machine. Measure the
  time of a typecheck over the generator's files alone against `typecheck:mcp`, and record both in §8.
- The gate takes its file list from the ten generators' import graph (or one declared list), so ISL-024's move carries it.
- A failure names the file and line that has the mistake, and the generator writes nothing.
- Fix the two duplicate imports in the same commit that turns the gate on, or the gate's first run is red for a known reason.

## 6. Acceptance criteria

| AC | Clause |
|---|---|
| AC1 | **RED at HEAD, recorded in §8.** `npm run typecheck:mcp` (on a quiet machine, once) reports TS2300 at `cg005Olive.test.ts:21/24` and `ig004Island.test.ts:15/21`. Record every other error it reports, by file and code, without fixing them. Beside it, a known-firing control: the same suite's jest run is green, which proves jest does not see them. |
| AC2 | **The type half.** `npm run template:garden` (and one other generator, e.g. `template:rocket`) with an injected type error in a generator module (an arm: a `number` assigned to a `string` field in `cg003Content.ts`) exits non-zero before writing, naming that file and line. `templates/bot-garden/` mtimes are unchanged (read with `stat` before and after). Reverted, it exits 0. |
| AC3 | **The backtick half.** Three sabotage arms in a scratch copy of a generator module, each red with the arm's own file and line: (a) a bare backtick in a comment inside a script literal; (b) `${n}` in a comment, where `n` exists in scope; (c) a bare backtick inside `GARDEN_CSS`. Arm (b) is the one that fails silently today, so record its produced string at HEAD in §8. |
| AC4 | **The old gates are not counted as the guard.** Run arms (a) and (b) against the existing gates (`cg002Engine.test.ts:1249`, `cg003Template.test.ts:425`, `cg005Olive.test.ts:828`). Record what each reports. The expected result: (a) the suite fails to *run*, and names something else; (b) the suite stays green. Their comments are corrected to say what they catch. |
| AC5 | **Reach.** The gate runs over all ten generators' modules (nine at HEAD, plus the two untracked if they have landed), and it reports the count of files and literals it read. A generator whose import graph it cannot resolve is a red, not a skip. |
| AC6 | **Cost.** The typecheck step's wall time is recorded. If it is over 20 s, the step reads only the generator's own files and the reason is recorded in §8. |

## 7. Traps

- 🔴 **`tsc -p <pkg>` without `--noEmit` emits JavaScript beside the sources.** `typecheck:mcp` passes `--noEmit`, and any
  new script must too.
- 🔴 **A gate with a hole shaped like the defect stays green.** The three existing gates are exactly that. The new gate's
  known-firing arm must be the real defect in source (AC3), not a string that holds a backtick.
- A `${` inside a *non-template* string (`'${'`) is legal and harmless. The scanner must tell the two apart; a regex
  over the file text cannot.
- `typecheck:mcp` is one heavy job. Do not run it beside a peer's `test:ci` or a drive (memory: one heavy job).
- A merge that brings in a lane's duplicate import is still possible after this task. The gate catches it at the next
  generator run, which is the point. It does not prevent it.
- The working-tree root `package.json` is a peer's Nightbook manifest. Read and edit the scripts against the committed file
  only, and only when that peer's edit has landed or been reverted by its owner.

## 8. Record

### Session 10 (2026-10-03) — built and closed

**What was built.** `scripts/template-gate.js` (plain Node over the repo's TypeScript 5.9, no ts-node), run first by
every `template:*` script (`node scripts/template-gate.js <entry> && ts-node -T …`) and on its own as
`npm run template:gate` (every generator `package.json` names). Two halves, both read from the source:

1. **Types.** One program rooted at the generator's entry, with the options ts-node runs it under
   (`scripts/tsconfig.json`), reporting syntax and type errors in the generator's **own** files: its entry and every
   module it imports that is not a package's `src/`. 🔴 **Why not the product source too:** under the root's
   `moduleResolution: node`, zod's types in `noodl-mcp/src` exhausted a 4 GB heap after 210 s (measured: the program
   loads 838 files in 1 s; the checker died in `noodl-mcp/src/tools/*`). Product source has its own package typecheck
   (`typecheck:mcp`, Node16, 9 s); the gate's job is the generator's files.
2. **Template literals.** A small lexer over each literal's **cooked** text says, for every `${…}`, whether it lands
   inside a `//` or block comment of the produced text (a `//` opens one only at a line start or after a space, so
   `https://${host}` does not). After a syntax error it names the literal that closed last before the error: that
   closing backtick is the likely stray one. Escape hatch: `${/* template-gate: comment ok */ x}`. At HEAD across all
   1,592 substitutions in the nine generators, **no substitution sits in a comment**, so the escape is unused.

Also: the two duplicate imports removed (`cg005Olive.test.ts`, `ig004Island.test.ts`); the three old gates' comments
now say what they catch; `refusedDerivedNames` (`dynamicPortRules.ts:351`, **this phase's own** red from ISL-009 s6,
`0951dbbe3`) narrowed; `isl023TemplateGate.test.ts` (7 specs) pins the arms and the reach.

| AC | result |
|---|---|
| AC1 | **RED at HEAD `4e965d3c2`:** `tsc -p packages/noodl-mcp --noEmit` exit 2, **17 errors**: the 8 TS2300 (`cg005Olive.test.ts:21`/`:24` and `ig004Island.test.ts:15`/`:21`, each for `ENGINE` and `helper`), and 9 others: `dynamicPortRules.ts:351` TS18048 (fixed here, ours); `cg001GardenKit.test.ts:331` TS2345; `cg002Engine.test.ts:2824` TS2339; `cg003Template.test.ts:795`, `:1595`, `:2388` TS2352; `ig007Garden3d.test.ts:175` TS2345; `iw007Animals.test.ts:176` TS2339; `p108s8Feedback.test.ts:53` TS2352. **None is in a generator module**: all are in spec files (filed as `P109-S10-TYPECHECKMCP`). **Known-firing control:** the HEAD versions of the two duplicate-carrying specs, run as scratch copies, pass jest **79/79**. After: 8 errors, the same 8 spec-file errors as before, shifted by the new comment lines. |
| AC2 | **Garden:** `sprite: 'house'` → `sprite: 7` in `cg003Content.ts:428`; `npm run template:garden` exit 1, `cg003Content.ts:428:37 TS2322 Type 'number' is not assignable to type 'string'`, "Nothing written"; the 428 files of `templates/bot-garden/` have the same mtimes (hash of `stat` before and after). **Control:** the old command's path, `ts-node -T`, loads the same module and reads `sprite = 7`, exit 0. **Rocket:** `token: 42` in `tpl007Theme.ts:64`; `npm run template:rocket` exit 1, `tpl007Theme.ts:64:5 TS2322`; `templates/rocket-school/` mtimes unchanged. Both restored by `cp` and `cmp`. Reverted: the gate reads green (garden 33 files, 345 literals, 558 substitutions). The full generators were not re-run: the gate is the only thing added in front of them. |
| AC3 | Scratch copies beside the originals. **(a)** a backtick pair in a comment of `START_WORLD_SCRIPT`: red, `isl023ArmA.ts:149:42 the template literal opened at …:141:35 closes here`, then the first three TS1005s. **(b)** `${CAN_MAX}` in a `//` comment of the same script: red, `isl023ArmB.ts:156:119 ${CAN_MAX} sits inside a // comment`. **At HEAD (b) fails silently:** `ts-node -T` exit 0, and the produced script reads *"… (free play has none: 0; a can holds 3)."* **(c)** a backtick pair in a comment of `GARDEN_CSS`: red, `isl023ArmC.ts:219:49 … opened at …:218:27 closes here`. The spec repeats all three on self-contained fixtures, and a control file of legal shapes (a substitution in code, in `'…'` and `"…"`, after `https://`, an escaped `\${` and `` \` ``, a marked one, a `${` in a plain string) stays green. |
| AC4 | Arms in the real modules, one at a time, restored by `cp` + `cmp`, all three clean against HEAD afterwards. **(a):** `cg002Engine` AC9 (arm in `SENSE_SCRIPT`) **green**; `cg005Olive` "the scripts" (arm in `OWL_ROW_SCRIPT`) **green**; `cg003Template` glue gate (arm in `START_WORLD_SCRIPT`) **red, naming something else**: the door refuses `Workshop/Play` with `connection-unknown-instance-port` (Start world has 2 inputs and 1 output). **(b):** all three **green**. ⚠️ **The expectation was wrong in the same direction as the defect:** (a) does not stop the suite from running. ts-jest with `diagnostics: false` transpiles anyway, and `transpileModule` cuts the literal at the stray backtick: the emitted `START_WORLD_SCRIPT` ends at *"the robot doing the job ("*. `ts-node -T` (the generators' own path) **does** report the TS1005s, at the right line. The comments now say what each gate catches (an *escaped* backtick or dollar-brace) and point at the template gate. |
| AC5 | `npm run template:gate`: **9 generators, 69 files, 1,219 template literals, 1,592 substitutions in 2.9 s**, red for one reason: `template:planner: its entry scripts/generate-planner-template.ts does not exist`. That is a peer's uncommitted rename in the working tree (TPL-010's planner → planning, files dated 09-23/09-26); at HEAD the file exists. Not touched. The spec reads every generator whose entry exists (≥ 60 files, ≥ 1,000 literals) and is green; a missing entry and an unresolved import (TS2307) are each red in their own arm. The list is read from `package.json`, not a glob, so ISL-024's move carries it. |
| AC6 | **Cost:** 2.5–3.8 s per generator, 2.9 s for all nine in one program (`typecheck:mcp`: 8–9 s). Under 20 s. The narrowing to own files is for the heap (above), not the clock. |

**Not done here, on purpose.** `diagnostics` stays `false` in jest (§5 choice 1). The eight spec-file type errors are
filed, not fixed: they are in specs of P105–P108, and none reaches a generator.
