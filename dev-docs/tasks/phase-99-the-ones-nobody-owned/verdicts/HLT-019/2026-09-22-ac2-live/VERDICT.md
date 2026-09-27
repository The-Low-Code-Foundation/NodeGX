# HLT-019 AC2 — verdict, 2026-09-22 (P99 s21). The cache, on the real API.

**AC2 MET.** Three calls to `https://api.anthropic.com`, one run, inside the 5-minute TTL, on
Richard's key (`.env`, at his instruction: *"You have an anthropic key in .env so drive away"*).
Tree: `cline-dev` at `ec1061805` plus this change. Spend: **4 cents or less** — 1,490 input tokens
and 12 output tokens across three calls on `claude-opus-5` at `effort: low`.

## The three rows, as the run printed them

```
HLT-019 AC2 — live usage
  A (write)   in=34   out=4  cacheWrite=700  cacheRead=0
  B (read)    in=37   out=4  cacheWrite=0    cacheRead=700
  C (mutant)  in=719  out=4  cacheWrite=0    cacheRead=0
```

- **A** sent ~700 tokens of `Instructions` marked `cache_control: {type: "ephemeral"}` and the API
  **wrote 700 tokens to the cache**. It read 0, which is the arm that says the entry is this run's
  and not a leftover.
- **B** sent the **same** `Instructions` and **different** `Per-Call Instructions` (`Ada` → `Bo`)
  and **read all 700 back**, writing none. 🔴 **This is the whole claim of HLT-019 measured on the
  wire:** the varying text sits after the breakpoint, so changing it costs 3 uncached tokens, not
  700. `cacheRead(B) === cacheWrite(A)` exactly.
- **C** is the **mutant**, and it is the reason A and B mean anything. It sent the **same bulk of
  prose** through `Per-Call Instructions` — the port `buildSystem` sends **unmarked**, by design —
  and the API charged **719 full-price input tokens** and cached nothing.

## 🔴 Why C had to be a third call and not a sentence

Without it, every number above is equally consistent with the API caching a long prefix on its own
and the node's marker doing nothing whatever. C holds the size constant (719 vs 700 tokens — both
far over Opus 5's 512-token minimum) and varies **only the marker**. It is the control pair this
phase's §5a demands, and it fired: 0 written where the marked call wrote 700
([[a-control-pair-proves-what-you-varied-only]]).

⚠️ **And the first arm is not ceremony.** `usage` is `{0,0,0,0}` on a *failed* call, so
`cacheWriteTokens === 0` would pass C's assertion for entirely the wrong reason — a bad key, a 400,
a refusal. The suite asserts all three calls answered `end_turn` with >500 tokens accounted for
**before** it reads a cache number off any of them
([[a-rule-reading-zero-in-both-arms-grades-nothing]]).

## ⚠️ The nonce, and the trap it closes

`Instructions` carries a per-run nonce **inside** the cached block. Without it the second run of
this spec inside five minutes would find the first run's entry warm: A would report a **read** and
**zero writes**, and the spec would go red on a working build. Worse in the other direction — a
build that had **stopped sending the marker** could still show a read, from an entry an earlier
run wrote. The nonce makes A→B a write→read pair *this run produced*
([[a-post-drive-control-reads-the-state-the-drive-leaves]]).

## Where it lives, and why it cannot bill anyone by accident

`packages/nodegx-backend/tests/fed-003-live-cache.test.ts`. It is `describe.skip` unless
**`NODEGX_LIVE_MODEL_KEY`** is set.

🔴 **It deliberately does NOT read `ANTHROPIC_API_KEY`.** `testMatch` is `**/tests/**/*.test.ts`,
so this file is run by `npm test` in this package and by any gate that shells to it; the machines
that do so are exactly the machines likely to have `ANTHROPIC_API_KEY` exported for unrelated
reasons. A spec that spends money is opted into by a name nothing else uses.

Verified both ways on the same tree:

| run | result |
|---|---|
| `NODEGX_LIVE_MODEL_KEY=… npx jest tests/fed-003-live-cache.test.ts` | **6 passed**, 6.57 s, three real calls |
| `npx jest tests/fed-003-live-cache.test.ts` (no key) | **1 suite skipped, 6 tests skipped**, 0.66 s, **0 requests** |

## Gates

- `tsc -p packages/nodegx-backend --noEmit` — **exit 0**.
- The live suite, run twice as above.
- No product source changed: this is a spec and a verdict. `test:main` and `test:ci` were **not**
  run, and are not owed — nothing outside `packages/nodegx-backend/tests/` was touched.

## What is still NOT measured, and belongs to nobody yet

- **The 1-hour TTL.** The node only ever sends the 5-minute `ephemeral` default. Nothing here
  measures the `ttl: "1h"` shape, and no port exposes it.
- **Behaviour past 5 minutes.** B ran ~2 seconds after A. That an entry *expires* is asserted
  nowhere, by anyone, and a spec that waited 5 minutes to prove it would be a 5-minute spec.
- **`modelCost.line`.** Richard, 2026-09-22: *"I don't really care about run costs, the users can
  calculate that themselves."* ⇒ the cost sentence keeps its ruled 2026-09-19 shape and gains no
  clause for cache writes. The numbers remain on the summary object for anyone who wants them.
  **This is now ruled, not pending.**
