# HLT-019 — a worked example: how caching would work, and does anyone need to configure it?

**Written 2026-09-22 (P99 s16) because Richard would not rule on either shape in §3 of
[HLT-019](./HLT-019-A-MODEL-REQUEST-CANNOT-CACHE-ITS-PROMPT.md):** *"Why don't we flesh out an
example case and see how caching would work and how difficult to configure it actually would be,
or whether the admin needs to configure it at all."*

The HLT-019 task file is the DBT stream's. This note sits beside it and changes nothing in it.
The API facts below come from the current prompt-caching reference, read today, not from memory.
The prices are Claude Opus 5's (`claude-opus-5`, the node's default model: $5 per million input
tokens, $25 per million output). **The prompt sizes and call counts are illustrative**. Nobody has
measured the DBT prompts yet.

## The answer first

**No one needs to configure it.** The node already knows the one boundary that matters: the end
of its `Instructions`. It can mark that point for caching on every call, with no port.

**But the API's own "no configuration" option is the wrong one for this case.** One top-level
`cache_control` field lets the API place the marker, and it places it on the **last** block of
the request. For a function that sends fixed instructions and then one learner's question, that
means after the part that changes. Every call pays to write a cache entry and no call ever reads
one. That is dearer than not caching at all (case C below).

So both shapes in §3 are more than this needs:

- (a) a `Cache Instructions` tickbox asks a graph builder something the node can answer itself;
- (b) cache points anywhere asks them to understand breakpoint placement, and the API's own
  automatic placement shows how easy that is to get wrong.

## How it works, in one paragraph

The API caches a **prefix**, meaning everything up to a marker. The next request that begins with
**the byte-identical same prefix** reads it from the cache instead of processing it again. Writing
the cache costs **1.25×** the normal input price. Reading it costs **0.1×**. An entry lives
**5 minutes**, and each read resets that clock for free. If the prefix is shorter than the
model's minimum (**512 tokens on Opus 5**, up to 4,096 on some older models), nothing is cached
and nothing is charged. It just silently doesn't happen. `usage` reports
`cache_creation_input_tokens` (written) and `cache_read_input_tokens` (read) on every response.

## The example: the DBT lesson projection

One cloud function, one `Model Request` node:

- **Instructions:** the lesson-projection prompt, fixed, the same for every learner. *Say 6,000
  tokens.*
- **Input:** this learner's facts and today's lesson request. *Say 300 tokens, different every call.*
- **Output:** *say 800 tokens.*

What the node sends today (`buildBody`, `modelrequest.ts`):

```json
{ "model": "claude-opus-5", "max_tokens": …,
  "system": "<6,000 tokens of instructions>",
  "messages": [{ "role": "user", "content": "<this learner, 300 tokens>" }] }
```

What it would send. The only change is that `system` becomes one block carrying a marker:

```json
{ "model": "claude-opus-5", "max_tokens": …,
  "system": [{ "type": "text", "text": "<6,000 tokens of instructions>",
               "cache_control": { "type": "ephemeral" } }],
  "messages": [{ "role": "user", "content": "<this learner, 300 tokens>" }] }
```

Per call, input only (output costs the same in every case: 800 × $25/M = $0.020):

| | tokens | cost |
|---|---|---|
| no caching | 6,300 at 1× | **$0.0315** |
| cache **write** (first call, or after 5 quiet minutes) | 6,000 at 1.25× + 300 at 1× | $0.0390 |
| cache **read** (another call within 5 minutes) | 6,000 at 0.1× + 300 at 1× | **$0.0045** |

### Case A: 200 learners, lessons generated in the morning

Two hundred calls in an hour, one every ~18 seconds. The entry never goes quiet for 5 minutes, so
that's **1 write and 199 reads**:

- no caching: 200 × $0.0315 = **$6.30** of input
- instructions marked: $0.039 + 199 × $0.0045 = **$0.93** of input, **85% less**

That is the case HLT-019 was opened for, and the marker alone gets it.

### Case B: the same function, called rarely

One call every 30 minutes, say an evaluator that runs whenever a learner finishes a lesson on a quiet day. Every call finds the entry expired,
so **every call writes and none reads**: $0.039 against $0.0315, **24% more**.

This is the only case where marking by default costs anything. It costs the most exactly when
the function is called least, so the absolute amount stays small: 48 calls a day × $0.0075 ≈
**$0.36/day**.

*The 1-hour TTL would rescue this case*, since each read resets the clock and a call every
30 minutes would read every time after the first ($0.27/day instead of $1.51 uncached). But it
moves the penalty: a write costs **2×**, not 1.25×, so a function called *less* than hourly pays
**+95%** on its instructions instead of +24%. Whichever TTL you pick, one call pattern pays. The
5-minute default makes that pattern pay the smaller amount, and that pattern is the rare-call
one, where totals are small anyway.

### Case C: the API's automatic caching instead

Top-level `cache_control` puts the marker on the **last** block, which is the learner's 300
tokens. Each call writes an entry ending in *that learner's* text, which no other call begins
with. So **every call writes 6,300 tokens at 1.25× and nothing is ever read**: $0.0394 per call,
**25% more than no caching**, at any call rate. The reference names this exact signature: *"a
pure surcharge"* when the prompt ends in per-request content. Some proxies and gateways (the node
has a `Base URL` port) also reject the top-level field. **Do not use it for this node's first
marker.**

### Case D: short instructions

A 300-token prompt is under Opus 5's 512 minimum. The marker is ignored: no error, no charge,
`usage` reads 0 written and 0 read. A graph that marks by default loses nothing.

### Case E: what actually breaks caching, which no tickbox fixes

Caching needs the instructions to be **byte-identical** between calls. A graph that builds its
instructions as *"You are tutoring {learner name}…"* has a different prefix for every learner
and never reads the cache. This is the one real mistake a graph builder can make, and it's
about **where they put the varying text** (in `Input`, not `Instructions`), not about a setting.
The node can't prevent it. What it can do is make it visible: Usage showing a write on every call
and reads of 0 is the signature. The docs page should say so in one sentence.

## What this suggests building (to be ruled)

1. **No port.** When `Instructions` is set, `system` is sent as one text block with
   `cache_control: { type: "ephemeral" }` (5-minute TTL). No top-level `cache_control`.
2. **Usage gains `cacheWriteTokens`** (from `cache_creation_input_tokens`) beside
   `cacheReadTokens`, and the execution record's `modelCalls` carries both. Without it, case B
   and case E are invisible.
3. **The docs page** says what the two numbers mean, and that varying text belongs in `Input`.
4. *Later, only if a chat-shaped graph needs it:* when `Messages` carries a history, a second
   marker on the last message makes the conversation so far readable next turn. That is the case
   automatic caching *is* right for. Not needed for the DBT engine.

What this changes in HLT-019 §4: AC1's "with the port off, byte-identical" becomes "with no
Instructions, the body is byte-identical to today's; with Instructions, `system` is the one marked
block and nothing else changes". AC2 to AC5 stand as written. AC2 (live: first call writes,
second reads) is still the proof, and it needs a real key.

**The decision left for Richard:** is ~$0.36/day on a rarely-called function (case B) an
acceptable price for nobody ever having to think about caching? If yes, build 1–3 with no port.
If no, add a `Cache Instructions` switch that defaults to **on**, so the common case still needs
nothing.
