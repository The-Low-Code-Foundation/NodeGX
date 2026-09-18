# STY-003 — The property panel

**Phase:** 94 — one styles panel. **Prefix:** `STY`. **State:** ⬜ not started.
**Design:** [`STY-DESIGN-THE-LOOK-MODEL.md`](./STY-DESIGN-THE-LOOK-MODEL.md) §2 (the four rules), §3
(the panel), §4 (the Look menu) — **ruled by Richard, 2026-09-18**.

> **"It needs to be clear AF."** — Richard's ruling, and the reason this task exists as its own row.

🔴 **Build with [STY-002](./STY-002-THE-LOOK-MODEL.md).** That one is the model; this is the only
place a person ever meets it.

**The close condition is Richard's look.** A surface closes when he has seen a screenshot and ruled
it WORTHY — as in P92, and for the sixth-plus time
([[correct-and-usable-were-never-the-same-criterion]]). Nothing here closes on a passing test.

---

## 1. What the surface is today, measured at HEAD (s3)

| | reading | where |
|---|---|---|
| ✔ | The whole variant surface is **490 LOC in three files** — a popup, an item, and the editor row | `components/VariantStates/`: `PickVariantPopup.tsx` 187, `variantseditor.tsx` 213, `PickVariantItem.tsx` 90 |
| ✔ | The property editor itself is **352 LOC**, and it is where the `Preset`/`Size` rows are applied | `propertyeditor.ts:127-128, 164, 193` |
| ✔ | 🔴 **Reachable only through a node.** There is no entry point to any of the three management surfaces that does not begin with "select a node" — that is R1/R5's whole reason, and STY-005's | STY-001 §2 |
| ✔ | **Delete and rename exist and are invisible until hover** — `.variants-item-icon` is `visibility: hidden`, revealed by `:hover`. Confirmed with a control pair on the same element: at rest both report `hidden`, under a real hover both report `visible` | `colorstylepicker.jsx:289-298`; `variantseditor.css:220-233`; shots `06-row-at-rest.png` / `07-row-hovered.png` |
| ✔ | **R6 overruled the proposal here:** one visible `⋯` menu per row, not two always-visible icons. *"It says 'there are actions here' without putting two bins in your eyeline on every row."* | README §4 |

## 2. 🔴 The trap this task must not walk into

**The changed-dot is not an answer to rule 2 and must not be reused for it.**

Measured: today the *entire* visible difference between a stamped value and a live one is that dot,
and the dot means `parameters[name] !== undefined` — **"this node owns this value"**, which is a
different statement from **"this is a copy"** (`ColorPicker/ColorType.ts:57`,
`NodeGraphNode.ts:799-824`). Rule 2 asks every style field to say *where its value came from*. The
dot cannot say that, because it does not know it.

⚠️ **And a second trap, from the same family:** under the Look model, a linked field and an own field
can hold the *same resolved value*. A treatment that only appears when values differ is invisible in
exactly the case a person most needs it ([[a-css-property-whose-default-equals-the-test-value]]).
**The three states are a fact about provenance, never about the value.**

---

## 3. Acceptance criteria

The four rules of design §2 are the criteria. Any surface that breaks one is wrong.

| # | criterion | state |
|---|---|---|
| **AC1** | 🔴 **One row decides it.** A node wears a Look or it does not, set from one row. **No other control also sets styles** — graded by there being no second mechanism left after STY-002, not by the row looking singular | ⬜ |
| **AC2** | 🔴 **No bare values.** Every style field states where its value came from — the Look's name, or nothing meaning the node's own. **A person must never see `18px` and have to wonder.** The resolved value may appear as a quiet tail, never as the field's primary content | ⬜ |
| **AC3** | 🔴 **Overrides are loud and reversible.** Overriding one field on a node wearing a Look changes that field's appearance, **states what the Look wanted**, and offers revert | ⬜ |
| **AC4** | 🔴 **Shipped and homemade behave identically.** Nothing in this surface behaves differently because of where a Look came from | ⬜ |
| **AC5** | **The three states read correctly on the element a person actually sees**, in **both themes** — linked, overridden, own. 🔴 Read from the rendered element, not from the class it was given ([[a-ring-must-be-read-on-the-element-a-person-sees]]), and check the chosen colours against the editor's existing semantic colours: design §3.3 explicitly does **not** rule them | ⬜ |
| **AC6** | **The Look menu** is design §4's order: this project's Looks with wearer counts, then the NodeGX library with its "adds it to your project" sentence, then **"Save this node's styles as a new Look…"**. That last row is the behaviour change that matters | ⬜ |
| **AC7** | **The hover-only affordance is gone** — R6's one visible `⋯` per row. The control pair that measured the defect (§1) re-run at rest, and the actions reachable without hovering | ⬜ |
| **AC8** | 🔴 **Richard has seen it and ruled it WORTHY** — both themes, a node wearing a Look with an override, and a node with none. Nothing else closes this task | ⬜ |

## 4. Out of scope

- The Look data model, the shipped library, `Preset`/`Size` removal — [STY-002](./STY-002-THE-LOOK-MODEL.md).
- **The colours for linked / overridden.** Design §3.3 leaves them unruled; the mockup's purple and
  amber are a starting point, not a decision.
- **States** (hover, pressed, disabled) as an editable surface. Design §9 — next thing, not this.
- The rail panel — [STY-005](./STY-005). R1 ruled the panel sits **beside** the pickers: the picker
  stays for *picking* on a selected node, the panel is for *managing*.
- The property panel's general design, which closed on Richard's looks in P92 CHR-008/CHR-009.
  🔴 This task changes the **style section** only; do not reopen the rest.
