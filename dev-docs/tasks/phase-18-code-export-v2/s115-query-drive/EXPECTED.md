# What the drive should read (written before the first run, 2026-10-16)

`query-desk`: one page, one Query Records on `Contact` feeding a For Each of `ContactRow` (name, city). Ten contacts
seeded in this order (name, city, age, vip, joined):

| # | name | city | age | vip | joined |
|---|---|---|---|---|---|
| 1 | Ada | Berlin | 36 | true | 2021-03-01 |
| 2 | Ben | Bern | 52 | true | 2019-05-01 |
| 3 | Cleo | Paris | 45 | true | 2022-01-10 |
| 4 | Dan | Berlin | 29 | false | 2023-02-02 |
| 5 | Eve | Bergen | 41 | true | 2020-06-15 |
| 6 | Finn | Oslo | 33 | true | 2024-01-01 |
| 7 | Gus | Berlin | 41 | true | 2021-07-07 |
| 8 | Hana | Rome | 60 | true | 2020-02-02 |
| 9 | Ivo | Berlin | 22 | true | 2025-01-01 |
| 10 | Jo | Madrid | 48 | false | 2022-02-02 |

The Filter: `vip = true` AND `joined > 2020-01-01` AND (`city starts with "Ber"` OR `age > 40`).
Out: Ben (joined 2019), Dan and Jo (not vip), Finn (Oslo, 33). In: Ada 36, Cleo 45, Eve 41, Gus 41, Hana 60, Ivo 22.
Sorted age descending, then name ascending: Hana, Cleo, Eve, Gus, Ada, Ivo. Skip 1, Limit 3: **Cleo, Eve, Gus**.

| arm | rows on the page, in order | the one query's body |
|---|---|---|
| runtime | Cleo Paris, Eve Bergen, Gus Berlin | `where` as below, `order: "-age,name"`, `limit: 3`, `skip: 1`, `count: false` |
| export-control (HEAD `5eeb07bdc`) | all ten, Ada … Jo, in the backend's order (insertion, by the seed) | no `where`, no `order`, no `limit`, no `skip` |
| export-fixed | Cleo Paris, Eve Bergen, Gus Berlin | the runtime's body, without `count` (§82.4) |

`where` (both the runtime and the fixed export, from the same translator):
`{"$and":[{"vip":{"$eq":true}},{"joined":{"$gt":{"__type":"Date","iso":"2020-01-01T00:00:00.000Z"}}},{"$or":[{"city":{"$regex":"^Ber"}},{"age":{"$gt":40}}]}]}`

If the runtime and the fixed export agree with each other but not with this table, the backend answers the query
differently from this reading of it: that is a backend finding, filed on its own, and does not grade the export.
