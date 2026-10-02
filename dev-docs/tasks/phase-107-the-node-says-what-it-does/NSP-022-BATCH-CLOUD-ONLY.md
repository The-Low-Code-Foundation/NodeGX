# NSP-022 — Batch: the cloud-only nodes

**Opened 2026-10-02 (s21), split from [NSP-014](NSP-014-BATCH-DATA-AND-CLOUD.md) as its status line said it would be.**
**Depends on NSP-007 and NSP-014's BACKEND seam (s21).** **Status: 📋 not started.**

## 1. The person sentence

> **Every node that runs only in the app's cloud functions is specced as the requests it makes and what it does with
> each answer — including failures — so a new cloud runtime can be checked against it.**

## 2. The nodes (from the census)

**17**, the census's `availableIn: ["cloud"]` rows of the old NSP-014 ([CENSUS.md](CENSUS.md); `tiers.json` batch
`NSP-022`). Regenerate the census; do not edit this list by hand.

Add User To Role · Aggregate Records · Create User · Delete User · Get User Roles · HMAC · JWT Sign · JWT Verify ·
List Users In Role · Model Request · Remove User From Role · Request · Response · Secret · Send Email · Update User ·
Verify Session Token (`noodl.cloud.*`).

Census notes carried over: **Aggregate Records** — category Cloud Services but cloud only; **HMAC** — deterministic
given the secret, T1 shape on the cloud target; **JWT Sign** — deterministic given key and clock; **JWT Verify** —
needs the clock for expiry; **Request** — the inbound request, a protocol's first event; **Response** — the outbound
response, a protocol's last event.

## 3. What is special here

- **They run in `noodl-viewer-cloud`, not the browser runtime.** The runtime target (`noodl-runtime/test/helpers/
  node-spec-target.ts`) mounts browser nodes; a cloud target is a second runtime adapter. Measure first what the cloud
  runtime registers and how a function's `Request` → `Response` round trip is driven headless.
- **HMAC, JWT Sign, JWT Verify** need WebCrypto's `importKey` / `sign`, which the world's DIGEST seam left to the host
  (world.ts DIGEST). They are deterministic given key, secret and clock — a seam extension, not a new one.
- **The user-admin nodes** (Create / Update / Delete User, roles) talk to the backend with the master key — through the
  BACKEND seam (R9: the operation, never the wire) if their calls go through the contract's adapter; measure that
  before assuming it.
- These specs are one input to the (uncommitted) Rust backend idea in README §8 — record that, don't act on it.

## 4. Acceptance criteria

As NSP-014 §4.

## 5. Watch for

As NSP-014 §5, and: *a target that cannot be pointed at a world is refused, not run flaky* (NSP-003 §4) — until the
cloud target exists, these specs are refused on the browser runtime with a reason, never counted.

## 6. Built

*(empty)*
