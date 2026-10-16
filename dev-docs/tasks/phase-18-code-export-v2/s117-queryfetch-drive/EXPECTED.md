# What the drive should read (written before the first run, 2026-10-16, session 117)

`fetch-desk`: one page. A City box writes the Variable `city` on every text change; `city` is wired into the Query
Records' `qp-city`. The Filter is `city equal to <city>`, sorted by name ascending. The query's Fetch is sent by a
**Refresh** button and by the Done of a Create Record behind **Add Zed in Berlin** (`name` Zed, `city` Berlin, `vip`
true). Every Run On Value Change box is unticked, as NDA-017's settle writes them on a wired Fetch. s115's ten contacts
(`backend.ts`); in Berlin: Ada, Dan, Gus, Ivo.

| step | what is done | request (runtime and fixed export) | rows, in order |
|---|---|---|---|
| S0 | load | **none**: the boxes are applied before the inputs they govern (`nodescope.ts`), so nothing asks at creation; the City box's mount value `""` (P18-S116-FIELDMOUNT) reaches an unticked `qp-city` box | none |
| S1 | type "Berlin" | none: a new `city` waits for Fetch | none |
| S2 | click Refresh | one query, `{"city":{"$eq":"Berlin"}}`, `order: "name"` | Ada, Dan, Gus, Ivo |
| S3 | click Add Zed in Berlin | one POST, then one query with the same `where` | Ada, Dan, Gus, Ivo, Zed |
| S4 | clear the box, click Refresh | one query, `{"city":{"$eq":""}}` (`""` is a value; its condition stays) | none |
| S5 | type "Oslo", click Refresh | one query, `city` = "Oslo" | Finn |

The runtime's body carries `count: false` as well (§82.4). The runtime's query does not follow the create on its own:
its Record changes box is unticked too (`cloudStoreEvents` returns), so S3's new row arrives through Fetch only.

| arm | expected |
|---|---|
| runtime | the table above |
| export-control (HEAD `c3a0462d0`) | no list and no `/classes/Contact` request in any step: the query is refused ("… its Fetch is wired … (P18-S116-QUERYFETCH)"); and no POST at S3, the Create Record refused because its Done "drives no translatable action" |
| export-fixed | the table above, the same request per step |

Readings this table does not settle beforehand: whether a click in the runtime's Button reaches Fetch in the same
frame as the box's last write (it should not matter: S2 and S5 type before they click); and whether the dev bundle's
`<StrictMode>` doubles anything here (it doubles effects, and the fixed page has none).
