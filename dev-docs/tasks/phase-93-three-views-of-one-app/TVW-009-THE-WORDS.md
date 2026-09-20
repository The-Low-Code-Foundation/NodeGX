# TVW-009 — The words

Proposal §1.1 and §4.6. The teaching layer is three sentences and a table, placed where the question
is asked. Not a tour.

## 1. The person sentence

**Someone who has never seen NodeGX reads, in the first minute and without leaving the editor, that
Components are the parts they have, Layers is what the page in the preview is made of, the canvas is
how one part is made, and the Workbench shows one part on its own — in the row of the table that
matches what they already know.**

## 2. The spec

### 2.1 Five words, everywhere

| word | means | replaces, and where the survivors are |
|---|---|---|
| **Component** | a definition; what the canvas edits | "component" when it meant an instance: the canvas node title (TVW-007 adds the eyebrow), `Create Visual Component` → `New component`, `Create Logic Component` → `New logic component`, `Create Page Component` → `New page` |
| **Instance** | a placed component | "component node" in tooltips, docs, the picker's `Project components` group description |
| **Page** | a component the Router shows, with a route | "page component" |
| **Layers** | the tree of what the page in the preview is made of | (new) |
| **Workbench** | one component running alone | "bench", "isolated component", "sandbox", "in isolation" — TVW-001 swept the surfaces; this task sweeps docs, tooltips, release notes template, the MCP's `guidance` field where it names the preview |

*Home* stays. *Sheet* is gone (TVW-001). *Folder* is a folder.

A ratchet, on the model of the hex ratchet: `scripts/vocabulary-ratchet.js` greps user-visible
strings in `packages/noodl-editor/src` and `packages/noodl-core-ui/src` for the retired words and
holds the count at 0 (test ids, comments and `data-*` excluded by an allowlist the script prints).

### 2.2 Three sentences, in their places

1. Layers, canvas on a logic component (TVW-004's note): *"Format price is logic — it has no screen.
   Watch it run on the Workbench."*
2. Components, first run of a project with ≤ 1 component, above the tree, dismissable once per
   machine: *"Components are the parts you have. Layers shows which of them are on the screen you are
   editing. The canvas is how one part is made."*
3. The Workbench caption (TVW-001's sweep): *"Workbench — Hero on its own, not the app. Sample
   values."*

### 2.3 The rail tooltip

`Project` on the rail: two lines, *"Layers — what the page in the preview is made of, through every
instance. Components — every component in the project, placed or not."*

### 2.4 The table

Proposal §1.1, verbatim, as:
- a docs page `docs/editor/three-views.md` (or wherever the editor docs live — find first), linked from
  the `?` on the trail and from the Components first-run sentence's `Learn more`;
- a step in P73's first tutorial, after the step that opens a project and before the one that adds a
  node — P73 owns the tutorial's shape; this task supplies the step's text and the table.

### 2.5 The MCP

`instructions.ts` (the briefing) says "visual tree down a left column". Add one sentence: *"The editor
draws a structure lane around the visual stack wherever it is; the column is a default, not a
rule."* Nothing else in the MCP changes here; P85's loop owns the doctrine.

## 3. Scope

In: 2.1–2.5, both themes where a surface is involved, the ratchet in CI.

Out: any new onboarding UI, tours, coach marks. Renaming node types. The picker's content beyond the
group description.

## 4. Acceptance criteria

1. **(person)** A fresh install, a new project from the blank template. The Components panel shows
   sentence 2 above one row (`App`). The rail tooltip reads as specified. The `?` opens the table.
   Press the table's *React* row's `Storybook` cell — nothing happens, it is a table, and that is
   fine; the row is the lesson.
2. `scripts/vocabulary-ratchet.js` reports `0` for each retired word on user-visible strings, and
   the allowlist it prints has no entry that is a user-visible string (a reviewer reads the list).
3. Every `New …` menu item's label matches 2.1 (assert on `createMenu.ts`'s built items).
4. The MCP briefing contains the lane sentence (a spec on `instructions.ts`'s output).
5. P73's tutorial has the step and the table (P73's own drive covers it; this task's AC is that the
   step file exists and renders).
6. `test:ci` at the floor; the ratchet green.

## 5. Landmines

- The vocabulary lives in five packages and the community shelf's copy. Grep before claiming a
  sweep is complete, and grep with `-a` ([[ugrep-silently-skips-a-source-file-as-binary]]).
- FIX-019's spec pinned the old caption; TVW-001 re-pinned it. Do not pin it a third time.
- An example description is published ([[an-example-description-is-published]]); a corpus example
  that says "sandbox" is a public string.

---

## 6. Slice 1 — built 2026-09-20 (s28). The vocabulary is enforced, and three surfaces say it

**AC2, AC3 and AC4 closed.** AC1, AC5 and AC6 are slice 2 — see §7.

### 6.1 What the debt actually was, and why the gate is an AST walk

§2.1 asked for a ratchet "on the model of the hex ratchet". The model it borrows is the **printed
exemption list**, not the moving baseline — because the debt turned out to be **twenty strings**,
swept in the same change, with no tail to burn down. `scripts/vocabulary-ratchet.js` is a **gate at
0**.

🔴 **The whole difficulty is the phrase "user-visible", and it is not a grep.**

| method | `sandbox` over the two roots |
|---|---|
| `grep -rac sandbox` | **1192** |
| string literals + JSX text only (AST) | 19 |
| …after context classification | **0 user-visible** |

Nearly every one of the 1192 is Electron's `sandbox:` BrowserWindow option, an import of
`@noodl/runtime/src/sandbox/types`, or `data-test="sandbox-auth-toggle"`. A regex gate would have
been red on day one against strings nobody can fix, and would have been switched off — the failure
`icon-font-gate.js` and the hex ratchet's own SCSS line-comment strip were both built to avoid.

So the gate walks the **TypeScript AST**. The hex ratchet's header says CSS has no equivalent parser
readily available; TypeScript ships one, and it is the whole difference between 1192 and 20.
**Comments are not AST nodes**, so this gate cannot redden on prose explaining why a word moved.

### 6.2 🔴 `bench` means two things, and sweeping both would have renamed a different product

The community surface has a **Bench** — `CommunityBenchView`, `communityTabs.ts`'s
`{ id: 'bench', label: 'Bench' }`, `/api/v1/bench/threads`, FB-002 — where questions asked from the
editor land. It has nothing to do with running a component on its own. Caught **before** the sweep,
by reading the surrounding declaration rather than the matched word.
`COMMUNITY_BENCH_PATHS` is that distinction written down: narrow, by path, printed with its reason.
The spec proves it is about the *path* by counting the **identical string** outside those files.

⚠️ Identifiers keep the old spelling throughout — `componentBench.ts`, `bench-harness`,
`benchOpeningScenario`. §2.1 retires *words people read*, and TVW-008 is live in the same files.

### 6.3 The sweep — 20 strings, and two of them needed rewriting rather than substituting

"A page component is not a page until a Page Router lists it" becomes nonsense under substitution
("A page is not a page until…"); it is now *"A page is not reachable until a Page Router lists it."*
Sites: four AI prompt files, `pageMap`, `RouterNavigateAdapter` (`Choose page component` →
`Choose page`), `authoringVocabulary`, `diagnosticExamples`, `navigation`, `oversizedPage`,
`InterfaceRailsOverlay` (the Blockly bench note), `ComponentTemplates`.

### 6.4 AC3 — 🔴 the label was an identity, and the warning was already in the file

`ComponentTemplates.cloudFunction`'s own comment said picking a template by `label` "would break
the day someone rewords a menu entry". **TVW-009 is that day**, and `createMenu.ts:158` was doing
exactly that: `templates.some((t) => t.label === CLOUD_TEMPLATE_LABEL)`.

Renaming the labels would have made that comparison quietly false in the cloud section — where
`getTemplates` already returns the cloud template — and the menu would have **minted a second
`New cloud function` row**. Nothing else would have failed. The spec's count is the only witness.

Fixed by giving `ComponentTemplate` a **`templateId`**, and moving three identities off the label:

| identity | was | now |
|---|---|---|
| the cloud stand-in check | `label === 'Cloud Function Component'` | object identity with `ComponentTemplates.instance.cloudFunction` |
| the row's test id | derived from the label text | `create-${templateId}` |
| the `Component Created` telemetry dimension | `template.label` | `template.templateId` |

Labels: `New page`, `New component`, `New logic component`, `New cloud function`, `New folder`, and
the row is now the label alone — the menu's title already says `New in <destination>`, so
"Create Visual Component" under it read as two promises about one gesture.
⚠️ §2.1's table names three; **cloud function and folder are extended by the same rule**, because a
menu with four `New …` rows and one `Create …` row is not a vocabulary.

### 6.5 AC4 — 🔴 the lane sentence cost 23 tokens and the surface had 6 free

`toolDisclosure.test.ts` caps the resident MCP surface at `SURFACE_TOKEN_BUDGET` = 8,280, and **its
own header says there must not be a third renegotiation**. Measured on both arms in the same minute:
**8,274 without the sentence, 8,297 with it** — 17 over.

✅ **Funded, not bumped.** The briefing's opening identifier clause was a near-verbatim duplicate of
`get_project_info`'s `note` (`tools/read.ts:166`) — and the sentence immediately before it already
told the agent to call that tool **first**. Filed as **P77 D48**, ~39 tokens, owner NONE since
2026-09-02. Deleted from the briefing, which is billed once per session; kept in the result, which
is billed nothing against this gate.

**8,255 / 25 free** with the lane sentence in — 19 better than it was found.
🔴 A spec asserts the **survivor**: `get_project_info`'s note still carries the fact, and the
briefing still points at it. Deleting a fact because something else carries it, and never checking
that something else, is how a fact leaves the product with a comment claiming it did not.

### 6.6 Mutants — 3 killed, and 🔴 one SURVIVED and was the finding

| mutant | result |
|---|---|
| `exemptionFor` excuses everything | **killed** — 10 arms |
| `communityTabs.ts` dropped from the declared paths | **killed** — 3 arms |
| the `\b` anchor dropped from the `bench` pattern | **killed** — 3 arms |
| the `(?<!work)` lookbehind removed | 🔴 **SURVIVED** |

The lookbehind was **decoration**: `\bbench\b` already cannot match inside "Workbench", because
there is no word boundary between `k` and `b`. The source comment claiming it load-bearing was the
only thing making it look so. **Deleted, and the comment now names `\b`.** An arm whose stated
mechanism is absent still passes — it was grading the right answer for the wrong reason.

### 6.7 Gates

- `npm run vocabulary` — **all six words 0**, exit 0; 132 exemptions printed under 9 named rules.
- New `tests-unit/tvw-009/vocabularyRatchet.test.ts` — **19 specs**, most on synthetic sources.
- `packages/noodl-mcp/tests/tvw009Vocabulary.test.ts` — **10 specs**.
- `tests/components/createMenu.spec.ts` — **+4 jasmine arms** (AC3), and one pre-existing arm fixed
  where it looked a template up by its old label.
- `typecheck:editor` 0 · `typecheck:editor-tests` 0 · `typecheck:mcp` 0.
- **`test:main` 524 suites / 8394 specs, exit 0** — was 523 / 8375, so the delta is exactly the
  +1 suite and +19 specs this session adds and nothing stopped loading.
- **noodl-mcp: 7 suites / 9 tests failing — the pre-existing floor**, measured on HEAD with this
  session's MCP edits reverted and restored. `toolDisclosure` was an 8th and it **was** mine; §6.5
  is how it went green.
- ✅ **`test:ci` RUN AND AT THE FLOOR** — **3019 specs, 8 failures, exactly the eight by name**
  (3 SUB-006, 3 SUB-011, 2 NDA-017), seed **61157** — a sixth distinct seed confirming the same set.
  3015 → 3019 is exactly the 4 jasmine arms AC3 adds, and all four ran green. Fresh readout at
  `packages/noodl-editor/tests/test-results.json`.
- CI: `npm run vocabulary` added to `.github/workflows/pr.yml` beside the other ratchets.

⚠️ `typecheck:core-ui` is red with **45 unresolved-module errors** (`@noodl-viewer-cloud/execution-history`,
`@noodl-versioning`, `@noodl-store/*`, `@nodegx/export/ledger`) — **none naming a file this session
touched**. It has no `pretypecheck` hook, so it depends on `build:types` output that is not built in
this shared checkout. Pre-existing; not this change.

## 7. Slice 2 — what is left

1. **AC1 (person)** — §2.2's three sentences, §2.3's rail tooltip and §2.4's `?` table. This is the
   teaching layer itself and the only part a **drive** can grade. Needs a fresh-install fixture and
   the blank template.
2. **AC5** — P73's tutorial step. P73 owns the tutorial's shape; this task supplies the step's text
   and the table. Check P73's board before writing a step file.
3. **AC6** — ⚠️ **both halves are already true at s28** (`test:ci` at the floor, seed 61157; the
   ratchet green) but it is deliberately **NOT counted closed**: it is a whole-task gate, and slice 2
   adds a drive, a docs page and a tutorial step that can redden it. Re-measure, do not inherit.
4. §2.4's docs page `docs/editor/three-views.md` — **find where the editor docs live first**; §2.4
   says "or wherever the editor docs live", and that was not resolved this session.
5. ⚠️ §2.1 also names **docs, the release-notes template and the community shelf's copy**. The
   ratchet covers `noodl-editor/src` and `noodl-core-ui/src` only, because that is the scope §2.1
   gives it — those other surfaces are swept by hand and nothing holds them at 0.
