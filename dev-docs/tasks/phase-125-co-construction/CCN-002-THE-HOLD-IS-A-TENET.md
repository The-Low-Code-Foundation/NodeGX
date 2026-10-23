# CCN-002 — The hold everywhere

**State:** built 2026-10-23 (lane 3; OpenNoodl c5da19b12, nodegx-studio 6a60d51, not pushed). **After:** CCN-001 AC5 ✅.

A hold that only the panel knows about is a hold the rest of the kit can trip over. Make it a first-class fact:

1. `create_project` writes `.nodegx-hold.json` into the project's `.gitignore` (the merge in `project/agentConfig.ts`).
2. `session_status` and `get_project_info` report `hold` (who, since when, the note) so a model that joins late sees it.
3. `what_changed_since` (explore group): the files the person changed in Studio since the model's last read of each
   component — the answer to "they released the hold; what did they do?". The store's drift rule already refuses
   the stale write; this is the read that follows the refusal.
4. Studio's own drift answer (409 on `/api/save`) names the agent as the other writer when it was one.
5. A hold older than a day is reported, not silently honoured forever: `open_studio` says how old it is.

## Done (2026-10-23)

1. **Gitignored.** The shared merge (`noodl-editor/…/models/template/agentConfig.ts`, used by `create_project` and the
   editor alike) appends `.nodegx-hold.json` beside `.mcp.json`, each line only when missing; an old `.gitignore` that
   has `.mcp.json` alone gets the hold line (outcome `written`, was `kept-existing`). `agentConfig.test.ts` +1 case.
2. **Reported.** `session_status` (exempt from the hold) carries `hold` for the bound project and for an asked
   `directory`, and leads its note with it. `get_project_info` does **not** carry a field, and cannot usefully: since
   CCN-001 s6 every non-exempt tool is held, so during a hold it answers with the `held` refusal, which *is* the
   report (who, since when, the note, the file, now the age). Outside a hold there is nothing to report.
3. **`what_changed_since`** (deferred `project` group, not `explore`: there it would be the tenth tool and "10 tools"
   costs a resident character; beside `open_studio`/`session_status` it is 0 — surface measured 8,277 / 8,280).
   `ProjectStore` keeps each component as the server last read or wrote it (`seen`, a copy) and the registry's keys
   at open; the tool reports, per component, nodes added / removed / edited (settings `before → after`, moved), wires
   added / removed in the graph's words, `lastWrittenBy`, plus components deleted, and ones added since open that the
   agent never read. The held refusal now says to call it on release.
   🔴 **Measured while building, and the task's premise was wrong:** "the store's drift rule already refuses the
   stale write" holds only with `if_revision`. `update_component` re-reads before it applies, so a write after the
   person's Studio edit lands ON their edit (their nodes kept, the same setting overwritten), not refused. The tool's
   note says to re-read and pass `if_revision`; the test grades both arms.
4. **Studio names the agent** (nodegx-studio `serve.mjs`, `studio.html`): the watcher marks a file the agent's when it
   changed in the same batch as its component's `component.json` stamped `modifiedBy: 'noodl-mcp'` (a save that lands
   before the 120 ms batch settles reads the unseen `component.json` on disk instead); Studio's own save clears the
   mark. A 409 clash on a marked file is `by: 'agent'`, and the
   dialog says *"The agent changed Pages/Sign in while you were editing it. Keep your version (the agent's change is
   overwritten), or take the agent's…"*; the "redrawn" toast says *"The agent changed …"* on the same rule. The stamp
   alone says only who wrote the component LAST (an agent's file later edited in VS Code is not the agent's change),
   hence the rule. 🔴 First cut read the stamp from the clash's own files and failed its gate (202/203): Studio's
   delete saves `nodes.json` only, so `component.json` was never among the conflicts. `check:editor` +3, and the existing clash (nodes.json only) asserts it does NOT name the agent.
5. **An old hold is said.** `readHold` adds `ageHours`; at 24 h and over, the held refusal and `open_studio`'s note
   say *"This hold has been on for N days: it may be one they forgot. Ask whether they still mean it; do not remove it
   yourself."*

Gates: `tests/ccn002HoldEverywhere.test.ts` 6/6 (mutant: drop the write-side `remember` ⇒ the create case fails),
`agentConfig.test.ts` and `toolDisclosure.test.ts` green (64 with the new file). Studio: `check:editor` **203/203** (3 new), `check:data` 80/80, `check:timeline` 53/53, `check:app` 54/54. Not yet: the `noodl-mcp` dist is not
rebuilt, so Richard's Claude Desktop runs none of this until `npm run build` in `packages/noodl-mcp`.
