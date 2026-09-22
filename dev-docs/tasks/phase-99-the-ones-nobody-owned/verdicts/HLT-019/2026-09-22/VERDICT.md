# HLT-019 — verdict, 2026-09-22 (P99 s18)

**Built, ACs 1, 3, 4 and 5 graded. AC2 (a live call on a real key) NOT RUN: there is no key on this
machine.** Tree: `cline-dev` at `2b2890230` plus this change.

## The ruling, with the question it answered

Asked in plain words: *the node cannot cache its instructions; recommended: always cache them, no
setting (200 learners in a morning: $0.93 instead of $6.30 of input; a function called less than
every 5 minutes pays ~24% more on its instructions, ~$0.36/day at one call per 30 minutes). Or a
switch, on by default. Or a switch, off by default.*

Richard, 2026-09-22:

> "Can't we add one field in the node where you add non cached stuff, and one field where you add
> cached stuff? That way at least you can choose if you want to cache instructions that are repeated
> every time, but you have the flexibility to add a new part to the instructions each time"

So neither option. **Two fields.** `Instructions` is cached. A new `Per-Call Instructions` is sent
after it and is never cached. You choose what gets cached by which field the text goes in, not
with a switch. This also covers the one mistake the [worked example](../../../HLT-019-WORKED-EXAMPLE.md)
said no setting could prevent (case E, per-learner text inside the instructions). That text now
has a field of its own.

## What was built

| | |
|---|---|
| `modelrequest.ts` `buildSystem` | Instructions → one text block with `cache_control: {type: "ephemeral"}` (5-minute TTL). Per-Call Instructions → a second, unmarked block after it. Only Per-Call Instructions → the plain string, as before (nothing stable to cache). Neither → no `system`, byte-identical to before. Empty blocks are never sent. **No top-level automatic `cache_control`** (it marks the last block, i.e. the varying one: worked example case C). |
| `callInstructions` port | `Per-Call Instructions`, group Request, code editor text. |
| Usage | gains `cacheWriteTokens` (from `cache_creation_input_tokens`). |
| `RuntimeModelCall`, `modelCost` | the execution record's `modelCalls` carries `cacheWriteTokens`, and the run summary sums it. ⚠️ **The summary's `line` sentence is unchanged.** Its shape was ruled on 2026-09-19 and nobody has ruled on a clause for writes. |
| Catalog / enriched / docs page | regenerated (`catalog:generate`, `catalog:merge`, `docs:nodes`); all three `--check` modes clean. The Instructions description says what is cached, that per-call text belongs elsewhere, and that below the model's minimum (512 tokens on Opus 5) nothing is cached and Usage shows 0 written (AC3). |

The API facts came from the current prompt-caching reference, read on 2026-09-22, not from memory:
the 512-token minimum on Opus 5, 1.25× write / 0.1× read, 2× for the 1-hour TTL, and automatic
caching landing on the last block ("a pure surcharge" when the prompt ends in per-request content).

## Readings (2026-09-22)

- `nodegx-backend` `tests/fed-003-model-request.test.ts`: **20/20**. Three new drives over the real
  service against a recording provider: Instructions and Per-Call Instructions give two blocks with
  the marker on the first; Per-Call alone gives a plain string; neither gives no `system`. AC1's
  body test now pins the marked block and the absence of top-level `cache_control`. The record test
  pins `cacheWriteTokens` (30) and the summed run (60 = 30 × 2).
- **AC5 mutant** (marker removed from `buildSystem`, restored from a `cp` backup): **2 fail by
  name**: *builds the body of §3.2* and *sends Per-Call Instructions as an unmarked block AFTER the
  cached one*.
- **AC4**: FED-003's key grep (*appears in no port value, no log line and no execution record*) is
  green on the new build, both paths.
- `noodl-viewer-cloud` FED-003 spec 8/8. `feed-drive` green.
- `typecheck:runtime`, `typecheck:cloud`, `typecheck:backend-tests`, `tsc -p nodegx-backend
  --noEmit`: all exit 0.
- 🔴 **Editor `tests-unit/chr-007` was RED on HEAD before this change.** s16's `Only If Unchanged`
  port (`SetDbModelProperties.onlyIfUnchanged`) never got its row in `widgetDispatch.snapshot.json`.
  I added that row and this change's `callInstructions` row by hand: **23/23**. So a new port owes a
  **fourth** update, the CHR-007 snapshot, as well as the three regenerations.

## Not done

- **AC2 (live):** the first call reports a cache write and a second call within 5 minutes reports a
  read, both read off `usage`. It needs a real key and Instructions over 512 tokens. It costs well
  under a cent.
- The HLT-019 task file is the DBT stream's and still uncommitted. It still describes the
  `Cache Instructions` boolean. This verdict supersedes its §3 and its AC1 wording, and I did not
  edit the file.
