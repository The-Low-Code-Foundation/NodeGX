---
id: P123-STU-NAVNOTFOLLOWED
title: "A page the app opens on its own after the first 3 s (Use the app's \"+ Add a plant\", a sign-in that goes on to Home) is drawn under the page Studio had picked: Workflow lists that page's workflows and Design's clicks find nothing"
status: fixed
commit: nodegx-studio b4609f8 (studio.html, swept into P132 BWF-003's commit) + the check:editor case
severity: high
area: nodegx-studio `editor/studio.html` followSoon / followApp (Design and Workflow follow the app's Router)
found: P112 OWN-026 §7, 2026-11-03 — Richard, on Watering Can (built by Mistral Large 4.0 in Vibe 3.0.4) in Studio 0872094, a copy at ~/wc
evidence: Richard's steps below; studio.html 0872094 called followSoon only from rebuild() and startup, and followSoon watched the Router for 3 s at most
---

**Richard's steps:** Design, *Use the app* on, sign in with the demo account, go to *New plant*. The Workflow tab shows
no workflows. Turn *Use the app* off: nothing on the New plant page can be clicked. Pick another page, then New plant
again: the ⚡ marks are back beside its elements and Workflow lists its workflows.

**Why:** Studio opens on the Router's start page (Watering Can: *Sign in*). `followSoon` follows the app's own redirects
only during the 3 s after a build, and nothing else listened to the Router. The app's gate (in App) signs the person in,
the Auth panel goes on to Home, and "+ Add a plant" opens New plant, all after those 3 s. So `pageKey` stayed *Sign in*.
Its own graph has no workflows (they are inside the Auth panel reusable), and none of its elements are on screen. That
explains both the empty Workflow tab and the dead clicks. Choosing a page from the picker rebuilds, which is why that cured it.

**Fix:** once the app is on screen, Studio checks the Router's current page every 250 ms. Any change it did not cause
(a new Router means a rebuild, which followSoon already handles) moves Design and Workflow to that page and clears the
old page's selection, event and item, with the toast "The app went from Home to New plant, so Design and Workflow
show New plant now." check:editor: on Todo, 3.5 s after the build, the app opens Sign in by `Noodl.Navigation.navigate`
(what a Go to page step does); the picker follows and Workflow lists only Sign in's events.
