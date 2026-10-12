# HST-001 — The campus flow, rebuilt through the MCP

**Opened 2026-10-07.** **Depends on OWN-011, or this checkout's `noodl-mcp` and `noodl-preview`.**
**Status: 📋 not started.** Kind: proof.

## 1. The person sentence

> **A person asks Claude Desktop for the client's trick: a newsletter link carries an id, the page knows who arrived,
> what they do on it is saved against that id, and a hook tells Mailchimp. Claude builds it as a NodeGX project with
> the MCP, the person watches it in the preview, and nobody opens the editor.**

## 2. Why

README §1 reading 10: whether the node vocabulary can express the client's site is unmeasured. If it cannot, the rest
of the phase is plumbing for an app that cannot be built. The finding goes to P107 either way.

## 3. What exists

- `noodl-mcp` creates components, connects ports, validates, renders reports (P107 NSP-021 §2). The unbound server's
  `create_project` scopes the app with the person and writes its brief.
- `noodl-preview` renders the folder in a browser with no editor process and reloads on change.
- The backend's permission model (P104): `public`, `authenticated`, `nobody`, `role:<name>`.
- Memory: a project scan must read both project formats; a `Repeat` row sends one signal per update; `Outputs` on a
  JavaScript node publish only when the value changes.

## 4. What to do

1. Richard, or a stranger (memory: the stranger-agent round recipe), asks for the flow in plain words. The transcript
   is kept.
2. The agent builds it: a page that reads `?id=` from its URL; a records collection keyed by that id; a server-side
   call to a stand-in for Mailchimp (a local endpoint that logs what it receives: the real key is not used in a proof).
3. Count: nodes used, nodes the agent asked for that do not exist, Function nodes it fell back to (the honesty number,
   P111 SEE-001), tokens spent (SEE-000's method), minutes.
4. Open the result in the editor once, at the end, and record whether it survives an edit there (DIRECTION.md §4.3).

## 5. Acceptance criteria

1. The flow runs in the preview: a link with an id lands on a page that shows who arrived, a click is saved, and the
   stand-in endpoint logs the hook.
2. Every node the vocabulary lacked is filed as a row in P107's register with this task's name on it.
3. The honesty number of the built project is in this file, with the count of Function nodes and what each does.

## 6. Not this task

Deploying it (HST-003). Using the real Mailchimp key. Making it pretty.
