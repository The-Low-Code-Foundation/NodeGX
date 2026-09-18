# STY-001 — findings: the static audit and the drive

**Session:** 2026-09-18 s2. **Branch:** `cline-dev`. **No source file under `packages/**` changed.**
**Evidence key:** **read** = read at HEAD · **counted** = `scripts/devtools/sty001-style-census.js` ·
**driven** = measured in a running editor on a scratch copy of `templates/todo-list`.

🔴 **This file corrects three things the scoping README asserts and two things an earlier draft of
this file asserted.** They are marked **CORRECTION** and the wrong version is left visible.

---

## 1. The headline: the corpus took one route, and it is not the one the pickers manage

Seven shipped templates — 241 components, 2,841 nodes, 9,965 string parameters. **counted**

| route to a rendered node | count | share |
|---|---|---|
| design token — shipped default (193 ship in `@nodegx/project-contract/tokens`) | **3,281** | 33.7% |
| design token — project override (34–41 per template) | **1,596** | 16.4% |
| project colour style | **0** | 0.0% |
| project text style | **0** | 0.0% |
| variant on a node | **0** | 0.0% |
| colour literal typed on a node | **0** | 0.0% |
| dangling `var(--x)` | **0** | 0.0% |
| hand-written CSS class via `cssClassName` | **73 nodes**, 6 templates | — |

**4,877 token references; zero of everything else.**

**Why the zeros are trustworthy.** Three independent checks, because an absence measured by one
instrument is worth little ([[assert-an-absence-with-a-known-firing-signal-beside-it]]):

1. The same pass reports 4,877 non-zero token references — the classifier fires.
2. An independent `grep -rhoE '"#[0-9a-fA-F]{3,8}"'` over the same files returns 0, as does `rgba(`.
3. **The census run against the driven scratch copy reports `colours 1 · variants 1 · styles file
   present`** — so the script detects styles and variants when a project has them. The templates'
   zeros are a real absence.

---

## 2. CORRECTION — where styles are actually stored

**An earlier draft of this file, and the census script as first written, read
`metadata.styles` inside `nodegx.project.json`. That is the legacy shape.**

**driven** — creating one colour style and one variant in the editor wrote neither into
`nodegx.project.json`. They landed in a separate project-level file, **`nodegx.styles.json`**:

```json
{ "$schema": "https://opennoodl.dev/schemas/styles-v2.json", "version": 1,
  "colors": { "sty001-test": "#f5f5f3" },
  "variants": [ { "name": "sty001-variant", "typename": "Group",
                  "parameters": { "backgroundColor": "sty001-test", ... },
                  "stateParameters": {}, "stateTransitions": {} } ] }
```

The census now reads both. **The headline is unchanged**: no shipped template has a
`nodegx.styles.json` at all — all seven report `absent`.

---

## 3. CORRECTION — the picker is **not** empty, and this is the real defect

**The earlier draft said: `colorstylepicker.jsx:55,61` reads only `stylesModel.getStyles('colors')`,
so the picker's list is empty on every shipped template and the picker is "dead UI". That is
wrong.** The source read was right; the conclusion was not.

**driven** — the popout has **two** sections, and only the first comes from `getStyles`:

- **the colour-styles section** (from `metadata.styles`/`nodegx.styles.json`) — empty on a template,
  as predicted;
- **"Colors in project"** — from `extractProjectColors`, which harvests **every distinct value used
  on any colour port anywhere in the project**, whatever system it came from. On `todo-list` that is
  11 rows: `#000000`, `#00000033`, `transparent`, and **8 `var(--token)` rows**.

So a person does see their tokens. **What they do not see is what colour any of them is.**

🔴 **NEW, UNREPORTED DEFECT — every `var(--token)` row in the picker renders as transparent.**
Measured from computed style, not from the screenshot: each token row's swatch is the bare
checkerboard (`background-color: rgb(255,255,255)` with the checker gradient and **no colour layer**),
while `#000000` renders black and the created style `sty001-test` renders `rgb(245,245,243)` correctly.
8 of 11 rows show nothing. Before-picture: `shots/07-row-hovered.png`.

The likely mechanism, **read, not proven**: `resolveColor` (`projectmodel.ts:716-721`) tries
`styles.colors[value]` first and falls through to `resolveProjectTokenValue(this, color) ?? color`.
A created style is found in branch 1 already resolved, so it paints; a token must go through branch 2,
and in this list it evidently returns the string unchanged — and `var(--background)` means nothing in
the editor's own document, which the comment on that very line already warns about.

**This is probably what Richard actually hit.** His words were *"no matter what colour you choose it
adds it transparent and you have to set it again once it's in the list."* Everything token-shaped in
that list already shows as transparent, before anything is created.

---

## 4. The three inherited defects, driven

| # | README says | what the drive measured |
|---|---|---|
| 1 | a created colour style is transparent | 🔴 **DOES NOT REPRODUCE — three cases driven, none transparent.** (a) port holding `var(--background)` → `"sty001-test": "#f5f5f3"`, the correct resolved colour; (b) **genuinely unset port** (App Group's `parameters` is `{}` — everything comes from its variant) → `"unset-port-test": "#000000"`, black, not transparent; (c) **a colour picked in the wheel and not committed** (`#FAFA00`, node parameters confirmed still without `backgroundColor`) → the created style's swatch computed `rgb(250, 250, 0)`. **So the create already takes the wheel colour, which is what R7 asked for.** What is actually broken is §4a below |
| 2 | delete and rename are hover-only | 🟢 **CONFIRMED, with a control pair on the same element in one session.** At rest both `.variants-item-icon` report `visibility: hidden`; under a real hover both report `visible`. Pictures: `shots/06-row-at-rest.png` / `shots/07-row-hovered.png` |
| 3 | creating a variant leaves the project unable to save | ⚠️ **MIS-DESCRIBED.** The variant **saved correctly** (§2). What broke is the *reload* path: `[FLD-009] could not reload project-level files from disk TypeError: v.toJSON is not a function`, logged as a **warning**, once, right after creation. A full editor reload afterwards loaded the project cleanly — `reactMounted: true`, no error. So the project is **not** corrupted and work is **not** lost. The `v.toJSON` lead in `projectLevel.ts:179` still stands; its blast radius does not |

### 4a. 🔴 NEW DEFECT — a colour style you create can vanish when you reload

**driven, with the consequence verified.** The style created from the wheel in case (c) above:

1. appeared in the picker's list immediately, **with the correct colour** (`rgb(250,250,0)`);
2. was **not** in `nodegx.styles.json` after 20s of polling — and a project save ran at 13:52:28 in
   that window and rewrote that very file **without it**, while the two styles that *had* been
   applied to a port were written normally;
3. **was gone from the list after an editor reload.** `sty001-test` and `unset-port-test` survived;
   `wheel-yellow-test` did not.

The difference between the styles that survived and the one that did not is that **creating a style
from a port's own field also assigns it to that port**, and the assignment is what marks the project
dirty. A style created and not applied is never anybody's change.

**This is a much better fit for Richard's sentence than the README's mechanism is** — *"you have to
set it again once it's in the list"* is what you do when the thing you just made did not stick.
Together with §3 (every token renders transparent in that same list), it accounts for the whole
complaint without the create-path bug the README posited.

---

## 4b. 🔴 The population beyond the templates: 90 real projects on this machine

**counted**, over every directory in `recently_opened_project.json` that still exists (90 of them) —
this answers the "a real user project has not been checked" gap, and it is worse than the corpus.

| | finding |
|---|---|
| projects carrying a `nodegx.styles.json` at all | **15 of 90** |
| **text styles** | **22, across 12 projects.** ⚠️ **A first pass of this row said "0 in all 90" and was WRONG** — it read `sidecar.text`; the sidecar's key is **`textStyles`**. The wrong key reads an absence as confidently as a real one. Caught by grepping the project for a style this session had just created. The census script is fixed and the row re-measured. Most are the same recurring legacy-import set (`Body Small`, `Label Small` in 6 projects); the rest sit in `test112`, `test113`, `Landing page test V2`, `Puppy test` |
| **variants** | 🔴 **4, and every one is a test artefact**: `Bright` on an icon (`chr010-proj` — the P92 drive that *found* the variant bug), `test` on a Text (`members area Richard test`), and `S27Variant` twice (`cn027-drive`, `cn029-drive`). Plus this session's own `sty001-variant`. **Not one is real authoring.** |
| colour styles | present in ~15 projects — but the substantial ones are the **same recurring 9-name palette** (`Grey - 600`, `Primary Dark`, `Primary Subtle`, …) across `leg003-drive`, `cn019-drive`, `cn027-drive`, `cn029-drive`, `fix003-drive`, `fix016-s50-drive`. **All of those carry an import report: they are legacy Noodl imports.** The palette came *in*; it was not authored here |

**So the styles system's real-world usage is: colours and text styles that largely arrived from
legacy Noodl imports, and zero genuine variants ever.** The templates were not an unrepresentative
sample — nothing we ship or that anyone has built here uses a variant.

🔴 **Two wrong-key errors in one session** (`metadata.styles` in §2, `sidecar.text` here) are worth
recording as a phase hazard: **the styles sidecar's three keys are `colors`, `textStyles` and
`variants`**, and the legacy metadata shape spells the second one `text`. Anything that reads this
file must accept both, or it will report a populated project as empty
([[measure-the-artefact-before-believing-the-task-file]]).

---

## 4c. The text-style surface, driven

**driven.** On a **`Text`** node, the `Text Style` field opens a popout of **270 × 29 px** whose
entire content is one row: **"Create new text style"**. No list, no create-from-existing, no delete,
no rename — because `TextStylePicker.jsx:29` sources only `getStyles('text')` and, unlike the colour
picker, has **no "Colors in project" equivalent** to fall back on. With zero text styles in a
project, the surface is one button.

On a **`Button`**, the same-named `Text Style` row has an **Edit** button that opens a **300 × 48 px**
popout containing only a collapsed **"ADVANCED CSS — 3 set"** section — **no text-style list at all**.
Picture: `shots/10-textstyle-attempt.png`. ⚠️ So README §2's "the text style picker is reached from
`TextStyleType`'s port" is incomplete: a Button has a `Text Style` row that reaches somewhere else
entirely.

**Creating one works, and works well.** `sty001-textstyle` was created, applied to the node, and
persisted to `nodegx.styles.json` — **authored in tokens by default**:

```json
"textStyles": { "sty001-textstyle": {
  "fontSize": "var(--text-sm)", "fontWeight": "var(--font-medium)",
  "color": "var(--foreground)", "fontStyle": "normal", ... } }
```

**That is the "make your app the right way" behaviour Richard wants, already happening** — a new text
style references the token system rather than freezing literals. The defect is not the model; it is
that the door to it is a 29-pixel button behind a node.

---

## 4d. Both themes: the token defect is not a dark-theme artefact

**driven.** The colour style picker, same project, same moment, `data-theme` flipped from `dark` to
`light` (`ThemeManager` stamps the root; the flip needs the `nodegx:themechanged` event beside it or
the canvas does not repaint). Pictures: `shots/12-picker-DARK.png`, `shots/13-picker-LIGHT.png`.

In **both** themes, identically:

| row | swatch |
|---|---|
| `sty001-test` | correct (`#f5f5f3`) |
| `unset-port-test` | correct (`#000000`) |
| `#000000`, `#00000033`, `transparent` | correct |
| **all 9 `var(--token)` rows** | 🔴 **checkerboard — nothing painted** |

So §3 is a real rendering fault in the picker, not a contrast problem in one theme.

---

## 5. 🔴 The finding that reframes the phase: the living reference chain already works

**driven.** After creating one variant on the App Group node, the artefacts are:

```
components/App/nodes.json   node App  →  "variant": "sty001-variant"      ← a live reference
nodegx.styles.json          variant   →  "backgroundColor": "sty001-test" ← a live reference
nodegx.styles.json          color     →  "sty001-test": "#f5f5f3"         ← the value
```

Three levels of indirection, all live, all persisted, and the node carries **no inline colour at
all**. That is a CSS-class system, and **it works today**.

So the problem is not that NodeGX lacks the thing Richard wants. It is that the thing exists and is:

- **unreachable** — only from a `Variant` row in the property panel head, after selecting a node;
- **mis-named against itself** — see §6;
- **untaught** — `instructions.ts` mentions variants 0 times, `authoringBrief.ts` once, and no MCP
  tool creates one;
- **carrying one broken path** — §4.3;
- **used by nothing we ship** — §1.

---

## 6. 🔴 "Variant" means two different things

| | phase-9 sense | `VariantModel` sense |
|---|---|---|
| what it is | a **stamp**: an ElementConfig variant/size per element type | a **live named reference** |
| how it reaches a node | *"variants are stamped into concrete params at author time"* — `StyleVocabulary.ts:20` **read** | `node.variant = '<name>'` **driven** |
| what the node then carries | its own `backgroundColor`, `cornerRadius`, … | nothing but the reference |
| changing it later | edit every node it was stamped onto | edit the variant |
| in the shipped corpus | **this is what happened** | **0 uses** |
| what `get_style_vocabulary` teaches | this one | not mentioned |

That is the mechanism behind `todo-list`'s 26 buttons each carrying their own background and radius:
**a variant was applied, and applying it left inline parameters behind.** The colours stayed live
because the stamped values are token references — which is why changing a token restyles everything,
and changing *what a button is* does not.

**So the corpus got colour discipline from tokens and component discipline from nothing.**

---

## 7. The seventh route: hand-written CSS, in a text field

**counted + read.** 6 of the 7 templates carry a **CSS Definition** node, and 73 nodes across them
join its classes via a `cssClassName` input — `pressable` alone 21 times. `landing-pages`:

```css
.pressable { cursor: pointer; }
button.pressable:disabled { opacity: 0.45; cursor: not-allowed; }
.card-lift:hover { transform: translateY(-3px); border-color: var(--border-strong); }
```

with the author's own comment at the top: *"Anything a node port can express is set on the node, not
here."*

**Hover, press, disabled and the dark palette — the exact list in Richard's tutorial-video sentence —
are done today by writing CSS by hand in a text blob.** Variants have `stateParameters` and
`stateTransitions` fields (§2) that appear built for precisely this, and nothing in the corpus uses
them.

---

## 8. What the verdict (§3.7) has to account for

1. **The reference system exists and works** (§5). The verdict is about **reach and teaching**, not
   about building a CSS-class system from nothing. That is much cheaper than it looked this morning.
2. **The naming collision (§6) is load-bearing**, not cosmetic: it is the most likely single reason
   the corpus has no variants, because the surface that teaches the design system uses the word for
   the other thing.
3. **Retiring `metadata.styles`/`nodegx.styles.json` is NOT available** — it is where variants live
   too. The two-system split (R2) is really a *three*-way split: tokens (values), styles+variants
   (references), CSS Definition (states). The verdict should propose which layer owns what.
4. 🔴 **Code export, constraint (b) — the exporter carries every route EXCEPT the living one.**
   **read**, `emit/style.ts` + `emit/component.ts:360-392`:
   - it already emits **one CSS-module class per visual node**, and token references pass through as
     `var(--token)` verbatim — so tokens and stamped variants export cleanly;
   - **`cssClassName` is handled** (folded into `className`, §48) and a **CSS Definition's stylesheet
     is emitted verbatim** and appended to `document.head` on mount — so the hand-written-CSS route
     of §7 survives export intact;
   - the unhandled-parameter exemption list is exactly `visible`, `mounted`, `cssClassName`.
     **`variant` is not on it**, so a node carrying one emits
     `parameter variant on <id> has no style/content mapping — dropped, reported`;
   - **`stateParameters` and `stateTransitions` appear nowhere in `packages/nodegx-export/src` at
     all** — so variant hover/pressed/disabled states would not export either.

   **So the one mechanism that gives component-level discipline is the one mechanism the exporter
   drops, and the two that duplicate style everywhere export perfectly.** For an app aimed at code
   export that is exactly backwards, and it is a second, independent reason nobody building for
   production would adopt variants even after finding them.

### 8.4a What the one real export run showed — and what it cannot yet prove

**driven**, `export_react` on the scratch project (one colour style, one text style, one variant on
the **root** App Group):

- the export wrote a full Vite + React app with a **1,059-line `EXPORT-REPORT.md`** that reports
  dropped wires in detail, so the report is real and verbose;
- **`variant` appears in it zero times**, and neither `sty001-test` nor `unset-port-test` appears
  anywhere in `src/` — the only `#f5f5f3` is `--background` in `styles/tokens.css`, which merely
  shares the value;
- the App Group's `borderColor: "unset-port-test"` is **also** absent, and **also** unreported.

🔴 **And the mechanism is quieter than "dropped, reported": the exporter never sees a variant at
all.** `variant` is a **top-level field on the node** (`node.variant`), not an entry in
`node.parameters` — and **`variant` appears nowhere in `packages/nodegx-export/src/parse/` or
`/ir/`**, so `NodeIR` never carries it. It therefore never reaches `style.unhandled`, never trips the
`dropped, reported` note in `emit/component.ts:373`, and never appears in the report. The loss is
**silent**, in a layer whose own header comment (`ir/types.ts:22`) says *"Parsing never drops and
never fails on content."*

🔴 **The asymmetry that makes this a trap rather than a limitation: the RUNTIME applies variants
fine.** `noodl-runtime/src/nodescope.ts:158` does
`this.context.variants.getVariant(nodeModel.type, nodeModel.variant)`, with a whole `Variants` module
behind it. So a person can build with variants, watch them work in the editor preview and in a
deployed runtime app, export to React — and silently lose every one, with nothing in the report to
tell them.

⚠️ That run could not separate "variant dropped" from "root Group collapsed into the router" —
`App.tsx` is a bare `BrowserRouter`/`Routes` shell with no styling at all. **So it was redone on an
ordinary node.**

### 8.4b The clean test — and it is worse than variants

**driven.** `LeafVariant` was created on the **`Label` Text node inside `Todo/Date picker`** — an
ordinary leaf visual node, nothing collapsible about it — and the project exported again.

| | result |
|---|---|
| the component exported? | ✅ yes — `src/components/DatePicker.tsx` + `.module.css` |
| the Label node exported? | ✅ yes — as `.dpLabel` |
| what `.dpLabel` contains | **`{ margin: 0; }`** — the Text default, and nothing else |
| `LeafVariant` anywhere in the export | ❌ **absent** |
| `sty001-textstyle` (the node's **text style**) anywhere | ❌ **absent** |
| `variant` in the 1,059-line report | ❌ **0 mentions** |

🔴 **Both indirections are lost, and the text style is a finding in its own right — text styles do
not export either.** The Label's text style set `fontSize: var(--text-sm)`,
`fontWeight: var(--font-medium)`, `color: var(--foreground)`; none of it reached the CSS module.

**The control fires, so this is not the exporter failing on those values:**
`var(--text-sm)` **does** appear in `LogList.module.css`, `TaskRow.module.css` and
`DoneList.module.css` — every one of them a node that carries the value as its **own inline
parameter**. The same value, on the same kind of node, exports when written directly and vanishes
when reached through a style.

**Conclusion, measured: the exporter handles VALUES, not REFERENCES.** Everything the style system
offers as indirection — variants, text styles — is dropped silently. What survives is exactly what
needs no NodeGX-level resolution: tokens (CSS-native `var()`) and hand-written CSS classes.

⚠️ **Not cleanly tested: colour styles.** The only colour-style reference in this project sat on the
collapsed root Group, so its absence proves nothing. Treat colour-style export as **unmeasured**.
5. **Constraint (a), laziness, is already satisfied** and must stay so: raw params on a node still
   work and 0 templates needed a literal to do it.

---

## 9. Still not measured

- **Defect 1 on a `Text` node's own colour port** — driven on a Group and a Button only. The attempt
  ended when the renderer crashed (below).
- **Colour-style export**, per §8.4b's caveat.
- ⚠️ **An editor crash was observed and is NOT characterised.** After creating `LeafVariant`, the
  renderer showed "Aw, Snap!" preceded by a long loop of
  `Attempted to synchronously unmount a root while React was already rendering`. The popout path
  does `createRoot` on open and unmounts in `onClose` (`ColorType.ts:168-190`), which is a plausible
  mechanism — **but this session was opening and closing popouts with rapid programmatic clicks**,
  so it is not established that a person hits it ([[a-new-instruments-first-drive-finds-instrument-faults]]).
  The variant data had already persisted before the crash. Worth its own row; not worth a claim.

## 10. Reproducing

```
node scripts/devtools/sty001-style-census.js            # §1, over templates/
node scripts/devtools/sty001-style-census.js <dir>      # any project, e.g. the scratch copy
node scripts/devtools/sty001-style-census.js --json
```

Reads only. The drive used a scratch copy of `templates/todo-list`, a dev stack on the default ports,
and was torn down afterwards (`npm run dev:stop` — "Stopped 26 process(es). Nothing left running.").
