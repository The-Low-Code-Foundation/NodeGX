# STY-001 — What a look is made of

The phase Richard asked for is a *review* first: *"do a full styles, colour picker, variants, font
styles, whatever review in hopes of putting it in one left styles panel."* This task is that review.
It was scoped to end in the R1–R7 rulings; Richard answered those on 2026-09-18 before it started,
and widened it in the same breath, so **it now ends in a proposal for what the style system should
be** (README §4.1).

## 1. The person sentence

**Richard reads one page that says, for every way an app's look is decided today, where it lives,
who can change it, and what a person cannot do at all — and then says whether the proposal at the
end of it is the style system NodeGX should have.**

> **Mandate widened 2026-09-18 (README §4.1).** R1–R7 were answered before this task started, so
> this is no longer the page that collects the rulings. Richard: *"feel free to say 'hold on, this
> whole style system is dumb, let's review the whole thing'"*, and then *"should we start STY-001 to
> get to where you audit and propose how you'd fix the whole styles system?"* — so **this task owes a
> VERDICT, not an inventory.** The inventory is the evidence the verdict stands on.

## 2. What scoping already measured

Do not re-derive these; re-read them at HEAD and build on them (README §2):

- 🔴 The `design-tokens` panel is **registered behind `if (config.devMode)`, and `devMode` is
  `undefined` in every build** — it has never reached anyone's rail, and its Colors tab is 69 LOC of
  placeholder scaffolding. **Do not re-derive this; it is measured in README §2.** R3 is ruled on
  it: fresh panel, delete the old one.
- **Two systems**: `metadata.styles` (`StylesModel`, what the pickers write) and
  `metadata.designTokens` (`StyleTokensModel`, phase 9, what all seven templates carry).
- **All seven shipped templates carry zero styles, zero text styles, zero variants** — 251 design
  tokens against 0/0/0, and `"variants"` occurs zero times in all seven project files.
- **`todo-list` has 26 button nodes each carrying their own `backgroundColor`/`cornerRadius`, and
  526 parameters resolving to `var(--token)` with no raw colour literal.** Colour discipline came
  from tokens; component discipline came from nothing.
- The create-transparent defect, the hover-only delete, and the variant save defect — README §3.

## 3. What this task must measure

1. **The population.** Every way a colour, a font, a spacing or a whole look reaches a rendered
   node: project styles, design tokens, variants, element configs/presets (phase 9), a raw parameter
   typed on a node, a CSS Definition node, a `noodl_modules` font. For each: where it is stored, who
   writes it, and whether a person can see it without selecting a node.
2. **The reach, before the benefit** ([[count-the-reach-first]]). How many nodes in the seven
   templates take their colour from each of those routes? A panel that manages a route nobody uses
   is worth less than one that manages the route every template actually takes.
3. **What a person cannot do at all today.** Candidates seen while scoping, each to be confirmed or
   dropped by driving: list every colour in the project without opening a node; delete a text style
   without finding a Text node; see what a variant is used by; rename a design token; find out which
   of the two systems a given colour came from.
4. **The three defects, driven** — not just read. Each one gets a before picture.
5. **The overlap.** Does a `designTokens` colour appear in the colour picker's list, and does a
   `styles.colors` colour appear in the Design Tokens panel? If the answer is no in both directions,
   R2 is the whole phase and the page must say so plainly.
6. 🔴 **Why the corpus has no variants.** Not "it doesn't" — *why*. Is authoring one hard, is it
   invisible, does the MCP not know about them, or does defect 3 mean nobody who tried one kept it?
   Richard: *"Variants are like CSS classes for NodeGX nodes, it's worrying that the templates
   haven't used them."* This is the question the verdict turns on.
7. 🔴 **THE VERDICT — what the style system should be.** One proposal, with the reasoning visible,
   answering at minimum: do `metadata.styles` and `metadata.designTokens` both continue to exist; if
   not, which survives and what the migration costs; where variants sit relative to tokens; and what
   the opinionated default authoring path looks like. It must satisfy two constraints Richard set:
   - **(a) Laziness stays possible.** *"It must still be possible for people to be lazy and just
     manually style everything."* The opinionated path is a default, never a gate.
   - **(b) It must survive code export.** The target is production apps and P18 code export, so a
     style system that cannot export as classes is a worse answer than one that can.
8. **What the MCP side would cost, scoped but NOT built here.** Teaching the MCP to author variants,
   and a mockup/design stage before an MCP build, are named in README §4.1 as their own phase. This
   task says what they are and roughly what they cost, so that phase can be opened from a number
   rather than a feeling. Grep for an existing owner before writing a new row
   ([[a-finding-may-already-be-another-tasks-acceptance-criterion]]).

## 3a. Where the answers are

- **`STY-001-FINDINGS.md`** — the measured audit: the five layers, the reach counts, the three
  inherited defects driven, the 90-project population, the export tests.
- **`STY-001-VERDICT.md`** — §3.7, the proposal. **Awaiting Richard's ruling.**
- **`shots/`** — before-pictures, both themes.
- **`scripts/devtools/sty001-style-census.js`** — the committed census (AC3).

## 4. Acceptance criteria

1. **(person)** A page Richard can read: one table of routes, one count of reach per route, one
   list of "you cannot do this today", the three defects as pictures, and **the verdict of §3.7 as
   its last section**. He rules on the verdict, or says what else he needs first.
2. Every row of that table names its file and line, and says whether it was **driven, read, or
   inferred** — the three are not the same evidence ([[measure-the-artefact-before-believing-the-task-file]]).
3. The reach counts are taken over the **shipped templates**, named, with the script that counted
   them committed — not an estimate, and not over a corpus we do not ship
   ([[rank-by-the-product-surface-not-by-a-corpus]]).
4. ~~The experimental Design Tokens panel is switched on and driven…~~ **DROPPED, 2026-09-18 s2.**
   Its two premises are both false: the panel cannot be switched on (its registration is behind a
   `devMode` flag that is `undefined` in every build, so no Settings checkbox exists for it), and R3
   no longer needs answering — Richard ruled **fresh panel, delete the old one**. Replaced by:
   **the three defects of AC1 are driven on a live editor and photographed in both themes**, which
   is the only driving this task still owes.
5. No source file under `packages/**` is changed by this task. It is a study; the build is STY-002+.

## 5. Traps

- 🔴 **The pickers are popouts.** A census scoped to the panel will not see them, and one scoped to
  `document` reads the same whether the popout opened or not. Scope to the popout and report the
  scope's own box ([[a-rendered-surface-can-be-behind-a-blocker]], and `verdicts/CHR-010/census.js`).
- 🔴 **A template with zero styles proves nothing about the pickers.** To drive them you must create
  a style first — which is exactly the defect. Create one, then look at what landed in the project
  file, not at what the list shows.
- 🔴 **Creating a variant breaks saving** (README §3.3). Drive on a **scratch copy**, and expect the
  project not to persist what you made.
- ⚠️ `LocalChangesDiff` also deletes styles, so "who writes this" has more than one answer.
- 🔴 Do not fix anything here. **This is still true even though R1–R7 are ruled**: the verdict of
  §3.7 may say the surface a fix would land in should not exist. The build is STY-002+.
- 🔴 **A peer session may own the only editor stack.** On 2026-09-18 s2, session `be37b16c` held
  Electron on `8680` with CDP on `9444`. **Do not launch a second dev stack**
  ([[drive-a-first-run-with-nodegx-user-data-dir]]) — check `lsof -nP -iTCP -sTCP:LISTEN` first and
  either use the free window or wait.
- 🔴 **The verdict is a proposal, not a decision.** Richard closes this phase on his look, and §3.7
  is the thing he is looking at. Write it as an argument he can refuse, with the cost of each option
  named ([[refuse-the-claim-not-the-iteration]]).
