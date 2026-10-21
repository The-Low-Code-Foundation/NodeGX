# The Component Desk — predicted before either arm ran (P18 session 135, EXP-020 slice 2)

Desk: `packages/nodegx-export/tests/helpers/component-desk.ts`. Each reading is the text of every drawn Text, in document
order: Keep A's `n`, `got`; Keep B's `n`, `got`; then Keep C's `n`, `got` while C's Group is mounted. `nn` = "n nothing",
`gn` = "got nothing" (the authored texts; the export shows `''` there until a run delivers — P18-S132-AUTHOREDTEXT).

`got` is `got|<get n>|<.n>|<get word>|<own keys>|<id kept?>|<id prefix>`.

Steps: Read B · Add A · Add A · Add B · Read A · Read B · Toggle · Add C · Toggle · Toggle · Add C · Read C.

| # | step | the runtime reads (predicted) |
|---|---|---|
| 0 | load | nn · gn · nn · gn |
| 1 | Read B | nn · gn · nn · `got\|\|\|\|\|kept\|state` (the record boots empty; `id` is read-only) |
| 2 | Add A | 1 · gn · nn · `got\|\|\|\|\|kept\|state` |
| 3 | Add A | 2 · … |
| 4 | Add B | 2 · gn · 1 · `got\|\|\|\|\|kept\|state` (B's record is its own) |
| 5 | Read A | 2 · `got\|2\|2\|w2\|n,word\|kept\|state` · 1 · … (Read reads what Add wrote: one record per instance, shared by its Functions) |
| 6 | Read B | … · 1 · `got\|1\|1\|w1\|n,word\|kept\|state` |
| 7 | Toggle | … · nn · gn (C drawn) |
| 8 | Add C | … · 1 · gn |
| 9 | Toggle | A's and B's four only (C not drawn) |
| 10 | Toggle | … · 1 · gn (C drawn again: the runtime kept the instance, its Text keeps what it was sent) |
| 11 | Add C | … · 2 · gn (the record outlived the hiding) |
| 12 | Read C | … · 2 · `got\|2\|2\|w2\|n,word\|kept\|state` |

The export, predicted: rows 0–9 equal to the runtime's but the authored texts. Rows 10–12 **diverge** if the export unmounts
C (a `{cond && …}` around the placement): C's kept nodes, their outputs and its record are one mount's, so 10 reads `''`,
11 reads `1`, 12 reads `got|1|1|w1|n,word|kept|state`. That is P18-S128-SEEDREMOUNT's class (the runtime creates an
instance once and keeps it while it is not drawn), met here by the record and the kept nodes, not by a seed: measured,
not graded away, and filed by name if it is what the arms read.
