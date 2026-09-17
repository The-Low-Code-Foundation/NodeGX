# The border sweep — what this family is, and why most of it is gone

Phase 75 opened `BORDER-CONTROL-SWEEP.md` after NAT-001 ruled that every control edge clears
**3:1** against its ground and every text **4.5:1**. Each slice was a spec that read a stylesheet as
text, resolved the token a rule named through `colors.css`, and asserted the ratio — in both themes,
in every state the stylesheet declares. They found real defects at real numbers (a `:hover` that
moves a fill down the ramp and inherits a resting fix onto a step where it fails; a control with two
grounds and one call site; an edge and a fill on the same tone), and the headers of the three files
still here record them.

**CHR-004 (phase 92) retired six of them on 2026-09-17**: the four launcher slices
(`launcher-control-borders`, `launcher-button-control-borders`, `folder-tree-control-borders`,
`learner-path-control-borders`), `style-section-control-borders`, and `fb-005`'s
`template-shelf-control-borders`.

## Why they went

They pinned **which token** a rule names. That is not what NAT-001 ruled, and it is not what a
person sees: a session that moved a hover fill one step — keeping the contrast Richard ruled — got a
red suite, and `LauncherButton.module.scss` carried a comment naming the test that would redden if
it ever did. Phase 92 is a redesign of exactly these surfaces, so a gate written as
"this fill is `bg-3`" was stopping the work it existed to protect.

## What replaced them

`scripts/look-gate/` — see `dev-docs/tasks/phase-92-dreamweaver-called/CHR-004-*.md` §6.

It measures the **rendered** surface in a running editor over CDP and asks NAT-001's question
directly: text ≥ 4.5:1 and control edge ≥ 3:1 against the ground it actually resolves to by walking
ancestors and compositing, plus every font size on R1's ramp and every radius on CHR-003's, plus
whether each label fits its box. It does not know what a token is called. Every finding names the
element; every result carries the population it came from, refusals included.

**It covers the states too.** The specs above assert *"no state of it moves the edge below 3:1"*,
and a gate reading computed styles would see only the resting state — so it forces the others with
Chromium's own `CSS.forcePseudoState`, the mechanism DevTools' `:hov` panel uses:

```bash
NOODL_REMOTE_DEBUG_PORT=9333 node scripts/look-gate/run.js --surface=launcher --theme=both --state=all
```

Proved by positive control on 2026-09-17: a `:hover`-only failure armed over a live build is
**invisible at rest** (19 findings, none about a button) and **caught under hover** (27 findings, 8
naming each button by its label).

## What is still here, and why

`bench-`, `code-editor-` and `node-picker-control-borders.test.ts` cover surfaces phase 92 does not
redesign and the look gate has not been pointed at. They are the same shape and carry the same
limitation — retire each one when the gate has covered its surface, not before. Their headers are
worth reading first: between them they record the hover trap that no grep over border declarations
can find, and the reason `own()` is load-bearing when a family nests its states with `&`.

## The limitation the replacement has, and these did not

A text gate runs in CI with no browser. **The look gate needs a running editor**, and the only
renderer CI has is `test:ci` under `xvfb-run`. Richard ruled on 2026-09-17 that it stays a
**hand-run check**, taken each session before the work is shown to him, rather than being wired into
CI. The half that decides — the contrast maths, the ramps, the population and the refusals — is
graded in `tests-unit/chr-004/` and does run in CI on every PR.
