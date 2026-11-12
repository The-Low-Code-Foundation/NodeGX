# OWN-027 arm T, run r3: Gemma 4 E2B, tuning 2

**2026-10-28, 13:52–13:55 CET.** `harness.mjs --run r3 --tuning tuning2.json`. Project `own-027-T-r3`. Ledger:
`ledger.json`. Screenshots: `shots/`. Tuning 2 adds the vocabulary's band/shell sentences to stage 2, plus R19 (one
`displayHeadline` per page, script-enforced).

| Measure | r3 |
|---|---|
| Wall clock / model calls | 2.8 min / 98 |
| Answered by a rule / retries / defaults | 55 / 1 / 1 (one tree repaired) |
| Validator errors / warnings | 0 / 2 |
| Tokens in / out; largest prompt | 23,829 / 2,765; 582 (0 over 600) |
| Unparseable answers | 0 |
| render_report | 5 warnings: `elements-overflowing` (phone 6), `control-off-scale` (a 32 px checkbox), `empty-decorated-box` |

**What R19 did:** one display headline; later looks dropped it from the options (ledgered as skips).
**What the prompt sentence did not do:** 1 shell in 7 sections, at depth 2 and wrapping nothing. The text still
starts at x = 0, and Images are still 1280 px strips in five sections. Prose in the prompt did not bind a 2B model,
and the same sentence did bind E4B (e4b-r1). That makes it the cleanest model-size signal in the run.
**Copy:** on-topic everywhere, but "how it works" contradicts itself ("Simple 3 Step…" over "Our easy 4-step
process"). The sibling note stops verbatim repeats, but it can't stop a disagreement it never sees.
**Credible:** ❌ (edge-to-edge text, a dog strip in every band, the phone overflowing).
