---
id: P134-HTX001-PRINTERDECIDES
title: Four rendering decisions live in the React printer, not the plan, so the HTML printer copies or imports them, and the copies can drift
status: open
severity: low
area: export / the plan's edge (`packages/nodegx-export/src/emit/component.ts`: `TAGS` :297, `authoredTag` :256, `isTextArea`, `mountedCondOf` :5615, the Mounted-false removal; used by `src/emit/html/printComponent.ts`)
found: P134 HTX-001, 2026-11-03, writing the HTML printer for story-engine
evidence: dev-docs/tasks/phase-134-the-app-in-plain-files/README.md §10 HTX-001; dev-docs/tasks/phase-134-the-app-in-plain-files/htx-001/
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

**What a fix needs:** the plan carries each answer as data (`tagOf[nodeId]`, a `mountedKeeps` flag beside the Mounted
binding, the merged page declarations, the removed ids), and the three printers read it. AC4's ledger (HTX-005) is
where a drift would show.
