# OWN-026 — what each stop-and-check learned

One entry per graded round that taught something, newest last. Each says what the model did, why (in its own words
where the trace has them), and what went into a FIX file. Measurements, not impressions.

## #1 — t1-nodegx-1 (re-run), kit 0.2.5 registry, 16/22 (2026-10-22)

- **The filter it couldn't write.** Iterations ~12–24 (13:08–13:12 UTC, about 12 of 96 model turns): `get_node_type
  DbCollection2 detail:full ports:[querySettings…]` → notFound; `list_examples "filter the query on the server owner
  isolation"` → only a client-side example; a shell hunt for the server's source outside its folder (refused by the
  fence). Its words: *"No filter shape documented. I'll discover it empirically at runtime."* Shipped: whole
  collections to the page, `rows.filter(r => r.ownerId === owner)` in two Function nodes. → FIX-01 B.
- **The open backend it saw and couldn't close.** It read `get_backend_permissions` (`devOpen: true, enforced: false`),
  wrote *"That's concerning"*, looked for a tool to enforce, found none, reasoned *"when deployed with enforcement on,
  the ACLs also hold"*, planned `set_collection_permissions` and never called it. → FIX-01 A.
- **State on the page, written back whole.** Progress lived in a page object and an Update Record wrote all of it after
  each answer: two tabs overwrite each other (T5), and a double press reached the next question (T3). The plain-code arms
  kept it on the server. → FIX-01 C.
- **Its own JavaScript.** 17 Function nodes, 346 lines, held the game's rules; the mastery window used `.slice(0, 10)`
  (keeps the oldest ten). Not the kit's: noted so a later round can see whether script share falls as the kit teaches more.
- **What it did well with the kit:** 3 `render_report` + 13 `drive_page` runs to check its own work (after the lab's
  Chrome fix), a working PIN gate, sign-in and restart. 12 of its 186 tool calls were refused (mostly
  `create_component` validation-failed, one unknown `update_component` argument); not yet read for a pattern.
