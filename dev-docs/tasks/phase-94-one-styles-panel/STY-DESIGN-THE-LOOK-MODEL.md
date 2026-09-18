# The Look model — the design phase 94 builds

**Status: 🟢 RULED by Richard, 2026-09-18.** *"Yep sold."* Both decisions answered **yes**: delete
presets entirely, and build the property panel as drawn.

**This supersedes R-C and R-C′ in `STY-001-VERDICT.md`, and it re-scopes STY-002 onward.** The
evidence it rests on is `STY-001-FINDINGS.md`; nothing here re-argues it.

> **The ruling, in Richard's words:** *"So why not just do away with presets? Remember we have
> licence to just rethink anything we want that doesn't make sense. Nobody is going to be able to
> understand a dot means X or Y by just selecting and seeing what happens. It needs to be clear AF."*

---

## 1. The model

**There is one concept: a Look.**

A **Look** is a named bundle of style parameters for one node type — "Primary Button", "Card",
"Heading". Any number of nodes wear it. Change it once and every node wearing it changes.

**A node either wears a Look, or its styles are its own.** There is no third state and no second
mechanism that also sets styles.

Underneath, a Look is what `VariantModel` already is (`nodegx.styles.json` → `variants[]`, keyed by
`name` + `typename`, referenced by `node.variant`). **The model is not new — it works today and the
runtime already resolves it** (`nodescope.ts:158`). What changes is that it becomes the *only*
mechanism, gains a real surface, and is made visible.

### 1.1 Shipped Looks and your Looks are the same thing

NodeGX ships a library of Looks (what phase 9's element configs know: a large button, an outline
button, a small input). **Choosing one copies it into the project as an ordinary Look you own.**
After that it behaves identically to one you made, and it never changes under you on an update.

That is the whole of what "Preset / Size" did. It stops being a parallel system.

### 1.2 Values stay where they are

Design tokens are unchanged and untouched by this. **Tokens are the vocabulary; Looks are the
sentences.** A Look's parameters should be written in tokens (`var(--primary)`), exactly as a created
text style already is today — measured: a text style created in the editor comes out as
`fontSize: var(--text-sm)`, `color: var(--foreground)`.

Richard's R-A question — *"would a builder think 'why didn't they just merge these systems?'"* — is
answered by this document: the redundancy he could feel was presets-vs-variants, not values-vs-looks.
With presets gone, there are two layers and they are obviously different jobs.

### 1.3 Laziness survives, as promised

A node with no Look has its own parameters, typed in, exactly as every shipped template does today.
Nothing is forced. Constraint (a) from the verdict is untouched.

---

## 2. The four rules

These are the acceptance criteria for "clear AF". Any surface that breaks one is wrong.

1. 🔴 **One row decides it.** A node wears a Look or it does not. No other control also sets styles.
2. 🔴 **No bare values.** Every style field states where its value came from — the Look's name, or
   nothing, meaning the node's own. **A person must never see `18px` and have to wonder.**
3. 🔴 **Overrides are loud and reversible.** Overriding one field on a node wearing a Look changes
   that field's appearance, states what the Look wanted, and offers revert.
4. 🔴 **Shipped and homemade behave identically.** A NodeGX Look becomes the project's on first use.
   Nothing behaves differently because of where it came from.

🔴 **The changed-dot is not an answer to rule 2 and must not be reused for it.** Measured: today the
*entire* visible difference between a stamped value and a live one is that dot, and the dot means
`parameters[name] !== undefined` — "this node owns this value" — which is a different statement from
"this is a copy" (`ColorType.ts:57`, `NodeGraphNode.ts:799-824`).

---

## 3. The property panel

### 3.1 A node wearing a Look

```
  Done
  BUTTON · wearing Primary Button          ← the header states it

  Look            [ Primary Button      ▾ ]      ← linked styling
                  Worn by 26 buttons · Edit this Look

  STYLE — from Primary Button
  Background      [ ■ Primary Button       ]     ← linked styling
  Font Size       [ Primary Button    18px ]     ← linked styling
  Corner Radius   [ 24px        just this one ]  ← override styling
                  Primary Button says 8px · revert
```

- **Linked** fields name the Look. The resolved value may appear as a quiet tail (`18px`), never as
  the primary content of the field.
- **Overridden** fields are visually distinct from both linked and own, say what the Look wanted, and
  carry a revert.
- The section header names the source once (`STYLE — from Primary Button`) so the per-field labels do
  not have to shout.

### 3.2 A node with no Look

```
  Delete
  BUTTON · no Look

  Look            [ None — styles are its own  ▾ ]

  STYLE
  Background      [ ■ var(--destructive) ]
  Font Size       [ 16px ]
```

Plain. No linked treatment anywhere — the absence of it is itself the signal.

### 3.3 Three visual states, and they mean exactly one thing each

| state | meaning |
|---|---|
| **linked** | comes from a Look — change it there and everything wearing it follows |
| **overridden** | you changed it on this node only |
| **own** | this node's own value, typed in |

⚠️ **Colour choice is not ruled.** The mockup used purple for linked and amber for override because
they read clearly against the editor chrome and are not already spoken for. Whoever builds it should
check them against the editor's existing semantic colours and against both themes before committing
([[a-ring-must-be-read-on-the-element-a-person-sees]]).

---

## 4. The Look menu

Opening the `Look` row gives, in this order:

```
  IN THIS PROJECT
    ■ Primary Button                    26
    □ Ghost Button                       4
  ─────────────────────────────────────────
  START FROM A NODEGX LOOK
    ■ Large Button
    ■ Small Button
    □ Outline Button
    Picking one adds it to your project so you can
    edit it. It won't change under you later.
  ─────────────────────────────────────────
    + Save this button's styles as a new Look…
```

🔴 **That last row is the behaviour change that matters.** Today, making something reusable means
finding a row labelled "Add style variant" and already knowing what a variant is. *"Save what I've
already got"* is what a person is actually doing at that moment, and it is the entry point the
90-project scan says nobody has ever found (4 variants across 90 projects, all test artefacts).

The count beside each project Look ("26") is the same data the delete-confirm modal already computes,
so it exists.

---

## 5. What this does to the rest of the product

| | change |
|---|---|
| **Phase 9 element configs** | become the **shipped Look library**. The values are kept — they were lifted from measured reference builds and are good. What goes is their status as a second mechanism |
| **`Preset` / `Size` rows** | removed from the property panel |
| **The word "variant"** | the rename problem dissolves: there is one concept left, so it needs one name. **"Look" is the working name and is not ruled** — if Richard prefers "Style", "Class" or anything else, that is a free choice at this point |
| **`get_style_vocabulary` (MCP)** | stops reporting "the legal variants/sizes per element type" and reports the project's Looks plus the shipped library |
| **MCP authoring** | needs a tool that creates a Look and one that puts a node in one. Still its own phase (README §4.1), but this design is what it would author into |
| **`StyleCompositions` (DSG-005)** | its named parameter sets (`card`, `shell`, `primaryButton`) are Looks. That module becomes seed data for the shipped library rather than advice to stamp |
| **Code export** | 🔴 **becomes blocking — see §6** |

---

## 6. 🔴 Export is now blocking, not urgent

**Measured** (`STY-001-FINDINGS.md` §8.4b): a variant and a text style on an ordinary leaf node both
vanish on React export, silently, with zero mentions in a 1,059-line report — while the same values
written inline on the same kind of node export perfectly. `variant` is never parsed into `NodeIR` at
all.

Under the old model that was a bad defect affecting a feature nobody used. **Under this model every
styled thing is a link, so shipping this design without the export fix would mean the more correctly
someone builds, the more of their app silently disappears when they publish it.**

What it needs: the parser carries `node.variant` and `textStyle`; the emitter resolves them against
`nodegx.styles.json` and emits **one shared CSS module class per Look** rather than per node — which
is the natural target, since a Look is exactly "N nodes share one rule".

✅ **Costed and half built (s3) — see [`STY-004-EXPORT-CARRIES-LOOKS.md`](./STY-004-EXPORT-CARRIES-LOOKS.md).**
The silent loss is closed: a Look, a text style and a colour style all reach the emitted CSS, and the
report names each one and says out loud that hover/pressed/disabled were carried in the file but not
drawn. What remains is the *shape* of the output — one shared class per Look rather than the Look's
declarations written into each wearer's own class — which is **one further session and is not
blocking**.

---

## 7. Existing projects

**Nothing migrates and nothing breaks.** Everything built so far has values stamped onto nodes; under
this model those are simply nodes with no Look, which is a supported state. All seven templates and
all 90 projects on Richard's machine keep working untouched.

"Turn these 26 buttons into a Look" is a later offer, not a chore, and not part of this phase.

---

## 8. Revised task list

The board in `README.md` §5 was scoped against the old model. Revised:

| id | task | state |
|---|---|---|
| STY-001 | The study and the verdict | 🟢 done |
| [STY-002](./STY-002-THE-LOOK-MODEL.md) | **The Look model** — one concept end to end: the data, shipped-Look library, "save as a Look", `Preset`/`Size` removed | ⬜ **task file written (s3)**, 7 ACs, measurements at HEAD |
| [STY-003](./STY-003-THE-PROPERTY-PANEL.md) | **The property panel** — §2's four rules and §3's three states. This is the "clear AF" task | ⬜ **task file written (s3)**, 8 ACs, closes on Richard's look |
| [STY-004](./STY-004-EXPORT-CARRIES-LOOKS.md) | **Export carries Looks** (§6) | 🟡 **Part A done (s3)** — nothing vanishes any more: the exporter reads `nodegx.styles.json`, carries `node.variant`, resolves the runtime's own cascade, and names every Look in the report. AC1–AC7 green. **Part B — one shared class per Look across components — is the number: one further session** |
| STY-005 | **The Styles panel in the rail** — colours, text, Looks, as ruled in R1/R3–R6 | ⬜ |
| STY-006 | **Where it's used** — a Look names what wears it and takes you there | ⬜ |
| STY-007 | **The after picture** — before/after of every surface, both themes, Richard's WORTHY | ⬜ |
| — | MCP authoring | its own phase (README §4.1) |

**Order:** STY-004 was scoped first because its cost may change everything else's order. **That number
is now in:** Part A (nothing vanishes) cost one session and is done; Part B (one shared rule per
Look) is one more, and is not blocking — a Look already collapses to one class *within* a component,
because `component.ts` merges identical declaration sets. So **nothing is waiting on STY-004 any
longer**, and STY-002/STY-003 are the next build. STY-002 and
STY-003 are one design in two pieces and should be built together or adjacent. STY-005 depends on
STY-002 existing.

---

## 9. Deliberately not decided here

- **The name.** "Look" is a working name.
- **The colours** for linked / overridden (§3.3).
- **Whether a Look can extend another Look.** Not needed for v1; do not build it speculatively.
- **States** (hover, pressed, disabled). `VariantModel` already has `stateParameters` and
  `stateTransitions` and nothing uses them; 6 of 7 templates hand-write those states as CSS text
  instead. **That is the obvious next thing after this lands**, and it is where the real win is for
  Richard's tutorial-video plan — but it is not in this design and should not be smuggled in.
- **The editor crash** seen once after creating a variant (`STY-001-FINDINGS.md` §9) — uncharacterised,
  and to be reproduced properly before anyone treats it as a defect.
