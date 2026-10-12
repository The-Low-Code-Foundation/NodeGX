---
id: P107-C47
title: After a session ends (Log Out, Session Lost), a User node's Id, Email, Username and property outputs keep the person who left on every wire — only Authenticated moves
status: fixed
commit: df793e7eb
phase: P109
task: ISL-030
severity: medium
area: runtime / User (`user.ts` `setUserModel` :353-379) — CONTRACT C3
found: P107 (the node says what it does) s26, 2026-10-02
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/graph/s10-the-session-moves.json "Log Out: Done, the User pulses Logged Out and Authenticated goes false — and Id and Email go blank, the properties empty (row C47, v4)" (and net.noodl.user.User.json "… go blank, the properties empty (v4)" ×2)
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-014-BATCH-DATA-AND-CLOUD.md §6.17 (row C47); scenarios/net.noodl.user.User.json "C47 — …", "C46 + C47 — …"
---

When nobody is signed in any more, `setUserModel(undefined)` flags Id, Authenticated, Email, Username and Roles, and the
getters read `undefined` for all but Authenticated — and `undefined` is never sent (`Node.sendValue` returns, CONTRACT C3).
The property outputs are not even flagged (:375 returns before the loop). So every wire from them keeps the last
signed-in user's values; only Authenticated changes to `false`.

**What the runtime does (measured s26):** a Fetch the backend rejects, and the page-load check rejected — the trace
carries `authenticated: false` and nothing else; Id / Email / Username / `prop-*` hold `u1`, `ann@example.com`, `ann`.

**Plain words:** *"After someone logs out (or their login expires), a 'Signed in as ann@example.com' label still shows
ann@example.com — on a shared device the next person sees who was here before."*

**Proposed:** on an ended session send an explicit empty value — `''` for Id, Email and Username, `null` for Roles and the
properties (needs a ruling on what "empty" is on these ports; the descriptions already say "empty while nobody is signed in").

**Ruling:** R3 (a) — the runtime wins until Richard rules; the spec states C3 as the runtime does.

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Blank text, empty for others".** Id, Email and Username become blank text, and Roles and the properties become empty. Labels clear at once. A graph that read Email after sign-out (to say goodbye, say) would get a blank. The port descriptions already promise this. The question as asked: *"When nobody is signed in, should the User node's outputs be cleared, and to what?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Fixed df793e7eb (P109 ISL-030, 2026-10-06), as ruled.** While nobody is signed in Id, Email and Username read blank text and Roles and the properties `null` — sent, so a wire lets go; when a session ends the properties of the one who left are re-sent. Roles is `null`, never `[]` (DEF-005 keeps "in no roles" apart; its nobody-signed-in row moved from `undefined` to `null` in the same commit). User v4. **Export, not checked:** the exported app reads the session through React state, so a signed-out label most likely re-renders empty; P18 to confirm.
