# OWN-027 arm T, run e4b-r1: Gemma 4 E4B, tuning 2 (same harness as r3)

**2026-10-28, 13:55–14:03 CET.** Added at Richard's request (2026-10-28): "I'd like to try E4B". `OWN027_MODEL=
gemma4:e4b-it-qat harness.mjs --run e4b-r1 --tuning tuning2.json`. Project `own-027-T-e4b-r1`. The only difference
from r3 is the model.

| Measure | r3 (E2B) | **e4b-r1 (E4B)** |
|---|---|---|
| Wall clock / model calls | 2.8 min / 98 | **8.1 min / 87** |
| Answered by a rule / retries / defaults | 55 / 1 / 1 | **38 / 3 / 3** |
| Validator errors / warnings | 0 / 2 | **0 / 0** |
| Tokens in / out; largest prompt | 23,829 / 2,765; 582 | **23,489 / 4,547; 615 (1 over 600)** |
| Unparseable answers | 0 | **3, all stage 2 trees cut at the harness's 400-token output cap (pretty-printed JSON)** |
| render_report | 5 warnings incl. phone overflow | **2 warnings (`empty-decorated-box`), 0 overflow at 390 px** |

**What E4B did differently:** it read the band/shell sentence and acted on it. **5 of 7 sections put a shell as
item 1** (E2B: 0). The hero is centred in a container, the gallery is an image-ground band with its title on the
photo, and the testimonial and footer are contained. Nothing overflows at phone width.
**What it lost:** "how it works" is an empty band, because its tree answers were cut off twice at `num_predict: 400`
and the script's repair kept only the root. The features section is thin (one card), and the footer has four `@`
icons with no labels.
**Credible:** ⚠️ not yet. It's the first arm-T page that reads as designed rather than stacked, but the empty
section and the dog strip in the CTA band keep it from "my name on it". The output cap is a harness ceiling, fixed as
H1 for the tuning-3 runs on every model.
