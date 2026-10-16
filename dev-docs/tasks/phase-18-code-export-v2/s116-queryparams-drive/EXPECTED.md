# What the drive should read (written before the first run, 2026-10-16, session 116)

`params-desk`: one page. A search box (placeholder "City") writes the Variable `city` on every text change; `city` is
wired into the Query Records' `qp-city`. The Filter, in the QueryEditor shape every wired filter in the corpus has:
`city equal to <city>` AND `vip equal to true`, sorted by name ascending. The same ten contacts as s115 (`backend.ts`).
Eight are vip: Ada Berlin, Ben Bern, Cleo Paris, Eve Bergen, Finn Oslo, Gus Berlin, Hana Rome, Ivo Berlin.

| step | what is done | `where` (runtime and fixed export) | rows, in order |
|---|---|---|---|
| S0 | load | `{"vip":{"$eq":true}}`: `city` holds nothing, so its condition is dropped | Ada, Ben, Cleo, Eve, Finn, Gus, Hana, Ivo |
| S1 | type "Berlin" | `{"$and":[{"city":{"$eq":"Berlin"}},{"vip":{"$eq":true}}]}` | Ada, Gus, Ivo |
| S2 | replace with "Paris" | `city` = "Paris" | Cleo |
| S3 | clear the box | `city` = `""`: a value, so the condition stays (the drop is for unset only) | none |
| S4 | type "Oslo" | `city` = "Oslo" | Finn |

Each step after S0 sends one query in each arm, with `order: "name"`. The runtime's body carries `count: false` as
well (§82.4); the export's does not. The fixed export's development bundle sends S0 twice (`<StrictMode>`, s115).

| arm | expected |
|---|---|
| runtime | the table above |
| export-control (HEAD `da11b6f0c`) | no list at all and no `/classes/Contact` request: the query is refused ("its Filter reads "city" from a wired input …") and the For Each's wire is dropped with that reason |
| export-fixed | the table above, the same `where` per step |

A reading this table does not settle beforehand: whether the runtime's text input sends `onTextChanged` at mount
(with `""`). If it does, S0 in the runtime is `city = ""` and shows no rows, and the fixed export must show the same;
a difference there is graded against the runtime, not against this table.
