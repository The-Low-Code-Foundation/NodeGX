# STY-001 — What a look is made of

The phase Richard asked for is a *review* first: *"do a full styles, colour picker, variants, font
styles, whatever review in hopes of putting it in one left styles panel."* This task is that review,
and it ends in the seven rulings the build needs.

## 1. The person sentence

**Richard reads one page that says, for every way an app's look is decided today, where it lives,
who can change it, and what a person cannot do at all — and answers R1–R7 from it.**

## 2. What scoping already measured

Do not re-derive these; re-read them at HEAD and build on them (README §2):

- The rail already carries an **experimental `design-tokens` panel** with a Colors tab (399 LOC).
- **Two systems**: `metadata.styles` (`StylesModel`, what the pickers write) and
  `metadata.designTokens` (`StyleTokensModel`, phase 9, what all seven templates carry).
- **All seven shipped templates carry zero styles, zero text styles, zero variants.**
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

## 4. Acceptance criteria

1. **(person)** A page Richard can read in five minutes: one table of routes, one count of reach per
   route, one list of "you cannot do this today", and the three defects as pictures. He answers
   R1–R7 on it, or says what else he needs first.
2. Every row of that table names its file and line, and says whether it was **driven, read, or
   inferred** — the three are not the same evidence ([[measure-the-artefact-before-believing-the-task-file]]).
3. The reach counts are taken over the **shipped templates**, named, with the script that counted
   them committed — not an estimate, and not over a corpus we do not ship
   ([[rank-by-the-product-surface-not-by-a-corpus]]).
4. The experimental Design Tokens panel is **switched on and driven** (Settings → Editor settings),
   with screenshots of what it already does, in both themes. R3 cannot be answered from its source.
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
- 🔴 Do not fix anything here. The rulings decide whether the surface a fix would land in survives.
