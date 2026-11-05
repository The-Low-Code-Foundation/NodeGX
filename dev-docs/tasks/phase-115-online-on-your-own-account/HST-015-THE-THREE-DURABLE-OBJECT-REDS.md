# HST-015 — The three Durable Object reds

**Opened 2026-11-05.** **Depends on HST-006 §6.** **Status: 📋 not started.** Kind: product.

## 1. The person sentence

> **A filter that works on the computer either works on Cloudflare or says, before it runs, why it will not.**

## 2. Why

Session 5's conformance run in a Durable Object was 99/102: a regex filter (no JS function in the object's SQL), and
two five-hop path filters (P115-HST006-EXPRDEPTH: the object caps an expression tree at depth 100). Separately the
object refuses BEGIN/COMMIT/SAVEPOINT in SQL (only `transactionSync`), and no conformance case notices a dropped
transaction (P115-HST006-NOROLLBACKCASE).

## 3. What to build

1. Regex declared unsupported by the Durable Object engine, with a sentence, through the contract's capability flags.
2. The path filter's SQL flattened so five hops stay under depth 100 (EXPRDEPTH).
3. A conformance case that grades atomicity, then the engine's transactions through `transactionSync`.

## 4. Acceptance criteria

1. The conformance suite in the object: 102/102 or every red refused by a declared capability.
2. The new atomicity case red on today's DO engine and green after; green in Node throughout.
