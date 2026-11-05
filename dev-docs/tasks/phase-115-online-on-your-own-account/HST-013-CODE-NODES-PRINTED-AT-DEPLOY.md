# HST-013 — Code nodes printed at deploy

**Opened 2026-11-05.** **Depends on HST-010.** **Status: 📋 not started.** Kind: product. Fixes P115-HST004-NOCODEGEN
(high).

## 1. The person sentence

> **A cloud function with a Function, Expression or Script node in it answers on Cloudflare as it does on the
> computer.**

## 2. Why

A Worker refuses `new Function` and `eval` (*Code generation from strings disallowed*). The cloud runtime compiles
each code node's text when the function loads, so on a Worker the node answers a default with 200 (Expression) or the
call waits out the 30 s timeout and answers 504 (Function). All 6 reds left in `p127-no-roles` after HST-010 are this.

## 3. What to build

At deploy, every code node's text in every cloud function is printed as a real function into the Worker's bundle,
keyed by node id; the runtime looks there before compiling a string. A code node whose text cannot be printed refuses
the deploy by name, never at a visitor's call.

## 4. Acceptance criteria

1. `p127-no-roles` 11/11 in the Durable Object.
2. A cloud function with each of the three code nodes answers the same on `wrangler dev` as in Node.
3. Node: unchanged (nothing printed, the runtime compiles as today).
