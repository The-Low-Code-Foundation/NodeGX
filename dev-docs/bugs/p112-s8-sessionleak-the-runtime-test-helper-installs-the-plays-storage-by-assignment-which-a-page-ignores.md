---
id: P112-S8-SESSIONLEAK
title: "The runtime test helper installs the play's session storage by assigning `globalThis.localStorage` — a page's window ignores the assignment, so every play read the person the previous play signed in"
status: fixed
severity: low
area: runtime test helper (`packages/noodl-runtime/test/helpers/node-spec-target.ts` `installUser`), the reference every graph target is graded against
kit: preview
found: P112 OWN-003 s8, 2026-10-11 — the helper bundled for a page (`noodl-preview/dist/browser/noodl-graph-target.js`) on the 85 graph scenarios in headless Chrome: five of `s10-the-session-moves` and `s11-the-owner-is-who-logged-in` red (a User read `bea@example.com` where the Node recording reads `ann@example.com`; a create carried the previous play's ACL), 80 green
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-003-ONE-WAY-TO-RUN-A-GRAPH.md §6 (steps 2–3, run 2 of the check)
regression: packages/noodl-preview/scripts/graph-target-check.mjs (`npm --prefix packages/noodl-preview run graph-target-check`; red at 80 / 85 with the assignment put back)
commit: (this session)
fixed: P112 OWN-003 s8, 2026-10-11 — installed by descriptor, as `installWorld` installs every other global: an own data property shadows the window's accessor, and the saved descriptor puts it back
---

`installUser` gave every backend play a storage of its own with `g.localStorage = storage` and undid it with `g.localStorage =
saved`. In Node, where the global does not exist, the assignment creates it and the undo deletes it. In a page `localStorage` is
an accessor property of the window with a getter and no setter: the assignment does nothing and throws nothing (the bundle is
not strict at that site), so the real `SessionStore` read "whatever `localStorage` is now" — the page's own, which outlives a play.
The first play of `s10` logged `bea` in; the four plays after it, each scripted to start with `ann` signed in, started with
`bea`, and `s11`'s "nobody logged in" create carried `u2`'s ACL.

Not a product defect: no app runs this code. It is the reference's own portability, which matters the day the reference is
what a home-made editor runs in a page (OWN-003 R1). The fix is the technique `installWorld` already uses for `setTimeout`,
`fetch` and the rest: `Object.defineProperty(g, 'localStorage', { value, configurable: true, writable: true })`, restored from
the saved descriptor.

**Plain words:** *"The test rig that stands in for the browser's storage was being put in place in a way that works in Node and
is silently ignored by a real browser. In a browser the rig now shadows the real storage, the same way it already shadows the
clock and the network."*

Related memory: [[a-global-assigned-in-node-is-a-getter-only-property-in-a-page]].
