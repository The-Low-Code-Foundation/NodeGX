---
id: P134-HTX001-PRINTERDECIDES
title: Four rendering decisions live in the React printer, not the plan, so the HTML printer copies or imports them, and the copies can drift
status: open
severity: low
area: export / the plan's edge (`packages/nodegx-export/src/emit/component.ts`: `TAGS` :297, `authoredTag` :256, `isTextArea`, `mountedCondOf` :5615, the Mounted-false removal; used by `src/emit/html/printComponent.ts`)
found: P134 HTX-001, 2026-11-03, writing the HTML printer for story-engine
evidence: dev-docs/tasks/phase-134-the-app-in-plain-files/README.md §10 HTX-001 and HTX-002; dev-docs/tasks/phase-134-the-app-in-plain-files/htx-001/
---

The third printer reads the plan, as Swift's does, and decides nothing the plan did not. Four decisions it needs are
not in the plan. They sit in the React printer, so the HTML printer had to take them from there:

1. **Which element a node draws** (`component.ts` `TAGS` and `authoredTag`): a Text is a `<p>` unless its Tag says
   otherwise, a Text Input of Type Text Area is a `<textarea>` (`isTextArea`, P18-S120-TEXTAREA). The HTML printer
   **imports** `authoredTag` and copies the four-row `TAGS` table and `isTextArea`. Swift has no tags, so this one is new.
2. **Mounted with no value yet** (`mountedCondOf`, P18 s126): a wire never delivers undefined, so while a Mounted
   source has no value the element keeps its authored Mounted (true by default). Copied. Missing it hid story-engine's
   Paster problem line, which the running app keeps (found by the side-by-side screenshot, fixed in the session).
3. **Authored Mounted false is not drawn** (the React removal; Swift copied it in S4). Copied.
4. **The page collapse's style merge**: already filed as P18-EXP022-S1-COLLAPSE; the HTML printer copies it too.

Nothing differs today: the HTML spec and the side-by-side screenshots agree with the running app on story-engine. The
risk is the next change to one of these rules landing in `component.ts` alone.

**HTX-002 (session 2, 2026-11-03) copied seven more**, the same ones Swift S2 copied (filed then as
P18-EXP022-S2-EMITDECIDES, low): which Functions keep a node (`keptNode`: pulsed, a host trait, or awaits);
`expandActions`' flattening (which runs are their own statement, which are inlined at their reads); a Function with no
Run read as the page draws is memoised (LIFTLOOP); `combinedLifted` (a lifted output that lands twice is one callback);
the Did Mount gate (a Did Mount under a Mounted a value decides is not a plain mount effect; the HTML printer names it
instead of gating it); the event table (`EVENT_ATTRS`, and a field's On Enter as its Enter key); the five sync-effect
bodies (checkbox, slider, dropdown, text field, Variable) and the Expression wrapper's load gate. Each is a few lines in
`src/emit/html/printComponent.ts`, each marked with the React rule it copies.

Two pieces did **not** have to be copied, because their cores are framework-free: the Function runner
(`functionRunLib.ts`) and the States machine with its run engine (`statesLib.ts`, `animateLib.ts`). The HTML export
carries them as the same source with the types taken out and the React hooks cut off (`tests/helpers/html-core-js.ts`;
a spec regenerates them and fails when they differ), so they cannot drift.

**HTX-002 session 3 (2026-11-03) copied a twelfth:** where a Function's late write lands (EXP-019 session 133,
`component.ts` "`<name>Node.late`"): the row and the pulse arms its run is printed with, the first the plan holds. The
plan marks the body (`JsFunctionPlan.late`) but not where its late writes go, so both printers search their actions for
it. The persisted store's library was not copied: `lib/persistStore.js` is `persistStoreLibSource()` with its types out,
made again by the spec.

**HTX-003 session 4 (2026-11-03) copied eight more**, each marked in `printComponent.ts`: `fieldWriteCode` (a Set behind
the focus test, a Clear, then the field's change chain with its text), the field refs and the Cleared mark with its reset,
the controlled change chain's order (the row, then `changeHandlers`, then the field's Changed), P18-S116-FIELDMOUNT's
mount announcement and its gates, the Did Mount gate's rule (`mountChains`: the element and every element above it
whose Mounted a value decides), `renderRepeater`'s row mapping (template inputs, row props, the fields no authored row
carries) and its Static Data key (`id` when every row has a unique one), and `contentAttrs` for a field and a button
(`defaultValue`, `maxLength`, `inputMode`, `enterKeyHint`, Enabled as `disabled`). Twenty in all. The field write is the
largest: some forty lines that must keep React's every branch.

**HTX-003 session 5 (2026-11-04) copied four more**, for the Checkbox (`drawCheckbox` in `printComponent.ts`): the
element (`renderNode`'s `role === 'checkbox'`: an `<input type="checkbox">` with the node's class, inside a `<label>`
with the label text after it when Use Label is on, the label's default "Label"), the companion class's name
(`<class>Label`, deduplicated, as `component.ts` "Companion classes" names it), the controlled change chain for a box
(`changeAttrs`: the row from the box's `checked`, then `changeHandlers`, then its Changed; React's `control-event`), and
the uncontrolled box's typed-in Checked (`defaultChecked`). Twenty-four in all.

**HTX-004 session 6 (2026-11-04) copied eight more and imported four**, for the backend. Copied, each marked in
`printComponent.ts`: the record and user verbs' `try`/`catch` (`api-call`: the Id read once, the `Missing Record Id`
throw, the relation guards, the record local, the Error row, the raise, the Failure chain), the Cloud Function's
(`cloud-call`: the answer merged over the results row), a Fetch's call (`query-fetch`), the query's mount ask and its
place after the drawing, a query row's fields (`id` and the collection's declared columns, `renderRepeater`), its key
(`id`), an awaiting run's split at `awaitsAt` (`jsfun-run`), and `detached` (any awaited step a later wire follows runs
in its own async body). Imported, made `export` in `component.ts` (React's output unchanged): `API_CALL_ERROR_CODES`,
`queryHasEffect`, `queryParamsLiteral`, `wiredWhereExpr`. Thirty-two copied in all. The Function file's `Noodl`
(the client's, with each named Variable over the app's) is the React wrapper's too.

**What a fix needs:** the plan carries each answer as data (`tagOf[nodeId]`, a `mountedKeeps` flag beside the Mounted
binding, the merged page declarations, the removed ids), and the three printers read it. AC4's ledger (HTX-005) is
where a drift would show.
