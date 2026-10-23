# CCN-002 — The hold everywhere

**State:** open. **After:** CCN-001 AC5.

A hold that only the panel knows about is a hold the rest of the kit can trip over. Make it a first-class fact:

1. `create_project` writes `.nodegx-hold.json` into the project's `.gitignore` (the merge in `project/agentConfig.ts`).
2. `session_status` and `get_project_info` report `hold` (who, since when, the note) so a model that joins late sees it.
3. `what_changed_since` (explore group): the files the person changed in Studio since the model's last read of each
   component — the answer to "they released the hold; what did they do?". The store's drift rule already refuses
   the stale write; this is the read that follows the refusal.
4. Studio's own drift answer (409 on `/api/save`) names the agent as the other writer when it was one.
5. A hold older than a day is reported, not silently honoured forever: `open_studio` says how old it is.
