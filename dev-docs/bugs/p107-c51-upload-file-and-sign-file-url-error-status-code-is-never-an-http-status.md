---
id: P107-C51
title: Upload File and Sign File URL's Error Status Code is never the HTTP status — always 0 on Directus, Supabase and PocketBase, and the Parse error code (e.g. 119) on the NodeGX / Parse wire
status: fixed
commit: 091e86d1c
phase: P109
task: ISL-030
severity: medium
area: runtime / Upload File (`uploadfile.ts` `setError` :390-403), Sign File URL (`signfileurl.ts` `setError` :326-339), the REST adapter's file methods (`RestDataAdapter.ts` `fail: (message) => options.error({ error: message })` :1814, :1868, :1938, :2013; `request` :527)
found: P107 (the node says what it does) s30, 2026-10-03
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Upload File.json "a Parse-wire refusal: Error Status Code is the HTTP status, not the Parse error code (v2, C51)" (and the REST, no-message and no-answer rows beside it; Sign File URL.json "… never the Parse code (v2, C51)"; the adapter half in packages/noodl-runtime/test/backends/rest-data-adapter.test.ts "a refused upload hands the HTTP status in its envelope (P107-C51)" and file-ref.test.ts "still forwards the error envelope whole, status included")
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-014-BATCH-DATA-AND-CLOUD.md §6.28–§6.29 (row C51); scenarios "a REST refusal…", "a Parse-wire refusal: the error CODE wins over the HTTP status", "a refusal with no message: Error is the envelope itself" (scenarios/Upload File.json, Sign File URL.json) — graded on the runtime
---

Both nodes promise, on the port: *"Error Status Code — HTTP status the backend refused with, or 0 when the request never
left the app"*. The adapter contract's file callbacks were changed to an envelope (`error({ error, status })`, BCN-002)
precisely "so two node call sites can tell a 403 from a 500". Neither half holds:

- **REST backends (Directus, Supabase, PocketBase):** the adapter's `request` knows the status (:527) but hands its file
  callers only the message: `fail(errorMessage(status, body, text))` → `options.error({ error: message })`. The status
  never reaches the node, so Error Status Code is **0 on every failure**, a 403 and a 500 alike (the status survives only
  as text inside Error: `HTTP 403: {…}`).
- **The NodeGX / Parse wire:** the envelope is the server's error body `{ code, error }`, and the node reads
  `code || status || 0` — so a refused upload shows **119** (Parse's "operation forbidden" code), not 403.
- **A body with no message:** the node puts the WHOLE envelope on Error (`hasOwnProperty('error')` false → the object),
  so a string port carries `{ status: 500 }`.

Measured s30 on the runtime target (the real nodes and `CloudStore`; the world plays the contract's envelope): the three
scenarios above, on seeds 20729 and 13 and at 10,000.

**Plain words:** *"When an upload is refused, the node's Error Status Code is supposed to say 403 or 500 so the app can
react differently. On Directus, Supabase and PocketBase it always says 0, and on our own backend it says 119 (an internal
code). Make it the real HTTP status?"*

**Proposed:** the REST adapter hands `{ error, status }` from `request` (it has the status), and the two nodes read
`status` before `code`; a message-less envelope puts a sentence on Error, not the object. A spec v2 for both nodes.

**Ruling:** R3 (a) — the runtime wins until Richard rules.

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Send the real status".** Both nodes show 403, 500 and so on, on every backend, and Error is always a sentence. A change to the backend layer and the two nodes. An app that checks for 119 on NodeGX's backend would need to check for 403 instead. The question as asked: *"Should Error Status Code carry the real HTTP status on every backend?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Fixed 091e86d1c (P109 ISL-030, 2026-10-06), as ruled.** The REST request hands `fail(message, status)` and its file operations put the status in the envelope; the Parse wire hands its error callback the HTTP status and adds it to the server's body; Upload File and Sign File URL read `fileFailureOf` (`fileRef.ts`): the status, 0 when none, never the Parse code, and Error always a sentence. Upload File v2, Sign File URL v2.
