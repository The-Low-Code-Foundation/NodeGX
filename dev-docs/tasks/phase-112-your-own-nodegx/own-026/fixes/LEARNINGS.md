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

## #2 — t1-nodegx-2, kit FIX-01 (`ddd876378`), 17/22 (2026-10-22)

- **FIX-01 A and B arrived and worked.** Backend enforced from its first start; T7/T8 pass. DeepSeek found
  `cloud-query-own-rows` and wrote `visualFilter` on 2 of 4 Query Records. Script fell to 14 Function nodes / 114 lines.
- **FIX-01 C never arrived.** Its lesson sits at character 40,311 of a 51,834-character `get_project_info`; Cline
  keeps ~8,000. 26 nodegx results this round were over 8,000 characters. The kit's long answers are written for a
  reader that sees all of them; DeepSeek in Cline sees each one's first and last few thousand. → FIX-02 B.
- **The record that reads memory.** The game page binds a Record to the URL's child id; `setModelID` takes the
  in-memory copy (empty after a reload) and fires `fetched` anyway; a launch from there overwrites real progress
  (T1, T2). → FIX-02 A.
- **One slip, eleven times.** `update_component` with `create_component`'s arguments for components that didn't exist
  yet; `didYouMean: null`; it never stopped. → FIX-02 C.
- **Buttons 35 px** in both NodeGX rounds, 40+ in every code round (T9). → FIX-02 D.

## #3 — t1-nodegx-3, kit FIX-02 (`328f1dd1d`), 18/22 (2026-10-23)

- **FIX-02 arrived and worked.** `get_project_info` called 12 times, by `section`; `readFirst` read. T1/T2 (reload)
  pass: the Record reads an unheld record. T9 passes (44 px). The update/create slip came back 3 times, each answered
  by the new hint and fixed on the next call; refusals 22 of 228, mostly argument-name slips the `didYouMean` fixed.
  Script fell to **4 Function nodes / 106 lines** (17 / 346 at 0.2.5). T7/T8 hold with no owner filter written at
  all (the backend's enforced `creatorOwns`, as `cloud-query-own-rows` says).
- **Delivered advice gets argued away.** It read the shared-value lesson and wrote: *"The doctrine explicitly warns
  … contention is negligible … Simpler and defensible: compute the whole new state"* → one whole-record
  `Noodl.Records.update` per answer → two tabs overwrite (T5). It read "a press that saves is taken once" and
  wrote: *"double presses are a minor risk … the Check button is hidden"*, but Enter in the field still answers
  twice → fuel +2 (T3; t1-nodegx-2 had passed it). The plain-code arms got both right unprompted: a server endpoint
  per answer increments by itself. → FIX-03: make the safe path the shortest path in the graph, not a warning.
- **T6** failed here for the first time in a NodeGX round (the unlocked page stays open after the parent's setup),
  as in all six plain-code rounds; **F6** failed on the grader's doubt over the Moon, as in t1-harness-1 and
  t1-nodegx-2. Neither is the kit's.
