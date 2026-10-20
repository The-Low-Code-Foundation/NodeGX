# What the drive should read (written before the first run, 2026-10-16, session 118)

The same page, backend, contacts and steps as s116's drive (`params-desk`: a City box writing the Variable `city` on
every text change; `city` wired into the Query Records' `qp-city`, its box ticked; Filter `city equal to <city>` AND
`vip equal to true`, sorted by name). s116 read the runtime at S0 as two queries, `vip` only and then `city = ""`,
settling on no rows. That is the reading this row has to reproduce.

| step | what is done | runtime (s116's reading) | export-fixed (expected) |
|---|---|---|---|
| S0 | load | two queries: `{"vip":{"$eq":true}}`, then `{"$and":[{"city":{"$eq":""}},{"vip":{"$eq":true}}]}`; **no rows** | the same two `where`s in the same order, **no rows**. The development bundle runs effects twice (`<StrictMode>`), so the first query can show twice; the field's announcement is guarded and writes once |
| S1 | type "Berlin" | Ada, Gus, Ivo | Ada, Gus, Ivo |
| S2 | replace with "Paris" | Cleo | Cleo |
| S3 | clear the box | no rows (`city = ""` kept) | no rows |
| S4 | type "Oslo" | Finn | Finn |

| arm | expected |
|---|---|
| runtime | the table's runtime column, as s116 read it |
| export-control (HEAD `73b1096a9`, s117's export) | S0 as s116's fixed arm read it: `vip` only, all eight vips (Ada, Ben, Cleo, Eve, Finn, Gus, Hana, Ivo); S1 to S4 as the runtime |
| export-fixed | the runtime column in every step, S0 included |

Also read in each arm: the box's value at S0 (`""` in all three) and the console (no errors or warnings).

What this drive cannot settle: the kit-field shape (a field whose Value is wired from a component input and whose Value
Changed sends the component's output signal, 33 of the 66 fields this fix reaches). Its value is graded against the
runtime's own field in `tests/the-field-announces-at-mount.test.ts` §A (CheerMeter), not here.
