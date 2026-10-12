<!-- Round 4 (P107 s49, 2026-10-06, NSP-023 step 8). Written by the stranger agent; its harness refused the file write, so the parent session saved this text verbatim from the agent's refused Write call. -->

# Stranger round 4 — the Dropdown (`net.noodl.controls.options`) on a plain DOM page

## 1. Ambiguities

1. **What a value input with NO reducer sends.** spec.ts (rule 4) says "a value input MAY [have a reducer] (the default is 'store it')", and `Patch.send` says "Absent means all of them". A store with no reducer has no patch, so I could not tell whether it sends every output, as "absent" would, or none. I guessed "all". The 200-sequence suite could not tell the difference. The deep run corrected me: a plain store sends **nothing**. The case was `[{set: scrollIntoViewAlign}, {set: value /*undefined*/}, settle]`, where my target sent Value `'Option 1'` and the reference sent nothing.
2. **"MOUNT IS NOT A SAMPLE"** (adapter.ts, settle). I could not tell whether this covers the params' writes at mount or only the initial state. The example ("Boolean To String handed `falseString: undefined` before its first settle") does not say whether "handed" means a param or a step. I first guessed (correctly) that param writes are samples. Then the first deep divergence (`params {variant: ''}`, steps `[{set: value}, settle]`) could be explained by either #1 or this rule, and I fixed the wrong one: I made the mount sample nothing. The second deep run corrected that: `params {value: 0}`, then Value set to undefined, must send `'0'`. So the param writes ARE samples and only the initial state is not. One sentence in the contract would have saved two deep runs.
3. **What the `<select>` selects (a state of the PAGE).** dropdown.ts describes the selection in browser words. "A fresh element selects the hidden empty option (:217)" and "an option that leaves the list hands the selection to the first enabled option (HTML's reset)". I could not turn these into DOM without guessing:
   - HTML's reset never selects a *disabled* option. So a fresh `<select>` whose first option is `<option value="" disabled hidden>` selects the first enabled item, not the hidden one, unless that option carries `selected`. The spec does not say which element or attribute makes it win.
   - Whether the browser's reset gives the right answer depends on *how* the options are replaced when Items changes: reused by position, replaced wholesale, or matched by value. The spec does not say. With remove-all-then-append, a selection the spec keeps (Value off-list, `domSelected` `'c'`, the same list written again) would jump to the first enabled option.

   So I compute the selection with the spec's own rule (`painted`: fresh / in list / left the list) from the element's current `select.value`, rebuild the options, and assign `select.value` myself. That copies a rule the brief calls the browser's. The suite cannot tell, so it did not correct me.
4. **When the node is placed.** spec.ts `WorldHandlers.place` says the placing happens "once, at mount, AFTER the params" and that "its patch lands in the first settle". adapter.ts `mount` says only "does NOT settle". I placed (first paint, Did Mount, the element drawn disabled or hidden) inside `mount()`. Scenario "placed disabled: a Focus before the first frame is Done and takes nothing" confirms it.
5. **Which DOM event carries each act's answer.** The spec states its conditions in node terms (`pageEnabled`, `reaches`), and the page header says which events still reach a disabled control. Matching the two was mine to work out:
   - press and release must answer `mousedown` / `mouseup`, not `pointerdown` / `pointerup`, because those still reach a disabled control and the spec's press takes nothing there.
   - touch and lift answer `touchstart` / `touchend`, because the spec's touch lands on a disabled control.
   - Focused comes from the `focus` event that the page's default action raises after `mousedown`. That is how the spec's `pressed()` order (Pointer Down, then Focused) comes out.

   Nothing in the spec names these events. I got them right first time, but only by reading the page's code.
6. **The Focus and Blur actions do not paint, while acts paint first.** This is visible only in the reducers' code (`focus` reads `s.onPage` and `s.pageEnabled` directly; acts go through `onPainted`). The prose says nothing. I made the actions call the element's own `focus()` / `blur()` on the page as last painted, so jsdom's focusing steps decide. The spec's "a disabled element gives the keyboard up to nobody" then depends on jsdom's `blur()` being a no-op on a disabled control. The page header asserts this; I did not check it.
7. **Visibility.** The page's hit test and its focus patch read *computed* `visibility`. I did not know whether jsdom inherits it from the root, so I set `visibility: hidden` on both the root and the `<select>` rather than find out.
8. **Enable Label, Label and Placeholder are drawn but have no state.** The `useLabel` reducer returns `NOTHING`, so the node's state never holds it, and Label and Placeholder have no reducer. A target that draws the label has to keep the raw input values itself. The spec's state alone cannot draw the page it describes.
9. **Data Attributes.** I took the derived ports to be fixed at mount from the params (`derived.inputs(params)`, no `discover`), each written on the root as an attribute. Nothing on the wire grades this.
10. **The world.** The spec needs only `person`, but `install` is required ("a target without `install` cannot play a spec that declares `needs`"). It is a no-op here, and `advance` only records the event and moves the world's clock.
11. **A breach in my reading of text-input.ts.** To read the two allowed functions I printed lines 880–904. Lines 880–895 belong to another node's spec: the tail of an act helper (`drained(p)`, `early`, `join(early, then(after(p, d)))`) and a `join` that carries `outcomes`. I did not use them; the breach is reported here.

## 2. Files opened (in order)

1. `src/spec.ts` (whole, in two reads)
2. `src/coerce.ts`
3. `src/canonical.ts`
4. `src/trace.ts`
5. `src/adapter.ts`
6. `scenarios/README.md`
7. `src/index.ts`
8. `src/runner/index.ts`
9. `schema/trace.schema.json` (its first 3000 bytes only)
10. `src/world.ts`: an outline of its `export` / docblock lines, then the header (lines 1–560), then the `World` class (2394–2470) and a grep for the `Clock` method names
11. `src/nodes/dropdown.ts` (whole)
12. `src/nodes/text-input.ts`: a grep for the two names, then lines 880–904 (the breach in §1.11)
13. `scenarios/net.noodl.controls.options.json`: read through a one-off `node -e` that printed each scenario's name, keys, params and steps (truncated)
14. `tests/stranger-page.js`
15. `tests/stranger.test.ts`
16. `tests/stranger-suite-hashes.helper.js`
17. `src/nodes/index.ts` (a grep for `dropdown` / `options` only)

Nothing else was opened apart from my own files and the jest output files in the scratchpad.

## 3. Iterations

Eight jest runs in all. The default budget was green on the **first** run; going green at the deep budget took seven.

1. narrowed: green
2. whole file: green
3. deep: 2 divergences. `params {variant: ''}` / `{zIndex: ''}`, steps `[{set: value}, settle]`: the reference had `didMount` where mine had `value 'Option 1'` (a plain store sampling every output; §1.1)
4. narrowed: green (after the wrong fix: the mount sampled nothing)
5. deep: 3 divergences. `[{set: scrollIntoViewAlign}, {set: value}, settle]`: mine still sent `value 'Option 1'`. `params {value: 0}`, `[{set: value}, settle]`: the reference had `value '0'` where mine had `didMount` (§1.2)
6. narrowed: green
7. deep: green
8. whole file: green

## 4. Readings

Default budget, narrowed (`NSP_ONLY=net.noodl.controls.options`, final target, run 6):

    net.noodl.controls.options v4 on stranger-4 (plain DOM): CONFORMS (9028 ms, seed 20732)
      scenarios: 62 / 62 passed
      generated: 200 / 200 ran, 0 divergence(s)
      mutants: 385 / 387 killed
    net.noodl.controls.options: 386 / 386 mutants caught by the stranger's target
    Tests:       1 skipped, 12 passed, 13 total

Whole file, final target (run 8):

    Counter v1 on stranger: CONFORMS (51 ms, seed 20732)                 mutants: 23 / 23 killed
    Switch v1 on stranger: CONFORMS (45 ms, seed 20732)                  mutants: 26 / 26 killed
    And v1 on stranger: CONFORMS (45 ms, seed 20732)                     mutants: 4 / 4 killed
    Condition v1 on stranger: CONFORMS (39 ms, seed 20732)               mutants: 16 / 16 killed
    String Format v1 on stranger: CONFORMS (34 ms, seed 20732)           mutants: 2 / 2 killed
    Counter v1 on stranger-2: CONFORMS (37 ms, seed 20732)               mutants: 23 / 23 killed
    Switch v1 on stranger-2: CONFORMS (36 ms, seed 20732)                mutants: 26 / 26 killed
    And v1 on stranger-2: CONFORMS (36 ms, seed 20732)                   mutants: 4 / 4 killed
    Condition v1 on stranger-2: CONFORMS (34 ms, seed 20732)             mutants: 16 / 16 killed
    String Format v1 on stranger-2: CONFORMS (30 ms, seed 20732)         mutants: 2 / 2 killed
    Inverter v1 on stranger-2: CONFORMS (25 ms, seed 20732)              mutants: 1 / 1 killed
    Boolean To String v2 on stranger-2: CONFORMS (37 ms, seed 20732)     mutants: 10 / 10 killed
    Timer v1 on stranger-3: CONFORMS (47 ms, seed 20732)                 mutants: 32 / 32 killed
    Repeat v1 on stranger-3: CONFORMS (41 ms, seed 20732)                mutants: 21 / 21 killed
    net.noodl.animatetovalue v3 on stranger-3: CONFORMS (58 ms, seed 20732)  mutants: 25 / 25 killed
    net.noodl.UUID v1 on stranger-3: CONFORMS (41 ms, seed 20732)        mutants: 2 / 2 killed
    Screen Resolution v1 on stranger-3: CONFORMS (30 ms, seed 20732)     mutants: 1 / 1 killed
    net.noodl.controls.options v4 on stranger-4 (plain DOM): CONFORMS (8768 ms, seed 20732)  mutants: 385 / 387 killed
    (caught lines) Counter 23/23, Switch 26/26, And 4/4, Condition 16/16, String Format 2/2 (round 1);
      Counter 23/23, Switch 26/26, And 4/4, Condition 16/16, String Format 2/2, Inverter 1/1, Boolean To String 10/10 (round 2);
      Timer 32/32, Repeat 21/21, net.noodl.animatetovalue 25/25, net.noodl.UUID 2/2, Screen Resolution 1/1 (round 3);
    net.noodl.controls.options: 386 / 386 mutants caught by the stranger's target
    Tests:       35 skipped, 46 passed, 81 total

(The first whole-file run, on the pre-fix target, gave the same lines and `Tests: 35 skipped, 46 passed, 81 total`.)

Deep (`NSP_DEEP=10000 NSP_ONLY=net.noodl.controls.options … -t deep`, final target, run 7):

    net.noodl.controls.options v4 on stranger-4 (plain DOM): CONFORMS (76510 ms, seed 20732)
      scenarios: 62 / 62 passed
      generated: 10000 / 10000 ran, 0 divergence(s)
      mutants: 385 / 390 killed
        equivalent ×1: a placing on a node placed off the page: its set holds only the page syncs, which nothing reads before the frame end repaints them
        equivalent ×1: a hover, leave, touch or lift on a node off the page: its set holds only the page syncs, which nothing reads before the frame end repaints them   (×4 lines)
    Tests:       12 skipped, 1 passed, 13 total

(`-t deep` skips the AC2 test, so the deep run prints no "mutants caught" line.)

## 5. Time

Start: Tue Oct 6 11:51:50 CEST 2026. End: Tue Oct 6 12:16:28 CEST 2026 (about 25 minutes, including about 9 minutes of jest).

## 6. What I would change

- **adapter.ts, sampling:** say "a value input with no reducer sends nothing", and "MOUNT IS NOT A SAMPLE means the initial state; each param's write at mount is a sample like any `set`". Both rules show only past 200 sequences, so add a hand scenario for each: a param Value followed by Value undefined before the first settle, and a look-port write followed by Value undefined.
- **dropdown.ts, the selection:** give the page model as a DOM procedure, not browser prose. For example: "the target writes the selection itself: `select.value = domSelected` after the paint", or "the hidden option carries `selected`; options are replaced by value, keeping the element of any value still offered". Either is something a target can draw without a guess.
- **dropdown.ts, the acts:** add one line per act naming the DOM event its answer comes from on the runtime's component (press is `mousedown`, not `pointerdown`; touch is `touchstart`; Focused is the element's `focus` event). Also add a sentence that the Focus and Blur *actions* act on the page as last painted, while a person's act paints first.
- **dropdown.ts, the drawn-only inputs:** say that Enable Label, Label and Placeholder are read from the raw inputs at the paint. The state has no key for them.
- **The two helpers:** move `dataAttributeNames` / `dataAttributeInput` into a small shared module (or copy them into the spec). Reading them from text-input.ts can't be done without seeing another node's code.

## 7. Design of my target

- **Files.** `target.js` is the adapter engine: the trace, per-step output sampling, the canonical grouping at settle, and mount, set, signal, act, settle and dispose. `dropdown.js` is the node, `options.js` reads Items into options, and `canonical.js` puts values on the trace.
- **What is drawn.** The node draws `<div root>[<label>]<div wrap><select opacity:0><option hidden disabled value="">…items</select><span/></div></div>` into `page.document.body`. It writes the page only in `paint()`: at placement, at every settle (the frame end) and before every act. A paint mounts or unmounts the root (Did Mount / Will Unmount), sets `disabled` and `visibility`, rebuilds the options and assigns the selection.
- **Node versus page.** The node keeps only what the node knows (Enabled, Mounted, Visible, Value, Items, the reported Hover / Pressed / Focused). What the page knows is read back from the DOM: whether the element is on the page, disabled, hidden, focused, and what it selects.
- **How a person's act reaches the outputs.** It goes only through listeners on the `<select>` (`mouseover`, `mouseout`, `mousedown`, `mouseup`, `touchstart`, `touchend`, `focus`, `blur`, `change`). Each listener updates the node, marks the outputs it sends and pulses its signal. The Focus and Blur actions call the element's own `focus()` / `blur()`, so the same listeners answer them.
