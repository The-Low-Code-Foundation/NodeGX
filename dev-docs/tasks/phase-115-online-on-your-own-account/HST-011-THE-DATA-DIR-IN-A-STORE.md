# HST-011 — The data dir in a store it is handed

**Opened 2026-11-05.** **Depends on HST-010.** **Status: 📋 not started.** Kind: product. Seam 3 of HST-006 §7.2.

## 1. The person sentence

> **The app's rules, roles, keys and secrets are still there after Cloudflare restarts it, as its records already are.**

## 2. Why

The backend keeps `security.json`, `secrets.json`, `auth.json` and friends as files in its data dir. On a Worker
`node:fs` is the isolate's memory: replaced on an eviction or a redeploy. The spike copies the dir into the Durable
Object's storage after every non-GET and starts the service again from it (HST-006 §8.3), by reading the whole tree
each time: fine for a spike, not a product.

## 3. What to build

The service writes those files through one seam it is handed (a small key-value store: `get`, `put`, `delete`, `list`),
with the disk as today's default; on a Worker, the object's storage. A service that finds no running instance starts
from the store. Census first: every `fs` write under the data dir (`grep` by the dir, not by file name).

## 4. Acceptance criteria

1. Census of every data-dir write, each routed or named as out of scope with a reason.
2. Node: every backend suite unchanged.
3. On `hst-backend-spike` without the spike's `persistDir`: Fixture C's rules, role and secret survive a redeploy
   (`autoBoots: 1`), and MUST 1–8 still pass.
