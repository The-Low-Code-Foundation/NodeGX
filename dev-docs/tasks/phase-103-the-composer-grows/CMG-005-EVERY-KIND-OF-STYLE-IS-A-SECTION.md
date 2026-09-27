# CMG-005 — Every kind of style is a section

**Opened 2026-09-24** from Richard's drive of P102 (README §2, finding 8).
**Status: ✅ built 2026-09-24 (s1)** — 20 specs green, 19/19 drive arms green on two project copies.
§5 has what was built and what each AC measured. CMG-002 (the ＋), CMG-006 and CMG-010 (reveal)
build on it.

## 1. The person sentence

> **Someone opening Styles sees the kinds of style their app has (Colours, Type, Spacing,
> Borders, Effects, Motion, Looks) as sections they can open. Something outside the panel can
> open one and point at a row in it.**

## 2. What is wrong, measured

*"When I collapse 'Other tokens', all the typography drawers and stuff disappear, it's not clear
and I don't get even what Other tokens means. The typography and animation bits are important,
they're not 'Other'."*

- [`StylesPanel.tsx:51-65`](../../../packages/noodl-editor/src/editor/src/views/panels/StylesPanel/StylesPanel.tsx#L51-L65)
  renders three sections: **Colours**, **Looks**, and
  `<TokensSection title="Other tokens" excludeGroups={['Colors']} />`.
- With a title, `TokensSection` wraps every group in **one** outer `CollapsableSection` that starts
  closed (`TokensSection.tsx:144-150`). Each group inside also starts closed (`:124-129`). The
  groups, from `TOKEN_CATEGORY_GROUPS` (`TokenCategories.ts:101`), are Spacing, Typography
  (5 categories), Borders, Effects (shadow, gradient) and Animation (easing, duration).
- So the composer P102 built for shadows, gradients, motion and fonts sits **two closed levels
  down**, under a word that says *unimportant*. Typography lost its own section when P99 HLT-007
  removed *Text styles* (`StylesPanel.tsx:13-19`), and nothing replaced the heading.
- The *Reset all* sentence (CMG-004) also sits inside *Other tokens*, which makes it read as
  *reset the other tokens*.
- **Nothing outside can open a section.** `CollapsableSection` reads `isClosed` once, as the
  initial `useState`
  ([`CollapsableSection.tsx:42`](../../../packages/noodl-core-ui/src/components/sidebar/CollapsableSection/CollapsableSection.tsx#L42)).
  `StylesPanel` takes no props and listens for no events. The only hook is
  `SidebarModel.instance.switch('styles')`.

## 3. What to build

1. **Top-level sections, in this order:** Colours · Type · Spacing · Borders · Effects · Motion ·
   Looks. Final names are the builder's call, in plain words (*Motion*, not *Animation easing*).
   No *Other*. Each section is a `CollapsableSection` at the panel's top level. Colours stays
   first. Type stays near the top: it is what people change first. If Looks moves, write down why.
2. **Open state is remembered** per section per user (the usual per-viewer store the sidebar
   uses, if one exists; `grep` before adding one). First open: Colours and Type open, the rest
   closed, or all open if the panel is short enough to scan. Drive it and pick.
3. **A reveal seam:** `revealStyle({ kind: 'token' | 'look' | 'colourStyle', name })` switches the
   sidebar to Styles, opens the section, scrolls the row into view and highlights it for about a
   second. Put it next to the existing route helpers (`settingsPanelRoute.ts:77`,
   `docsPanelRoute.ts:56`, `provenanceRequest.ts:65-101`) and use the same pattern. It needs
   `CollapsableSection` to accept a **controlled** open state, or a key/imperative open. Change
   the core-ui component carefully: `grep` its callers and keep uncontrolled use as it is.
4. **Search** across all sections (a filter box at the top) if the flat list gets long. Optional.
   Build it only if the drive shows scrolling is the problem.

## 4. Acceptance criteria

1. No string *"Other tokens"* in the editor (`grep` it; the core-ui stories too).
2. Collapsing any one section hides that section only.
3. `revealStyle({ kind: 'token', name: '--ease-bounce' })` from the devtools console, with the
   Components panel showing and every section closed, ends with the Styles panel showing, Motion
   open, and the `--ease-bounce` row inside the viewport (`getBoundingClientRect`) and highlighted.
4. The same for a Look and for an old colour style.
5. Open state survives an editor restart.
6. `CollapsableSection`'s existing callers are unchanged: its story and any spec still pass, and
   one other panel that uses it is driven open/closed.
7. FIX-015's gate and the Styles panel's specs are updated with the reason (P102 §7), never deleted.

## 5. Built (s1, 2026-09-24)

**The sections.** `stylesPanelRoute.ts` is the one table: Colours · Type · Spacing · Borders ·
Effects · Motion · Looks, each with a plain title, a one-sentence subtitle, the token group it
draws and whether it starts open. `StylesPanel.tsx` maps over it; `TokensSection.tsx` became
`TokenGroupSection` (one group per section, the outer *Other tokens* wrapper gone; the file keeps
its name and `getGroupForToken` so HLT-007's gate still reads it). Looks stays last, where P94 put
it, so a person who learned the panel before this finds their Looks where they were. Two
user-visible *"Other tokens"* strings outside the panel were renamed too (the 0.3 upgrade toast in
`textStylesToTokens.ts`, the empty state in `TextStylePicker.jsx`).

**Open state.** `EditorSettings` key `styles.sections` (the store the sidebar already uses for its
widths and the inspector for its collapsed state). First open: Colours and Type open, the rest
closed — the drive on *Landing page test V2* shows all seven headers fit in one screen with those
two open, so nothing needs the *all open* fallback. `readSectionOpenState` falls back per section
on anything that is not a boolean.

**The seam.** `revealStyle({ kind: 'token' | 'look' | 'colourStyle', name, typename? })`:
stashed, emitted (`nodegx:styles-reveal-requested`) and then `SidebarModel.switch('styles')`,
the `provenanceRequest.ts` shape. The panel claims the stash on mount and hears the event after
(it stays mounted behind `display: none` once shown). It opens the section (and, for a colour
token, the closed *Design tokens (N)* list inside Colours), scrolls the row into view twice — at
once and again after `Collapsible`'s 400 ms — and sets `data-revealed` for 1.6 s, which a global
attribute rule animates. Both row components carry `data-style-row="<name>"`; Look rows add
`data-style-typename`. An unknown name is a toast, not a throw.

**`CollapsableSection`.** Additive: `isCollapsed` (a boolean makes it controlled) +
`onCollapsedChange`, `sectionId` → `data-section-id`, and `data-section-open` on every render.
`isClosed` and every existing caller unchanged (the story, 23 callers). One behavioural change on
purpose: a click inside the `actions` slot no longer toggles the section, because CMG-002's ＋ and
CMG-004's reset go there.

**§4 measured** (`scripts/devtools/drive-cmg005-sections.js`, copies *CMG Drive Tokens* ← *CMP-007
Richard Drive.before-0.3* and *CMG Drive Looks* ← *CMP-001 Composer Drive*; specs
`tests-unit/cmg-005/`):

| AC | reading |
|---|---|
| 1 | `body.innerText.includes('Other tokens')` → `false`; the spec walks 500+ source files in editor + core-ui with comments stripped → 0 hits |
| 2 | all seven open → collapse Type → only `type:false`; `--text-lg` is no longer under its own centre (`elementFromPoint`, [[a-rect-is-not-visibility]]) while `--space-4` still is |
| 3 | every section closed, Components showing, `revealStyle({kind:'token',name:'--ease-bounce'})` from the console → `ActiveId=styles`, Motion `data-section-open=true`, row rect top 647 / bottom 687 inside a 1146 window, `data-revealed=true`, animation `styles-reveal-row`; gone 1.6 s later. Shot `shots/cmg005-ac3-reveal-ease-bounce.png`. Same for `--primary` (Colours + its inner list open) |
| 4 | `{kind:'look', name:'Drive Look', typename:'Text'}` → Looks open, row at 703–735, highlighted. `{kind:'colourStyle', name:'Primary Dark'}` → Colours open, row at 218–250 |
| 5 | `EditorSettings.get('styles.sections')` equals the on-screen state section for section after a reveal and header clicks. Same store a restart reads (`JSONStorage`); the restart itself was not driven this session |
| 6 | the first visible Settings section (uncontrolled) reads `true → false → true` across two header clicks; `CollapsableSection` story untouched; 23 callers compile |
| 7 | `fix-015` and `hlt-007` gates pass unchanged: the row component and the group lookup did not move. New: `cmg-005/sections.test.ts` (15) and `cmg-005/collapsableSection.test.tsx` (5) |

**Not built.** §3.4's search box: the drive showed the seven headers fit one screen with the
default open state, so scrolling is not the problem yet.

**Left over from here.** The *Reset all* sentence that used to sit inside *Other tokens* is not
drawn anywhere between this task and CMG-004, which redraws it as its §3.2 list; there is no
other caller of `resetAllToDefaults` in the editor.
