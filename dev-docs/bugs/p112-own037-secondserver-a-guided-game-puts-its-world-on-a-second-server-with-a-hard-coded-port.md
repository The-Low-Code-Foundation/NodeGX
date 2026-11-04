---
id: P112-OWN037-SECONDSERVER
title: "A game built with the guides can put its plain-code world on a second server, and the NodeGX app reaches it through a hard-coded port: the app works only while that server runs, and nothing deploys it"
status: open
phase: P112
task: OWN-037
severity: medium
area: packages/create-nodegx/profiles/core/skills/nodegx-making-a-game/SKILL.md ("Make the first version one page"), and the game exception in both folder notes (create-nodegx.js AGENT_NOTE, profiles/vibe/AGENTS.md)
found: P112 OWN-037 AC3, 2026-11-04 (arm vb, Mistral Vibe 3.0.4 + Large 4, the guided Vibe kit)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/own-037/RESULTS.md (Turn 2, vb); /Users/Shared/nodegx-lab/own037/game-vb/work/apps/deep-glow/components/Pages/Play/nodes.json:119
kit: create-nodegx
---

The folder note tells an agent that a game's moving world is plain code, and the game guide says to make the first
version "one page, with no framework and no build step". Neither says where that page lives in relation to the NodeGX
project it was asked to build.

Arm vb (the guides in Vibe) answered that by itself: a NodeGX app with two pages (Home → Play) whose Play page runs
a Function `Outputs.url = 'http://' + window.location.hostname + ':8576/game/';`. The game is `game/index.html`,
served by `python3 -m http.server 8576` from the project root. The app opens it in the same tab. So:

- the app works only while a second server it doesn't start is running, on a port written into the graph;
- `nodegx deploy` publishes the NodeGX app and not `game/`, so a deployed copy opens a dead link;
- the best score lives on the game's origin, not the app's, which the agent noted itself.

The other guided arm (cb, Cline + DeepSeek) built one plain page with no NodeGX project at all. So did OWN-036's
kept Claude game (arm d, "Glimmerdeep": `index.html` + `game.js`/`draw.js`/`audio.js`, no `nodegx.project.json`,
served by `python3 -m http.server 8765`; measured in `~/vscode_projects/fp-lab/d/my-apps/glimmerdeep`). OWN-036's
no-guides arm b put its world inside a NodeGX app as one Script node. vb's launcher plus second server is a third
reading of the same exception, and the only one that splits the game across two servers.

Richard played vb and kept it ("playable but the controls are weird and the visuals too, bit boring"), so this did
not cost the verdict; it costs the person the day they deploy or close a terminal.

Fix candidates (not chosen): one sentence in the game guide and the note's exception, naming where the world goes
(the kept games so far are one plain page: say so, or say it lives in the app); or the server's own text when a
project holds a `game/` folder beside its components. Re-measure after: a guided Vibe game round whose app, once
deployed, opens its world with no second server.
