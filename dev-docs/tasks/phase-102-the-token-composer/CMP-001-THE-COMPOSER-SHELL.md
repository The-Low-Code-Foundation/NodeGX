# CMP-001 — The composer shell

**Opened 2026-09-24.** **Status: ✅ BUILT s1 (2026-09-24), driven 23/23 arms (`scripts/devtools/drive-cmp001-composer.js`, shots in `shots/`): AC1 five gradients paint (control: the spec's 4 unresolved swatches), AC2 `elementFromPoint` on Apply, AC3 one undo step, AC4/AC7 Cancel leaves no draft element and the token file's mtime unchanged, AC5/AC8 text mode + *Replace with a preset*, AC9–AC11 as specs. Codec contract in `nodegx-project-contract/token-codecs/`; frame in `noodl-core-ui/token-composer/`; host `StylesPanel/composer/openTokenComposer.tsx`. Richard's look (CMP-007) left.** Rulings: RC-3, RC-4, RC-7 (README §4).

## 1. The person sentence

> **Someone clicks a shadow, gradient, easing, duration or font row in Styles and a panel opens
> beside it with a big live preview, a row of starting points, and Apply — and the row itself
> already told them, in words, what the value is. As they slide, their own cards on the canvas
> change.**

## 2. What to build

**The frame** (every composer lives inside it; mockup: *Gradient composer* board):

- Header: the token name, a type chip (*Gradient*, *Shadow*, …), and a one-line summary in words.
- **Preview**: large, drawn on a sample that suits the type (a card for shadows, a hero block for
  gradients, a ball for motion, a paragraph for fonts), with every `var()` resolved (§3). Two
  small controls on it: a **Light / Dark** ground toggle (a shadow on a dark ground is the first
  *"I moved it and nothing happened"*; two shipped templates set every shadow to `none` because
  their ground is ink), and **Hold to compare** (press and hold to see the saved value; release to
  see the draft).
- **Start from**: preset tiles, each drawn with its own value. Picking one writes that value into
  the draft (README §6.5). The tile whose value matches the draft is lit; once a control moves it
  reads *Lifted, changed*, so the person knows where they started.
- The type's own controls (CMP-002…005 supply them). Every slider's number is **typeable**: click
  it to type. Beginners slide, everyone else types.
- Footer: **Show CSS** (the exact string that will be saved, read-only), **Reset to default**
  (`deleteCustomToken`), **Cancel**, **Apply** (`setToken(name, value, { undo: true })`: one step).

**The canvas shows the draft (RC-7).** On every change to the draft, write one style element
`<style id="noodl-design-tokens-draft">:root{--name: <draft>}</style>` into each preview webview
*after* `PreviewTokenInjector`'s element, through the same `executeJavaScript` path, so it wins
the cascade. Apply removes it and calls `setToken` (the injector then re-injects the real value).
Cancel, Escape and closing the popout remove it. 🔴 Nothing before Apply may touch the model, the
file or undo (README §6.9). Throttle to one write per animation frame; a slider must not queue a
hundred `executeJavaScript` calls. The draft element must also be removed if the popout is torn
down by a project close, or the next project's preview inherits a stray variable.

**The door out of text mode.** When `decode` is `null` the composer shows the sentence, Show CSS,
the text box, and one button: **Replace with a preset**. Pressing it starts a fresh draft from the
type's first preset and draws the visual controls; the text value is gone only when the person
presses Apply, and Cancel gets it back. Without this, anyone upgrading with a hand-written value
lives in text mode forever and never meets the composer. This is a rewrite the person chose, on a
button that says so (README §6.8).

**Opening it.** From the row's preview square and from a pencil button on the row, as a popout to
the right of the Styles panel. Copy `openListValueEditor()`'s mount: `createRoot` + **`flushSync`**
before `showPopout`, or it measures 0×0 and opens off-screen (FH-005).

**The codec contract** (one per type, in a place `noodl-mcp` and the tests can import without the
editor):

```ts
interface TokenCodec<M> {
  decode(value: string): M | null;      // null = "I can't read this exactly"
  encode(model: M): string;
  describe(model: M): string;           // the row's words
  presets: { name: string; value: string }[];
}
```

`decode` returns `null` unless `encode(decode(v)) === v`. A `null` opens the composer with
**Show CSS** open and a sentence (*"This value uses CSS the composer can't show yet. You can still
edit it as text, or start again from a preset."*); the visual controls are not drawn.

**Kept literals (RC-6).** Every model type has a place for a value the codec read but cannot offer
in a control: a colour that is not black, white, clear or a `var()` is stored as
`{ kind: 'literal', css: '#7c3aed' }` and encoded back verbatim. The colour chip reads *Custom*
and cannot be re-picked in this phase; every other control on that layer or stop works. The
codec refuses (`null`) only on **shape** it cannot read. CMP-006 counts *visual via a kept
literal* as its own column, so the number of people relying on this path is known.

🔴 **The codec package must not import the editor.** `noodl-mcp`'s `validate_project` (CMP-009) and
the census both import it under plain Node. A top-level import of anything that reaches
`projectmodel` switches sibling suites off with `Tests: 0`
([[an-import-added-for-a-feature-can-switch-a-sibling-gate-off]]).

**The row (RC-3).** For the four composer types, the text box is replaced by the words from
`describe()` and the real preview. When `decode` is `null`, the row keeps the text box.

## 3. Previews resolve (the blank-gradient defect)

Four default gradients draw a blank preview today (README §2). Resolve **every** `var(--x)` inside
a value against the project's tokens before painting it, recursively and with a depth limit (a
token can refer to a token). `TokenResolver` only handles a whole-value `var()`. Extend it, or add
a `resolveInline()` beside it, and give it its own spec: a `var()` inside a gradient, a nested one, a
cycle, and a missing name.

## 4. Acceptance criteria

1. **The preview defect is fixed and seen.** A shot of *Effects* on a fresh project: all five
   gradient previews draw, taken beside a control shot of HEAD with four blank ones.
2. The popout opens beside the row, fully on screen, at the Styles panel's minimum and default
   widths (a drive, with `elementFromPoint` on Apply, not a DOM query:
   [[a-rendered-surface-can-be-behind-a-blocker]]).
3. **Apply is one undo step**: slide a control ten times, Apply, ⌘Z. The value is back where it
   started in one press.
4. **Cancel and Escape save nothing**: the token's value and the undo stack are byte-identical before
   and after.
5. **A value `decode` refuses** opens in text mode with the sentence, and saving it through the text
   box works exactly as today's row does.
6. The FIX-015 gate is updated for the new row shape with the reason written beside it, and still
   reddens when a text-mode row's edit is not saved.
7. **The canvas follows the slider (RC-7).** On a drive: open `--shadow-md` on a project whose
   card wears it, slide Softness, and **before Apply** read the card's computed `box-shadow` in
   the preview webview: it is the draft. Cancel: it is the saved value again, and the draft style
   element is gone from the webview's `<head>` (query for its id, expect none). The token file's
   mtime and the undo stack are unchanged throughout ([[test-results-json-is-the-readout-not-the-log]]:
   mtime is the honest field).
8. **Replace with a preset** on a text-mode value draws the visual controls; Cancel restores the
   text value byte-identical; Apply writes the preset's string as one undo step.
9. The **Light / Dark** toggle changes the preview ground only: the draft string in Show CSS is
   byte-identical before and after (a ground is not a value).
10. **Hold to compare** paints the saved value while held and the draft on release (two shots).
11. A kept literal (RC-6) survives open → Apply with no other change **byte-identical**, and the
    chip reads *Custom* (a spec on the codec, and one shot).

## 5. Notes

- The Styles panel is on the **left** now (P101 moved Properties right), so a popout to the right
  opens over the canvas. That is intended, and it is the same as the list editor. ⚠️ With RC-7 the
  canvas *is* the preview, so the popout must not cover the whole of it: keep it to the panel's
  width or less, hugging the panel's edge, and check on the default window size that at least half
  the canvas stays visible beside it.
- Keep all of the frame in `noodl-core-ui` (the JSON composer is there) so CMP-008's *Make this a
  token* and P103's pencil can open it from a node's properties without moving it.
