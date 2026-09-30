# NSP-016 — Visual nodes: research first, then layout semantics that are not CSS

**Opened 2026-09-29.** **Depends on NSP-008.**
**Status: 📋 not started. Research and a ruling before any build.**

## 1. The person sentence

> **What a visual node draws — its size, position, what it contains, what it responds to — is
> written down in terms a native toolkit could implement, not only as the CSS the web happens to
> use, and it is checked by measuring what was drawn.**

## 2. Why this is last and different

The logic of a visual node (a Button's *Click* signal, a Text Input's *Text* output, a Checkbox's
*Checked*) is ordinary T1 and can be specced like any other node. Its **look and layout** cannot:
today they are CSS — a Group is a `div`, layout is flexbox, the style vocabulary is CSS properties,
design tokens are CSS variables. A spec that says "`flex-direction: column`" ties every future
target to CSS forever.

This is also the part of NodeGX most exposed to the platform changing under it (the conversation
of 2026-09-29: native targets, and whatever browsers become). Separating *what the layout means*
from *how CSS says it* is the same work native targets would force anyway.

## 3. What to do

### 3.1 Research (one session)
- How do cross-platform toolkits describe layout neutrally? (Yoga/React Native's flexbox subset,
  SwiftUI stacks, Compose rows/columns, Flutter.) What subset do all of them share?
- Census NodeGX's visual parameters against that subset: which map cleanly, which are CSS-only
  (and how often they are used — rank by the product surface: the templates and the picker's
  defaults, not an old corpus).
- Write the result as `RESEARCH-LAYOUT-SEMANTICS.md` in this folder.

### 3.2 Ruling (asked in plain words, with the census numbers)
Spec visual nodes as (a) **logic only**, with look/layout graded by `render_report` geometry as
today; (b) logic plus a **neutral layout model** covering the shared subset, with CSS-only
parameters marked as web-only; (c) stop at research.

### 3.3 Build (per the ruling)
Logic specs for all 19 visual nodes regardless (the logic is T1). Layout per the ruling.

## 4. The nodes (from the census)

**19**, from the census ([CENSUS.md](CENSUS.md), NSP-000, generated 2026-09-30). Regenerate the census; do not edit this list by hand.

- **T5 visual (19):** Shape (`Circle`) · Component Children · Drag · Repeater (`For Each`) · Group · Image · Button (`net.noodl.controls.button`) · Checkbox (`net.noodl.controls.checkbox`) · Dropdown (`net.noodl.controls.options`) · Radio Button (`net.noodl.controls.radiobutton`) · Slider (`net.noodl.controls.range`) · Text Input (`net.noodl.controls.textinput`) · Columns (`net.noodl.visual.columns`) · Icon (`net.noodl.visual.icon`) · Component Stack (`Page Stack`) · Radio Button Group · Page Router (`Router`) · Text · Video

Census notes:
- **Component Children** — providedBy noodl-editor in the catalog

## 5. Acceptance criteria

1. The research note exists with the parameter census (counts, not impressions).
2. The ruling is asked and recorded in the README's §7.
3. Every visual node's **logic** is specced (the ledger's definition) or exempt with a reason.
4. If (b): geometry assertions for the neutral subset, graded with a tolerance, on the runtime
   through `render_report`.

## 6. Watch for

- Memory: *a rect is not visibility; a rendered surface can be behind a blocker; an invisible
  element still animates.* Geometry is not "what a person sees". Assert what the spec says, and
  say which of those it is.
- Memory: *a ring must be read on the element a person sees* — focus and interaction states have
  the same trap.

## 7. Built

*(empty)*
