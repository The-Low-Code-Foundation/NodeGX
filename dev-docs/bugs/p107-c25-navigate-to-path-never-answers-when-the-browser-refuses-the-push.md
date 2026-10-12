---
id: P107-C25
title: Navigate To Path never answers a press when the browser refuses the push (a Path on another origin with the Path URL type)
status: fixed
commit: 30b54e988
phase: P109
task: ISL-028
severity: medium
area: runtime / Navigate To Path (viewer)
found: P107 NSP-015 s17, 2026-10-01
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/PageStackNavigateToPath.json "C25 — the path type with a Path on another origin: the push is made, the browser refuses it, Failure navigate-to-path/refused" (no longer a known row)
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-015-BATCH-NAVIGATION-AND-COMPONENTS.md §6.1c, §6.2
---

With the project's URL Path Type set to Path, give Navigate To Path a Path on another site —
`https://other.example/x`, or `//other.example/x` — and press Navigate: the browser refuses the
`history.pushState` with a SecurityError (a page may only push URLs on its own origin), the router is
never told, and the node says nothing — no Done, no Failure, no Error. Every press in that frame is lost.
With the default Hash type the same Path is pushed after a `#` (same origin) and is Done.

Where: `navigate-to-path.ts` :218 `window.history.pushState({}, '', compiledUrl)` throws inside the
frame-end callback; the tokens were drained at :147-148, the scheduler logs the throw
(nodecontext.ts :466-472) and nothing reports them. `dispatchEvent(popstate)` at :219 never runs.

Reproduce: `packages/nodegx-node-spec/scenarios/PageStackNavigateToPath.json`, "C25 — the path type
with a Path on another origin …" (row C25). The world (`world.ts` LOCATION) refuses a cross-origin push
the way a browser does.

Proposed: catch the refusal — Failure `navigate-to-path/refused`, Error "The browser refused to
navigate to this path" (what the spec says). Alternatively open another origin's address with
`window.location` / External Link semantics — a product choice, which is why this is a ruling.

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Report a clear failure".** The press fires Failure with the error "The browser refused to navigate to this path", so the author's failure branch runs and they can see why. One small change in one place; to open another website they use External Link. The question as asked: *"When the browser refuses an address on another website, should the node report a failure or open that website?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Fixed 30b54e988 (P109 ISL-028, 2026-10-06), as ruled.**
