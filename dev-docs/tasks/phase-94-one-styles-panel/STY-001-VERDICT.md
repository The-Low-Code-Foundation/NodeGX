# STY-001 §3.7 — The verdict: what the style system should be

**Written 2026-09-18 s2, on the evidence in `STY-001-FINDINGS.md`.**
**This is a proposal Richard can refuse.** Every claim below is marked **measured** (counted or
driven this session), **read** (source at HEAD), or **judgement**.

---

## 1. The one-sentence finding

**NodeGX already has the style system Richard wants. It is not missing — it is unreachable,
mis-named against itself, untaught, and silently destroyed by code export.**

Every piece exists and works: values live in tokens, a *live reference* layer exists as variants and
text styles, and both resolve correctly at runtime. What does not exist is any path by which a person
or an agent would find them, and any way to get them out of the product intact.

---

## 2. What actually decides an app's look today — five layers, not two

**measured / read.** README §4's R2 framed this as two storage blocks. It is five mechanisms, and
the important split is not *where they are stored* but **whether they stamp or refer**.

| # | layer | stamp or refer? | reach in the 7 templates | survives React export? |
|---|---|---|---|---|
| 1 | **Design tokens** (`designTokens.customTokens` + 193 shipped defaults) | **refer** — `var(--x)`, CSS-native | **4,877 references** | ✅ verbatim |
| 2 | **ElementConfig variants/sizes** (phase 9) | **stamp** — *"stamped into concrete params at author time"* (`StyleVocabulary.ts:20`) | the reason ~800 nodes carry their own look | ✅ (as inline params) |
| 3 | **StyleCompositions** (DSG-005) — `card`, `shell`, `primaryButton` | **stamp** — named parameter sets "reused verbatim" | taught to agents via `get_style_vocabulary` | ✅ (as inline params) |
| 4 | **Variants + colour/text styles** (`nodegx.styles.json`) | **refer** — live, resolved at runtime | **0** | 🔴 **silently dropped** |
| 5 | **CSS Definition + `cssClassName`** | **refer** — real CSS classes | 73 nodes, 6 of 7 templates | ✅ verbatim |

Read the last two columns together and the whole phase falls out of them:

> **Every stamping layer exports. The product's own live-reference layer does not. So the corpus is
> made of stamps.**

That is not a failure of discipline by whoever built the templates. **It is the only choice that
survives the pipeline.**

---

## 3. Why nobody uses the layer Richard wants — four independent causes

Each of these alone would be enough. All four are true at once.

1. 🔴 **The word is taken.** "Variant" means the phase-9 stamp in the surface whose entire job is
   teaching the design system (`get_style_vocabulary`: *"the legal variants/sizes per element
   type"*), and it means the live reference in `VariantModel`. **A Button's property panel shows
   both, inches apart** — a `Variant / Add style variant` row and a `Preset / Size: sm md lg xl`
   row — with nothing saying they are different systems. **driven.**
2. 🔴 **The doctrine teaches stamping.** `StyleCompositions.ts` quotes Richard: *"Before authoring,
   fix a handful of named parameter sets and reuse them verbatim."* That is a written instruction to
   stamp, aimed at agents, and it is what produced `todo-list`'s 26 individually-styled buttons.
   **read.**
3. 🔴 **No tool creates one.** `instructions.ts` mentions variants **0 times**; `authoringBrief.ts`
   once; **no MCP tool name contains `variant`**. An agent can set `node.variant` (it is in
   `vocabulary.ts:168`) but is never told to and cannot create the definition. **read.**
4. 🔴 **It does not survive export.** §8.4b. **driven.**

**The 90-project population is the consequence, not a coincidence** (**measured**): 4 variants across
90 real projects, every one a test artefact; 22 text styles, mostly arriving from legacy Noodl
imports; zero genuine authoring of either.

---

## 4. The proposal

### R-A. Keep both storage blocks. Retiring either is not available.

`nodegx.styles.json` holds colours, text styles **and variants** in one file; `designTokens` holds
values. They are not duplicates — **they are the value layer and the reference layer**, and R2's
"which one survives" was the wrong question. **Answer R2 as: both, because they do different jobs.**
The panel labels each row with the layer it came from, as ruled.

### R-B. Fix the export gap FIRST, before the panel invites anyone in. 🔴

**This is the recommendation I would argue hardest for.** Today the product can be used correctly —
variants, text styles, tokens, hover states — and the reward is that React export silently deletes
the correct half. **Building a beautiful panel that encourages people into that is making the trap
easier to fall into.**

The fix is bounded and specific: `variant` is a top-level node field that
`packages/nodegx-export/src/parse/` and `/ir/` never read, so `NodeIR` never carries it. Teach the
parser to carry `node.variant` and the node's `textStyle`, resolve them against `nodegx.styles.json`,
and emit them as **shared CSS module classes** — which is the natural target, since the emitter
already produces one class per node and the whole point of a reference is that N nodes share one
rule. **Until that lands, a variant is a liability, not a feature.**

⚠️ **Cost not measured.** I have read the gap, not scoped the fix. Estimating it is the first thing
STY-005 (or a new EXP row) should do. Do not let this document's confidence about the *diagnosis*
pass for confidence about the *cost*.

### R-C. ~~Rename the phase-9 sense~~ — **SUPERSEDED by R-C′, 2026-09-18, on Richard's objection.**

The original recommendation was to call phase 9's thing a **Preset** and reserve **Variant** for the
live reference. Richard's objection, and it is correct:

> "If I pick lg and the editor writes the large button's values, it's going to feel like setting the
> 'Large button' preset. You won't know by the action of selecting the linking or the copying thing
> that it's linked or copied, you'll just see 18px appear in the font size field in both cases. …
> I've created a large button variant, why would I want a 'large' preset as well? Surely selecting
> one or the other on the button will just do the same thing."

**Verified at HEAD after the objection.** `NodeGraphNode.getParameter` (`NodeGraphNode.ts:799-824`)
resolves in the order: the node's own `parameters[name]` → **`this.variant.getParameter(name)`** →
the port default. And `ColorType.fromPort` sets `isDefault = parent.model.parameters[p.name] ===
undefined` (`ColorType.ts:57`), which drives `isChanged` and the panel's changed-dot. So:

| | preset applied | variant applied |
|---|---|---|
| field shows | `18px` | `18px` |
| node's own `parameters` | `{fontSize: 18}` | `{}` |
| changed-dot | ● on | ○ off |

🔴 **The entire visible difference between a copy and a live link is one dot, and that dot means
"this node owns this value", not "this is a copy".** A rename does not touch that — it gives two
indistinguishable actions two names.

### R-C′. Collapse the concepts, and show the link. **(replaces R-C)**

> 🟢 **RULED 2026-09-18, and taken further than this.** Richard: *"So why not just do away with
> presets? … It needs to be clear AF."* Presets are **deleted**, not collapsed — there is one concept
> called a **Look**. The ruled design is
> [`STY-DESIGN-THE-LOOK-MODEL.md`](./STY-DESIGN-THE-LOOK-MODEL.md); R-C′ below is the intermediate
> step that got there and is kept for the reasoning, not as the plan.

1. **A preset should create or link a saved look**, not stamp values. Picking `lg` makes (or reuses)
   a project-level look called `Large Button` and points the node at it. The honest difference
   between the two rows was never copy-vs-link — it is **a starting point we ship** vs **a look you
   saved** — and once a preset produces a saved look, there is one concept instead of three.
2. **The panel must distinguish inherited from owned**, whichever way (1) goes: the look's name in
   the field, a distinct colour, and an explicit override affordance — the Figma
   instance-property / devtools inherited-style convention. A dot is not enough.

The rename falls out of (1) for free: once a preset *is* a saved look, there is only one thing left
to name. **judgement**, but the measurement above is not.

### R-D. Build the panel as ruled (R1, R3–R6), with one addition.

Beside the pickers, fresh panel, under Components, colours + text styles + variants, `⋯` menu per
row. The addition: **each row says what layer it is and what uses it**, because after R-A a person
is looking at two layers in one list and the badge is the only thing that makes that honest.

### R-E. Teach it, or none of the above matters.

The MCP needs a tool that creates a variant and a text style, and `instructions.ts` needs to say
when to reach for one. Richard's tutorial-video plan — *"every button they put down has the style
they like, a variant set, tokens added, hover and disabled modes looked at"* — is a description of
this layer being used properly, and it cannot be followed today because step two has no door.
**Named as its own phase, not a P94 task**, per README §4.1.

---

## 5. Against the two constraints Richard set

- **(a) "It must still be possible for people to be lazy and just manually style everything."**
  ✅ **Satisfied, and unchanged by everything above.** Raw parameters on a node still work and still
  export — that is precisely what the 7 templates do. Nothing here removes a path; R-B *adds* one
  that currently dead-ends.
- **(b) "It must survive code export."** 🔴 **Today it does not, and that is the finding.** R-B is
  the whole of the answer. Note the shape of the failure: the exporter handles **values** and not
  **references**, so the constraint is not "make the style system exportable" but "teach the exporter
  one indirection".

---

## 6. What I would do first, in order

| | | why |
|---|---|---|
| 1 | **Scope the export fix** (R-B) | it is the only item that makes the others safe to ship, and its cost is the one number this document does not have |
| 2 | **The Look model + the property panel** (ruled design §8, STY-002/003) | one design in two pieces; the panel is what makes any of it legible to a builder |
| 3 | **STY-002 panel shell** (R-D) | as ruled |
| 4 | **STY-003/4/5** | colours, text styles, variants — with STY-005 no longer needing to "fix the save defect", which §4.3 showed is a reload-path bug, not a save bug |
| 5 | **The MCP/authoring phase** (R-E) | off the back of this, not inside P94 |

---

## 7. What would change my mind

- **If the export fix is expensive** (say, more than a week), R-B's "first" becomes "alongside", and
  the panel ships with an honest warning on the variant section rather than waiting.
- **If Richard wants the stamping doctrine kept** — there is a real argument for it: stamped output
  is simpler to debug and has no resolution step — then R-C still stands but R-B drops to a
  nice-to-have, and the panel becomes a *viewer* of stamps rather than an editor of references.
- **If colour styles turn out to export fine** (§8.4b, unmeasured), the export gap is narrower than
  stated and R-B gets cheaper.

---

## 8. The one thing I would not do

**Do not ship the panel first and fix export later.** Everything in §3 says people do not use this
layer. A good panel would change that — and §8.4b says the reward for changing it is silent data
loss at the moment they try to ship. That ordering turns a dormant defect into an active one.
