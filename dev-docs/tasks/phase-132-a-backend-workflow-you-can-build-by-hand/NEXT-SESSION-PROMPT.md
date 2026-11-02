# P132 — next session

**BWF-001 is built** (s1, 2026-11-02: nodegx-studio `1cc7aa5`, NodeGX `f14e46fe8`; its
[s1 log](BWF-001-WHAT-RICHARD-MET-FIXED.md#s1-2026-11-02-built-all-but-ac1s-app-gate-and-ac7) has each AC). What is
left of it is Richard's:

1. **Ask Richard to re-walk points 1–4 (AC7)** in Studio from the checkout on a copy of Greenhouse. Point 1
   (P132-STEPPANEL) did **not** reproduce in the Electron app on any path tried, and his own file shows the panel
   opened for him once (*Add on Yes*). If a click still opens nothing for him, get the steps he took, measure that
   state, then write the app gate AC1 asks for. Do not invent a cause before that.
2. Then **take BWF-002** ([task](BWF-002-RUN-IT-ON-SAMPLE-DATA.md)): run it on sample data, each step's in and out.

Before anything: `git status` in both repos (NodeGX `cline-dev`, `../nodegx-studio`). Studio's `editor/studio.html`
is the file every Studio session edits; an uncommitted change in it is someone's live work.

**How s1 drove the app** (reuse it): a copy of Greenhouse with `metadata.cloudservices` deleted, given its own
backend with `NODEGX_BACKENDS_DIR=<scratch>/backends node -e 'import("./lib/backend.mjs").then(m=>m.attachNewBackend(dir))'`
run from the Studio checkout, then Electron started as `app/check.mjs` starts it (`--hidden`,
`--remote-debugging-port`, `NODEGX_STUDIO_USER_DATA` of its own) and driven with `editor/cdp.mjs`. 🔴 Two copies of
Greenhouse share one project id, so the second copy REUSES the first copy's backend (`findReusableBackend`): give each
copy its own backends dir, or expect "the backend's copy differs".

Open from s1, not blocking: the backend's warnings reach Studio's screen only with a backend release carrying
`f14e46fe8` (Studio runs the kit's backend); the list still shows triggers as rows of their own (BWF-001 item 8's fold
not done); TriggerTest's three ports crowd the column gap at 71 %; check:hosted's "Delete type" line went red once and
green on rerun.

Studio gates before you commit: `npm run check:automations`, `check:hosted`, `check:editor`, `check:app` (screen
unlocked), one at a time.
