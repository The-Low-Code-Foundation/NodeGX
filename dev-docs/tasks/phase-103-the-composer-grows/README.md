# Phase 103 — The composer grows: visual style creation, all the way

**Scoped:** 2026-09-24, as the second half of [P102](../phase-102-the-token-composer/README.md).
**Status: 💭 BACKLOG — not started, and not for 0.3.0.** Starts after 0.3.0 ships and Richard has
driven P102's composer (CMP-007). Rows here are candidates, not commitments. Each one becomes a task
file, with ACs, when the phase opens.
**Prefix: `CMG`.**

> "It feels like a 'never been done before' concept of visual style creation."
> — Richard, 2026-09-24

## 1. The person sentence

> **Someone shapes every part of their app's look (light, depth, motion, type, space) by
> handling it directly and describing it in their own words, and CSS is only ever something they
> can peek at.**

## 2. What P102 left for here

Everything below is drawn on the *Token Composer* mockup canvas (2026-09-24) unless marked *new*.

| candidate | what a person gets | notes |
|---|---|---|
| **Dragging** | Gradient colour handles slide along the bar; a direction dial; a pad you drag to say where a shadow falls; the two handles on an easing curve | The *wow* part. P102 ships the same control with sliders. `curveeditor.jsx` (the existing Tween curve editor) is the starting point for the curve |
| **Custom colour** | *Picking* a colour that isn't one of the project's, and a Strength slider on a kept literal | 🔴 Needs Richard to revisit P94 STY-005's *"No colour wheel"* ruling first. P102 RC-6 already *keeps* such a colour as a *Custom* chip; this row makes it editable |
| **Strength on a project colour** | *"Primary at 40%"* in a glow | Writes `color-mix()`. Check the exporter and the viewer's minimum browser before offering it |
| **Text size that grows with the screen** | *"30px on a phone → 48px on a desktop"* instead of `clamp(1.875rem, 1.2rem + 2.4vw, 3rem)` | The mockup's formula (450→1200px) reproduces the default `--text-3xl` exactly |
| **The other nine types** | Weight (Thin → Black on a live "Aa"), line height and letter spacing (a slider on a paragraph), spacing, radius, border width (a slider + number on a box) | Same frame as P102's composer, a small codec each |
| **Your own presets** | Save a shadow you made as a tile you can pick again, in any project | Needs a place to live outside the project |
| **The pencil on a node's token field** | Edit an existing token in the composer without leaving the node | P102 CMP-008 ships the source switch, the drawn token list and *Make this a token* (which opens the composer once, at creation). This row is the pencil beside the field for a token that already exists, and the same for `backgroundGradient` |
| **Used by** *(new)* | *"Worn by 14 nodes on 3 pages"* in the composer header, and *"Nothing wears this yet"* | A reach count over the project ([[count-the-reach-first]]). The honest number is what makes a beginner trust editing a shared token |
| **Strength on a kept literal** *(new)* | Slide the alpha of a Playful purple without re-serialising it | Needs a spelling-preserving colour writer; P102 RC-6 deliberately refused to offer the slider rather than risk a rewrite |
| **Describe it** *(new)* | Type *"a soft blue glow from the top corner"* and the composer fills in the controls. You adjust from there | The editor already talks to Claude. The model writes a **model** through the codec, never raw CSS, so the round-trip rule still holds |
| **Font browser** *(new)* | Any Google Font by name, or upload your own file, with the font files handled | UPG-003 already moves font files with text styles, and P88's `presetFonts.ts` places a bundled face as a module (Nunito, DM Sans, Source Sans 3 ship in the app today). Reuse that path. 🔴 Since P102 s2 the composer offers **only** faces a visitor will see; the 25 web fonts it used to list without shipping (Manrope, Poppins, Lora, JetBrains Mono…) wait here — a font is offered once this row can put its files in the project |

## 3. Moved into P102 on 2026-09-24 (Richard: *"I like all your ideas"*)

Light/Dark preview ground, the canvas showing the draft while you slide (RC-7), *Replace with a
preset* out of text mode, hold to compare, typeable slider values, the node-side shadow source
switch with *Make this a token* (RC-5, CMP-008), kept literals and optional positions and
direction keywords in the codecs (RC-6), and the MCP grammar + validator (CMP-009).

## 4. Rules carried from P102

The round-trip rule, previews that resolve, one undo step per Apply, keep what you can't pick, the
only rewrite is one the person chose, a draft is a style element not a save, and the census: every
new codec joins CMP-006's census with its rewrite column at **0** before it ships.
