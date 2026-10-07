# HST-006 — The backend contract on Workers and D1

**Opened 2026-10-07.** **Depends on HST-002, P34's `@noodl/backend-contract`.** **Status: 📋 not started.** Kind: experiment.

## 1. The person sentence

> **A full-stack app with records and users, and still no server to look after. The records are in a database on the
> person's Cloudflare account, exportable before anything expires, and the bill is $5 plus whatever D1 charges past
> its free tier.**

## 2. Why

README §4: the Workers route wins shape C only if a Workers + D1 adapter can honour enough of the contract. Nobody
knows how much. The contract exists as types and frozen data with no I/O (`@noodl/backend-contract`), which is exactly
the shape a second adapter registers against, and the backend's operational store already speaks SQLite, which D1 does.

## 3. What to measure

For each capability the contract names (data, auth, filters, roles, files, realtime, mail, triggers): does D1 plus
Workers honour it against the contract's own tests, and if not, what does (R2 for files, Durable Objects for realtime,
a mail API for `nodemailer`)? A table, one row per capability, with the test that graded it.

Also: the exit. ECO-004 says records must be retrievable. One command exports every D1 table to files the person can
read, graded by reimporting into the Node backend.

## 4. Acceptance criteria

1. The capability table exists with every row graded by a test, not by reading the docs.
2. Fixture C's `MUST.md` is ticked from Workers + D1, or the rows that block it are named.
3. The export-and-reimport round trip passes on fixture C's records.
4. A recommendation for R3 at the top of this file, with the cost of the adapter in rows that failed.

## 5. Not this task

Shipping the adapter. Migrating anyone. Mail, if nothing on Cloudflare sends it: that row says "elsewhere" and stops.
