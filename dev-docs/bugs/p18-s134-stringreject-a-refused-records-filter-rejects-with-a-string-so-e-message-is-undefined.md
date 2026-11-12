---
id: P18-S134-STRINGREJECT
title: A Noodl.Records call whose filter is refused rejects with a bare string, so a script's `e.message` is undefined
status: open
severity: low
area: runtime / `Noodl.Records` (`noodl-runtime/src/api/records.js` `whereFor` → `QueryUtils.convertFilterOp`'s `error`), and the export's `src/lib/noodl.ts`, which matches it on purpose (`the-noodl-api-travels.test.ts` B1, "the same kind of rejection")
found: Beta sweep s5, 2026-10-25, writing `packages/nodegx-backend/tests/p121-two003-cloud-points-to.test.ts`
evidence: a cloud function whose script is `try { await Noodl.Records.query('Seller', { country: { pointsTo: id } }) } catch (e) { Outputs.error = e.message; }` answered `{}` before P121-TWO003-CLOUDPOINTSTO's fix: the refusal was the string "Filtering \"country\" by the record it points to needs the collection schema…", and `e.message` was undefined
---

A filter the translator refuses (two keys in one object, an unknown operator, `between` with one bound, and before
P121-TWO003-CLOUDPOINTSTO a `pointsTo` in a function) rejects the call with the translator's words as a plain string.
Every other failure of the same members rejects with an `Error` (`reject(Error(err || 'Failed to query.'))`). A
script written the usual way, `catch (e) { … e.message … }`, reads `undefined` and reports nothing: the reason the
query failed is lost exactly where a person is trying to see it.

The exported app rejects the same way on purpose, and `the-noodl-api-travels.test.ts` grades both arms as "the same
kind of rejection", so a change is two arms and one spec, and lane 4 is paused.

**Fix shape:** reject with `new Error(words)` on both arms and move the spec's `string` outcomes to `Error`. Owner: NONE.
