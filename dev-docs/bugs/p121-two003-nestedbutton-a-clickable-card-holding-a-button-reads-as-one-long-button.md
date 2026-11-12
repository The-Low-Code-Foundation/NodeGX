---
id: P121-TWO003-NESTEDBUTTON
title: "Since GROUPKEYBOARD, an element whose Click is wired is a button to the keyboard even when it holds its own buttons or fields: a cake card reads as ONE button named by every word in it, and the backdrop behind a settings sheet takes a focus ring around the whole sheet and closes it on Enter"
status: fixed
commit: 01554fe3e
severity: medium
area: viewer / keyboard-click (every visual node with a Click); editor validator (a new info, `click-area-holds-a-control`)
found: Beta sweep s13, 2026-10-27 (the GROUPKEYBOARD bug file's "Left", reach counted first)
evidence: dev-docs/reviews/beta-bug-sweep-2026-10-24.md, Session 13; Chrome drive screenshot dev-docs/reviews/beta-bug-sweep-2026-10-24-assets/nestedbutton-scrim-focused.png
kit: preview
regression: packages/noodl-viewer-react/tests/two003-groupkeyboard.test.tsx "a card already holding a Button is not made a button; its Click still answers a pointer"
---

What a person met, measured in headless Chrome on the current viewer (a two-shape fixture: a cake card with Click
wired holding an "Add to basket" Button, and a backdrop with Click = close holding a settings sheet with a field, Save
and Close). Chrome's own accessibility tree read the card as one button named "Lemon cake £4.00 — a slice, baked this
morning Add to basket", and the backdrop as one button named "Your settings: hourly rate, focus hours and the days you
work Hourly rate Save Close the sheet". One Tab press drew a focus ring around the whole sheet, and Enter there closed
it. axe calls the shape `nested-interactive`.

**Reach, counted before building** (a scan of both project formats under `~/vscode_projects`, copies in worktrees and
task folders removed): 299 click-wired elements holding a control or another click-wired element, in 66 projects. 163
are card-sized with a real control inside; 14 hold 25 or more nodes (sheets and sections). The shipped templates:
planning's four sheet backdrops, Project card and two rows; the marketplace's ProductCard, Product, SellerChip and
PayOption; landing-pages' CaseStudy; bot-garden's Card; rocket-school and star-class's Header and Profile card.

**Ruled 2026-10-27 (Richard, asked with the measurements above): "Inner controls win".** A clicked area that already
holds a Button or a field is not made a Tab stop. Tab reaches its inner controls only. The editor and agents get a note
saying a Click that does something no inner control does needs its own Button.

**Found while building it: a dead Tab stop from GROUPKEYBOARD itself.** rocket-school and star-class place "The face"
in the Header (which opens the menu) and in the hangar's Tile. The face's picture has its Click wired to the
component's own `Tapped` output, and neither placement uses that output. The picture was a Tab stop that did nothing.
With "inner controls win" it would also have hidden the Header and the Tile from the keyboard.

**Fixed.**
- `noodl-viewer-react/src/keyboard-click.ts`: an element is made a button only while it holds nothing Tab stops on
  (a control, a link, a field, `[tabindex]` other than -1, another marked element). A MutationObserver keeps that in
  step: a control mounting inside later takes the button back off, and the last one leaving gives it again. And a
  Click counts as wired only when it reaches something: a wire into the component's Component Outputs counts where the
  placement takes that output further, followed up through each component. An instance a repeater or Run Tasks made
  (`creatorCallbacks`) hands its outputs on without wires, so it counts. Anything unreadable counts, as before.
- `noodl-editor/.../validation/rules/clickAreaHoldsAControl.ts`, an **info** in `ALL_RULES` (Problems panel, agent
  writes, Studio's problems box through the preview): `"Product" answers a click. It holds a Button ("Name: to the
  product"). The Tab key stops on what it holds instead. …` It reads which outputs each placement uses, as the viewer
  does. The wording passed the content-authoring skill's offline checks (`written closer opener contract`).

**Graded.** Viewer spec 27/27 (10 new: holds a Button / a field arriving later and leaving / a nested Tab stop / what
does not count / unwired stops watching / five on the runtime's output shapes; mutants: no "holds" check → 3 red, no
dead-wire check → 2 red). Rule spec 11/11 through the real `SemanticValidator` (twins for every arm; mutants: shallow
→ 1 red, no components → 1 red, every Component Outputs wire counted → 1 red). Chrome on a fresh viewer build: the
fixture's Tab order is the tile (still a button, "Open the photo of the bakery", the known-firing control), Add to
basket, the field, Save, Close. rocket-school's game screen: ▾ (the Header's own menu Button), the progress card and
the four game cards, each a button named by its words, with no dead picture stop. Calibrated on the 17 templates: 24
notes, each a real "holds".

Not driven: a phone screen reader (VoiceOver). The names are Chrome's computed accessible names, which VoiceOver reads.
A wire added on the parent side while the preview runs does not re-sync the inner element until it remounts.
