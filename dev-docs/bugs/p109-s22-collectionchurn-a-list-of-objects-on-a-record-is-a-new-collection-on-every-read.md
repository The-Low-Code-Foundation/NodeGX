---
id: P109-S22-COLLECTIONCHURN
title: A list of objects on a record is a new Collection on every read, so its Changed fires with nothing moved
status: fixed
commit: 624facf73
phase: P109
severity: low
area: runtime / cloudstore.js `_deserializeJSON` (an array of objects becomes `Collection.get()`, a new one each time)
found: P109 ISL-027 s22, 2026-10-06, by reading, while fixing P107-C49
evidence: packages/noodl-runtime/src/api/cloudstore.js `_deserializeJSON` (`_isArrayOfObjects` → `Collection.get(); c.set(a)`); `_fromJSON` then `m.set(key, …)` and the record store's `!==`
regression: packages/noodl-runtime/test/nodes/p109-collectionchurn-a-list-of-objects-read-again.test.ts
---

C49 (`c6bf4e8ac`) stopped a plain list from counting as a change when it arrives again with the same contents: the
session's Roles, a Record's list of names. A list of OBJECTS takes a different path. `_deserializeJSON` turns it into a
fresh Collection (`Collection.get()`, a new id) on every read, `_fromJSON` writes it, and `Model.set`'s `!==` calls it
changed. So a Record whose field holds a list of objects pulses Changed on every Fetch, the C49 shape one level down.

Not measured in a running app; found by reading the code beside the C49 fix. The spec world does not model the
Collection conversion at all (`writeStoreEvent` writes the raw list), so no conformance run can see it.

**The ruling already covers it** ("Compare the list's contents … or any other list on a record"). The question is how:
compare the Collection's items by their contents, or reuse the Collection the record holds and `set` its items in
place (as a Collection node's Items does). Reusing it in place keeps item identity for anything wired to the list.

**Fixed 624facf73 (P109, built s27 on `p109-d30`, landed s28 2026-10-07), by contents.** `sameList` in cloudstore.js compares the lists by their contents (`_toJSON`), so a Fetch that reads the same list again is no change and the Record holding it no longer pulses Changed. The new runtime test was red on the old cloudstore.js on exactly the same-contents case, its two controls green either way (s27). Re-graded on the rebased branch: that test with the backends and record suites 422 / 422.
