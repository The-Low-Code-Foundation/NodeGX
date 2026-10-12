# Under the Lid — the second prototype

A NodeGX-style site (a potter's one-page site: hero, carousel, contact form) shown as **three layers in 3D**: the
blueprint (the project as JSON), the engine (one JavaScript object per node, with the wires between them), and the page
(the HTML the visual nodes keep up to date). The layers can be lifted apart, faced, and run live, in slow motion or step
by step, with every step narrated; a journey follows one Counter from the editor to the screen; the inspector shows a
node in the JSON, in memory, on the page and in its spec, and runs a small conformance check with a bug you can plant.
Built by Claude Code with Richard on 2026-10-03, published as the claude.ai artifact `9tAKJ2QcxSqPJadkj7ssfR`
("Under the Lid"); `under-the-lid.html` is that artifact's version of 2026-10-03 21:22, byte for byte.

Richard, 2026-10-03: *"much better than the first prototype in this phase folder."* It is evidence, not a product; its
job in this phase is the same as Orbit's: every row of [NEEDS.md](../NEEDS.md) §2 is something it had to invent or copy.

## Open it

`open under-the-lid.html`. No build: everything is inline (the fonts load from Google Fonts). No WebGL: the 3D is CSS
`perspective`, so it runs anywhere.

## What it is made of

One file, 2,513 lines. The sections, by the comment banners in the script:

| lines | section | what it invents or copies |
|---|---|---|
| 594-671 | the project, in the **deployed** shape (`sourceId` / `sourcePort`) | NEEDS row 24: the runtime's shape, not the editor's v2 files |
| 673-693 | labels, port names, type names, which ports are signals | rows 25-28, all hand-typed |
| 696-747 | the world and the tape (every step the engine takes) | row 29 |
| 748-911 | the engine: `Inst`, with `CounterCore` ported from the Counter spec | rows 30, 31 |
| 913-1136 | the node library: 14 types as `set` / `sig` handlers with narration | row 32 |
| 780-789 | parameter → CSS for the visual nodes | row 33 |
| 1659-1672 | which nodes have a spec, hand-typed | row 35 |
| 1750-1815 | the Counter scenarios (six, transcribed) and a small runner | rows 36, 37 |
| 1816-1821 | the P107 progress table, hand-typed and already stale | row 38 |
| explainer | how the runtime boots, from reading `noodl-runtime` and `noodl-viewer-react` | row 39 |

What it is right about, and what the kit must keep: *"JSON never turns into HTML. JSON turns into JavaScript objects.
Some of those objects then keep a piece of HTML up to date, for as long as the page is open."* That sentence belongs in
the brief (OWN-007).

What it is wrong about, by the day after: the progress numbers (row 38). A page that types them is stale within a day;
the kit has to serve them (NEEDS §3, the conformance ledger).
