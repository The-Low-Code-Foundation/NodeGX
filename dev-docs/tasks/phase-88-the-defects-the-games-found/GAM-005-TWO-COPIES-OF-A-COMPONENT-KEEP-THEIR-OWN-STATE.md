# GAM-005 — Two copies of a component keep their own state, or the author is told they will not

**Status: 🟢 built 2026-09-14 (session 7, uncommitted).** AC1–AC4 graded, AC6 decided by reading. **Owed:** AC5 (browser drive), AC7 (repeater `id`), the site-builder embedded marks, and an MCP bundle rebuild. **Source:** [P78 D57](../phase-78-the-templates/DEFECTS-THE-TEMPLATES-FOUND.md) · found by TPL-007 Rocket School, 2026-09-12 · **Side:** product (authoring doctrine, validation)

A page places two feedback banners. One answer opens both, because the banner kept "open" in a `Variable`, and a
`Variable` is one value for the whole app however many times its component is placed. Nothing the author or the agent reads says so.

## 1. The person sentence

**Someone builds a component that remembers something and places it twice. Each copy remembers its own, or, before
the page ever runs, the editor names the Variable that the copies will share.**

## 2. What was measured

Source readings were re-read at HEAD `eb12ebe99` (2026-09-14). Template readings are from the working tree over that commit, where `templates/` is untracked.

| reading | where |
|---|---|
| Seen in the browser: after one answer, both banners were open ("Fast and correct!" and "The computer got there first"), the EN/FR pills doubled, and four choice rows shared one pick (`choiceRowPick`). *As recorded 2026-09-12, not re-driven* | register D57 |
| The runtime is doing what it documents. Variable2's `Name` is *"Which app-wide variable this node reads and writes"*, and `Changed` fires *"from anywhere in the app"*. *Re-read at HEAD* | `packages/noodl-runtime/src/nodes/std-library/data/variablenode2.ts:172`, `:109` |
| The node reference says it plainly too: *"every node bound to the same name sees the same value"*. *Re-read at HEAD* | `docs-site/docs/nodes/data/variable2.md:4`, `:10`, `:66`; `set-variable.md:76` |
| 🔴 **The authoring doctrine an agent actually receives is silent.** The interface playbook `INTERFACE_DOCTRINE_MD` has 0 case-insensitive hits for "variable". It reaches `get_project_info` as `interfaceDoctrine`. *Re-read at HEAD* | `packages/noodl-editor/src/editor/src/models/AiAssistant/authoring/prompts/interfaces.ts`; `packages/noodl-mcp/src/tools/read.ts:176` |
| ⚠️ **The decomposition doctrine points the other way.** *"Shared app state goes through Variables and Objects, not through prop drilling."* It gives no converse for a component's own state. Served as `authoringDoctrine`. *Re-read at HEAD* | `…/authoring/prompts/decomposition.ts:165-166`; `read.ts:168` |
| The MCP server instructions have 0 hits for "variable". *Re-read at HEAD* | `packages/noodl-mcp/src/instructions.ts` |
| The playbook's §4, *"The state machine is the component's brain"*, is where the rule belongs. It teaches States idioms and never names the alternative it replaces. *Re-read at HEAD* | `interfaces.ts:97-108` |
| A per-instance store already exists and is documented as such: Component Object, *"every instance has a separate object"*. *Re-read at HEAD* | `docs-site/docs/nodes/component-utilities/net-noodl-component-object.md:10`, `:65` |
| A validator precedent that counts placements per component type already exists. *Re-read at HEAD* | `packages/noodl-editor/src/editor/src/validation/componentInterface.ts:279-292` |
| **Census: components that hold a Variable and are placed more than once.** Found in 4 templates: `landing-pages` `Site/FilterPill` ×4 (`workFilter`), `pixel-game` `Game/Move` ×4 (`playerX`, `playerY`), `rocket-school` `Profiles/New player form` ×2 (`newLang`, `newLevel`, `newLook`, `newSeed`), `story-engine` `Story/Source` ×2 (`storyPasted`). Found in 0 prefabs, where the same census ran over the `project.json` shape; that shape is different and has no known-firing hit. *Measured 2026-09-14, working tree* | `templates/*/components/**/nodes.json`, `library/prefabs/*/project/project.json` |
| The repeater note: *"without an `id` every re-run of the source is a fresh set of rows and the old ones stay"*. *As recorded 2026-09-12, not re-read in the repeater.* ⚠️ The Collection diff keys on object identity (F50), which predicts that old rows are **removed** and re-added, not kept. The two readings disagree | register D57; `packages/noodl-runtime/src/collection.ts:504-546` |

## 3. Where it bites a person

Anyone who reaches for a Variable for a component's own state: an open/closed flag, a selected tab, a picked choice, a
draft. The first placement works. The second placement breaks both copies, often on another page, so the bug shows
up far from the cause. With one instance on the page nothing is visibly wrong, and neither the drive clauses nor the
console see it. Rocket School's banner was caught from a screenshot.

## 4. Related work and collisions

- **No owner found.** Greps over `dev-docs/tasks`: `global by name`, `app-wide`, `Variable.*global`, `global.*Variable`,
  `variable.*local state`. The hits are records, not owners:
  - [P85 STUDIED-APPS](../phase-85-the-component-is-the-backbone/STUDIED-APPS.md) row 21 quotes D57.
  - [RKT-006 §3](../phase-87-the-first-play-test/RKT-006-RESTART-FROM-INSIDE-THE-RACE.md) accepts `raceProgressA/B` as harmless with one race.
  - [TPL-006](../phase-78-the-templates/TPL-006-THE-STORY-ENGINE.md) uses three app-wide Variables on purpose.
  - [SBR-004](../phase-77-the-site-builder-rescue/SBR-004-THE-PUBLIC-SITE-WEARS-THE-THEME.md) relies on app-wide Variables on purpose.
  - [CWF-008](../phase-42-first-hour/CWF-008-THE-CLOUD-VOCABULARY.md) is the cloud cross-request leak, which is a different defect.
- **The doctrine's owner is [CMP-001](../phase-85-the-component-is-the-backbone/CMP-001-THE-COMPONENT-INTERFACE-PLAYBOOK.md).**
  Its gate `packages/noodl-mcp/tests/cmp001InterfaceDoctrine.test.ts` binds every claim in the playbook to the shelf, and bounds
  its length (`:155`). A new sentence has to pass that gate.
- [P87 README](../phase-87-the-first-play-test/README.md) `:143` already carries the rule as a template trap. That is exactly the
  place a person building a new app never reads.

## 5. Design

- **(a) Doctrine, in both texts.** Playbook §4: *a Variable is one value for the whole app; a component's own state is a
  States node, a Component Object, or a Counter/Switch.* The decomposition line gains the converse in the same sentence.
- **(b) A validator code** (working name `variable-in-repeated-component`): a `Variable2`/`Set Variable` inside a
  component that is placed more than once, naming the variable and the placements. Put it beside `componentInterface.ts`, which
  already counts placements, so it feeds `validate_component`, `validate_project` and every plan tool.
- **(c) The repeater `id` sentence** goes in only if AC7 reproduces it. Otherwise the P87 note is withdrawn.
- 🔒 **Richard: warning or info?** All four template hits in §2 may be intended: a filter row writing one shared filter is
  the point of `Site/FilterPill`. A warning that is mostly right-by-design teaches authors to ignore the panel. Should the code
  be `info`, a `warning` that one "shared on purpose" comment on the node silences, or a warning with no escape?
  > 🔒 **Ruled, 2026-09-14 (session 1): a warning, with a "shared on purpose" escape.** It warns by default and names the
  > Variable and the placements. One marker on the node silences it, so an intended case says so once. — Richard
  >
  > ⚠️ Owed by the build: what the marker **is**. Pick something an agent can write through the plan tools and a person can
  > see in the editor, and read what the four §2 template hits would need.
- **Do not** make Variables per-instance. App-wide is documented, depended on (TPL-006, SBR-004), and correct.
- **Do not** fix this in the templates only. Rocket School already did, and that is how it stayed invisible to everyone else.

## 6. Acceptance criteria

| AC | Clause |
|---|---|
| AC1 | **RED at HEAD, recorded in §8, before any change.** (i) A spec reads `interfaceDoctrine` and `authoringDoctrine` from a live `get_project_info` and asserts a sentence saying a Variable is app-wide. It is RED, beside a known-firing assertion that the §4 States idiom text is present. (ii) `validate_component` on a fixture (a banner whose open flag is a Variable, placed twice) returns no Variable diagnostic, beside a known-firing code in the same response (the fixture carries one unlabelled node). |
| AC2 | (a) lands and AC1(i) is green, and `cmp001InterfaceDoctrine.test.ts` stays green. Sabotage arm: delete the sentence and the spec goes RED. |
| AC3 | (b) fires on the fixture placed twice and does **not** fire on the same component placed once. Both arms. Sabotage arm: count placements as 1 and the twice-placed arm goes RED. |
| AC4 | **Blast radius before landing:** run the code over every shipped template, the prefabs, the embedded templates (`site-builder`, `landing-pages` `.content.json`) and the P86 corpus. Every hit is listed and classed as defect or intended. §2's four template hits must appear; they are the known-firing signal. |
| AC5 | **Person, real browser:** a page with two copies of a banner built the way the new doctrine says. Opening one leaves the other closed, read on the rendered DOM. Control arm: the Variable version on the same page opens both. |
| AC6 | **Workarounds:** Rocket School moved its banner and choice row off Variables, and that is correct under this task, so they stay. AC4's run says whether `Profiles/New player form` (placed twice, four Variables) is a live defect. It is either filed or recorded as intended, with the drive or reading that decided it. |
| AC7 | **The repeater `id` note is measured before it is taught.** A Function that emits fresh id-less rows into a For Each is run twice. Count the rendered rows, beside a control run with ids. The doctrine gains the sentence only if the row count grows. Otherwise the P87 README note is corrected. |

## 7. Traps

- 🔴 **A single-instance fixture grades nothing.** The defect needs two placements, and both must be on screen together.
- 🔴 **The node reference already says "app-wide".** A spec that greps `docs-site` passes today. Grade the text an agent
  receives (`get_project_info`), not the text a human might find.
- ⚠️ A banner opened by a Variable written from a `didMount` can look independent on first render and then share on the first write.
  Drive the write, not the load.
- ⚠️ The playbook gate checks its claims against the shelf. If the new sentence cites a prefab, that prefab must really do it.

## 8. Record

### Session 7 — 2026-09-14, over HEAD `3747d1d20`

**What was built**

- **(a) Doctrine.** Playbook §4 gains *"A `Variable` is one value for the whole app"*: a component's own state goes in States, a Component Object, or a Counter/Switch, and the escape is named. The decomposition line gains the converse (`interfaces.ts`, `decomposition.ts`).
- **(b) `variable-in-repeated-component`**, a warning that never blocks (`validation/repeatedComponentVariable.ts`). It is wired into `authoredPreconditionDiagnostics` through a new `views` option (omitted means "do not check"), and passed by both clients (`noodl-mcp/src/validate.ts`, `authoring/validate.ts`). So it reaches `validate_component`, `validate_project`, `create_component` and the plan door. `ComponentNodesView` nodes gain optional `id`, `label`, `comment` and `metadata`.
- **The marker (owed by §5):** a node comment containing "shared on purpose", on any `Variable2`/`Set Variable` node of that name in that component. An agent writes it as `comment` (stored as `metadata.comment`), and a person sees it on the canvas. The check reads both the flat and the stored form.
- **Copies** are counted project-wide. An instance counts once. An explicit `For Each` template counts as "more than once". A placement inside a component drawn N times counts N times. A dynamic repeater and component-typed parameters are not read, so they under-count and stay quiet.
- **Where it reports:** at the holder's first node of that name. It is emitted when the holder is validated and when a component placing it is validated. The message never names the component being validated, so `dedupeDiagnostics` collapses the two, and `validate_project` gives exactly one finding. The placer direction exists because the doctrine's order writes leaves before the page.
  - ⚠️ The plan door stamps each finding with the **candidate's** component name. TPL-006 therefore showed it once per placing page (`Pages/Read`, `Pages/Remix`).
- A read-only Variable counts, as §5(b) says. Story/Source is §2's read-only hit, and it is AC4's known-firing signal.

**Readings** (logs in session `4e34184e…`'s scratchpad, `gam005/`)

| AC | gate | result |
|---|---|---|
| AC1 | `noodl-mcp` `gam005VariableInRepeatedComponent.test.ts` at HEAD, before any change | **7 failed / 2 passed**, `GAM005_RED_EXIT=1`. Every failure is on its target line, with its anchor passing: `States.currentState` present, `interfaceless-instance` / `component-port-direction` firing. The 2 passes are the quiet arms (placed once, marked). ⚠️ The first run's decomposition arm failed on its own anchor (the source wraps "Shared app / state"), so it was re-taken after the regex fix: 2 failed on target, `GAM005_RED_DOCTRINE_EXIT=1` |
| AC2/AC3 | same spec, after | **9/9**, `GAM005_GREEN4_EXIT=0` |
| — | editor `tests-unit/gam-005` (counting, cycles, For Each, both comment shapes, gate wiring, not blocking) | **12/12**, `UNIT_GREEN2_EXIT=0` |
| AC2 sabotage | playbook sentence deleted / decomposition converse deleted | exactly the one matching arm red each time (`SAB_AC2A_EXIT=1`, `SAB_AC2B_EXIT=1`). Both files restored and `cmp`-identical |
| AC3 sabotage | `entry.count++` → `entry.count = 1` | **4 red**: twice at the banner, validate_project once, non-silencing comment, create_component. For Each and the quiet arms stay green (`SAB_AC3B_EXIT=1`). Restored, `cmp`-identical. ⚠️ The first sabotage left create_component green, because the fixture's own Home placed Card once too (two parents). That arm was fixed so the named sabotage reaches it |
| AC2 | `cmp001InterfaceDoctrine.test.ts` | 32/33. The one red is **not this change**: `:353` pins the corpus publish rate at 33%, and the catalog measures **17/46 = 37%**, identically at `4bb438165^`, `4bb438165` and HEAD. Its inputs are the catalog and the spec only. Owner CMP-001 (P85): count the artefact, do not bump the literal. `test:main` does not run noodl-mcp, which is why it was unseen |
| AC4 | the product check over every population (`ac4.ts`, ts-node) | **19 findings.** landing-pages 1 (FilterPill `workFilter`) · pixel-game 2 (Game/Move `playerX`, `playerY`) · rocket-school 4 (New player form, drawn 6 times) · story-engine 1 (Story/Source `storyPasted`) · todo-list 4 and todo-list-demo 4 (Write history `todoLastHistory`/`todoProblem`, Move action, Move task `todoProblem`) · embedded landing 1 · embedded site-builder 2 (NavLink via For Each, ContactSection, both reading `siteCurrentSlug`). **0 / 46 prefabs, 0 / 104 catalog examples.** §2's four all appear. An independent python census found the same hits |
| AC4 | template gates, before marking | red on this code: TPL-003 `:198`, TPL-005 `:510`, TPL-006 `:756`, TPL-007 `:119`. TPL-008 and SB-007 pass. Also red but **not this code**: DEF-038's rocket-school control `:161`, TPL-007 `:1178`/`:1220` (Rocket School was being edited live at 20:00) |
| — | `test:main`, with everything above in the tree | **7,512 / 7,512, 457 suites**, `TEST_MAIN_EXIT=0` (session 6 read 7,500 / 456; the difference is exactly the new unit spec) |
| AC6 | marks, then regenerated (`generate-{landing,pixel,story}-template.ts`) | diff is 4 files, +16/−1, the comment stored as `metadata.comment` in each. tpl003 + tpl005 + tpl006 + gam005: **176/176**, `TPL_GATES2_EXIT=0` |

**Classified (AC4/AC6):** every finding is **intended**.
- FilterPill: the pills write one filter. Game/Move: four buttons move one player. Story/Source: Read and Remix show one pasted story. Site-builder: the nav and contact read the current page. Todo list: commands write one problem slot.
- Rocket School `New player form`, by **reading, not driven:** create mode's `reset` and edit mode's `fill` rewrite the draft every time it opens, and the Profiles copy and a header copy are never on screen together.
- Rocket School's banner and choice row left Variables in P87, and that stays correct.
- TPL-007 and TPL-008 are live peers' templates. Both busy sessions were messaged, and their marks are theirs.

**Owed**
- AC5: a browser drive, two banners built the new way beside the Variable version.
- AC7: measure the repeater `id` note before teaching it. The P87 README `:143` note stands until then.
- Mark site-builder's two reads (P77's `sb006Components.ts`, then regenerate).
- An MCP bundle rebuild, so the installed server carries the warning.
- The editor's Electron `test:ci` (not run) and the full noodl-mcp suite (not run).
