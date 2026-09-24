# CMG-001 — The composer fits its window

**Opened 2026-09-24** from Richard's drive of P102 (README §2, findings 1 and 2).
**Status: 📋 ready.** No dependencies.

## 1. The person sentence

> **Someone opens the composer anywhere on screen, presses Show CSS, and sees the CSS and the
> Apply button without scrolling the window or moving the popout. The controls in front of them
> are the ones that do something for this kind of style.**

## 2. What is wrong, measured

- **Finding 1.** *"You don't need a 'light dark Hold to compare' line on the Easing popup, that's
  weird, same for Duration."* The preview bar
  ([`TokenComposer.tsx:197-231`](../../../packages/noodl-core-ui/src/components/token-composer/TokenComposer.tsx#L197-L231))
  is drawn for all five types. The per-type table `TYPES` (`:82-113`, interface `:67-80`) has one
  flag, `presetStrip`, and nothing for the bar. On a moving ball, Light/Dark changes the colour of
  the lane behind it and nothing else.
- **Finding 2.** *"When you have the modal for Easing … open, and the bottom edge is at the bottom
  edge of the editor window, then click 'Show CSS', it overflows the bottom Y and half cuts off the
  buttons and you can't scroll down."*
  - [`openTokenComposer.tsx:141-153`](../../../packages/noodl-editor/src/editor/src/views/panels/StylesPanel/composer/openTokenComposer.tsx#L141-L153)
    calls `showPopout` with `disableDynamicPositioning: true`.
  - In [`popuplayer.ts:950-955`](../../../packages/noodl-editor/src/editor/src/views/popuplayer.ts#L950-L955)
    the ResizeObserver then resizes the popout on every change but only **positions** it when that
    flag is off. It was clamped once, at open (`:974-975`).
  - Show CSS makes the content taller, the top stays put, and the bottom (with Apply) goes below
    the window. `.Root`'s `max-height: calc(100vh - 120px)` cannot help: it caps the height, not
    where the bottom lands.
  - When the cap *is* hit, the `<pre data-show-css>` (`TokenComposer.tsx:282-286`) is the last
    child of `.Scroll` and is never scrolled into view. The person presses Show CSS and sees
    nothing change.
  - `disableDynamicPositioning` is on for a reason (probably): re-centring on the anchor on every
    resize would make the popout jump while someone slides. Keep that; add a clamp.

## 3. What to build

1. A per-type flag on `TypeComposer` (for example `previewGround: boolean`). It is `false` for
   `animation-easing` and `animation-duration`, and those two draw **no** Light/Dark switch.
   *Hold to compare* still does something on motion: it plays the old curve or speed. Keep it for
   motion if it can sit in the motion preview itself (for example a *Compare* button beside the
   ball); drop the whole bar row if it cannot. The test is Richard's words: a row that looks like
   it does nothing is wrong.
2. **Clamp without re-centring.** When a popout opened with `disableDynamicPositioning` grows past
   the bottom of the window, move it up by the overflow and nothing else: no flip, no re-centre,
   no x change. Put it in `popuplayer.ts`'s ResizeObserver as a clamp-only branch, so every
   growing popout gets it, not just the composer. If the popout is taller than the window, its
   height is capped to the window and `.Scroll` scrolls.
3. **Show CSS shows the CSS.** On reveal, scroll the `<pre>` into view (`block: 'nearest'`), or
   render it directly above the footer, outside `.Scroll`, with its own max-height. Pick one, and
   write down in the task which and why. Either way the CSS is visible the moment it opens.

## 4. Acceptance criteria

1. Easing and duration composers draw no Light/Dark switch. Shadow, gradient and font composers
   are unchanged: a shot of each beside HEAD's.
2. **The drive Richard did:** open the easing composer from the *last* row of the Animation group
   with the Styles panel scrolled so that row sits at the bottom of the window. Press Show CSS.
   Measured by `getBoundingClientRect()`: the popout's bottom is ≤ `window.innerHeight`, Apply's
   rect is inside the window, and `document.elementFromPoint` at Apply's centre **is** Apply
   ([[a-rendered-surface-can-be-behind-a-blocker]]).
3. Same arm for the shadow composer with three layers (the tallest content), and with the editor
   window resized to 700px high.
4. After Show CSS, the `<pre>`'s rect is inside both the popout's scroll area and the window.
5. 🔴 **No jump while sliding:** drag a slider across its whole range with the popout mid-screen.
   The popout's top-left does not move (sample it per frame).
6. A spec on the clamp (unit, on the pure function that computes the new y), including *taller
   than the window* and *already inside*, where the answer is *don't move*.

## 5. Watch for

- Other `disableDynamicPositioning` callers get the clamp too. `grep` them and drive one
  (`ListValueEditor`, whose editor also grows).
- 🔴 [[cdp-click-hits-the-measuring-ghost-inside-a-modal]]: measure Apply with `elementFromPoint`,
  not by clicking it.
