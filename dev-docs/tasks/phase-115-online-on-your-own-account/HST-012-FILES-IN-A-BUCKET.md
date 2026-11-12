# HST-012 — Files in a bucket, and who may upload

**Opened 2026-11-05.** **Depends on HST-010.** **Status: ✅ done, session 10 (2026-11-05), §5.** Kind: product. Seam 5 of HST-006 §8.7, and
P115-HST006-NOFILESRULE (medium).

## 1. The person sentence

> **A file the owner uploads is kept in their own Cloudflare bucket, with no keys to type, and the person building the
> app can say who may upload.**

## 2. Why

The spike patches `LocalDriver.prototype` to keep bytes in an R2 binding under the same keys (`kind` stays `local`, so
no `_Files` row changes meaning). A product needs a driver of its own, and an honest `kind`. Separately, no MCP tool
sets the files rule (`security.json` → `files: { upload, read, delete }`, default upload: any signed-in account), so
Fixture C's owner-only upload cannot be said through the MCP.

## 3. What to build

1. A storage driver over a bucket binding (`put`, `get`, ranged `get`, `head`, `delete`, `list`), chosen when the host
   hands a bucket; its `kind` decided with the `_Files` rows and the sweep read, not guessed.
2. An MCP tool (or a `files` field on an existing one) that sets `files.upload/read/delete`.

## 4. Acceptance criteria

1. Unit: the driver against a fake bucket, including a ranged read and the sweep's listing.
2. Fixture C's upload on `hst-backend-spike` without the prototype patch: 201, the link 200 signed out.
3. Fixture C's files rule set through the MCP to the owner's role; a reader's upload refused with a sentence.

## 5. Session 10 (2026-11-05): built, graded, live

### 5.1 The driver, and its `kind`

`storage/BindingDriver.ts`: a `StorageDriver` over a bucket binding (`put`/`get`/ranged `get`/`head`/`delete`/paged
`list`; the interface is the part of Cloudflare's `R2Bucket` it calls, so the binding goes in as it is). The host
hands it in as **`BackendServiceOptions.filesBucket`** (not a CLI flag, as `loopbackFetch` and `dataDirStore` are not).

`kind` is **`binding`**, a third one, decided by reading what a row's `driver` does: `FileSubsystem.driverFor` serves
a file from the store its `_Files` row names (BMG-015), and the orphan sweep keys blobs by `kind:key`. `local` means
"the folder beside the data dir", `s3` "the bucket files.json names, reached with the stored keys"; neither is true of
these bytes, and reusing `local` (what session 7's patch did) would make a data dir moved off a Worker serve every
file from an empty folder with no sentence. So:
- with a binding, it is where uploads go when files.json names no bucket (it takes the disk's place); a bucket typed
  on the Storage page still wins for the next upload, and a `binding` row stays served from the binding;
- `stores()` = local, binding, s3 (each present one): the sweep walks the bucket;
- the listing yields only file-shaped keys (`isFileKey`, as `S3Driver` since BMG-017): a backup archive or anything
  else in the same bucket is never listed, so never deleted by *Delete orphans*;
- a `binding` row on a backend started without one: **500 with a sentence** naming the bucket and the binding, not a
  404 or an empty body (same as an `s3` row with no bucket connected);
- the Storage page: chip *stored in this app's bucket*, the first tile *This app's bucket* (*no address, no keys*)
  instead of *This machine* (`hostBucket` on `GET /admin/files/config`).
- Reads buffer the object (`arrayBuffer`); a ranged read asks the bucket for the slice only.

### 5.2 AC1: unit, against a fake bucket

`tests/helpers/fake-bucket.ts` (a Map shaped as `R2Bucket`, listing paged two at a time, every call recorded).
- `storage-driver.test.ts`: the shared conformance suite now runs on the binding too, and grew three cases every
  driver must pass: **a ranged stream**, a missing key's stream errors (never an empty file), `listEntries` gives an
  age. LocalDriver passes them (the first run caught a jest realm trap: `fs.Stats.mtime` is not `instanceof` jest's
  `Date`; the driver checks `getTime` too, since a binding's Date may come from another realm).
- `p115-hst012-binding-driver.test.ts` (7, whole service): upload → bucket not disk, row `binding`; link 200 signed
  out, `Range: bytes=10-19` → 206 and the bucket asked for `{offset 10, length 10}` only; delete removes the object;
  **the sweep** keeps a file with a row, deletes an hour-old blob without one, never lists `backups/…tar.gz`; a typed
  bucket wins the next upload while the `binding` row still serves; the config says `hostBucket`; restarted without
  the binding → the sentence; with it again → 200.
- **6 mutants, 6 killed** (no key filter, one page only, range ignored, binding never default, sweep skips the
  binding, `driverFor` ignores `binding`). Both type checks clean; the backend's file and security suites: 24 green
  (207 tests), the 6 gated `two-005-*-mutants` suites skipped as always, the Chrome `-drive` ones not run (sandbox).

### 5.3 AC2: Fixture C on `hst-backend-spike`, no prototype patch

The spike's `LocalDriver.prototype` patch is gone: the Worker passes `env.FILES` as `filesBucket` (wrapped only to
count calls for `/__hst/ledger`). Session 7's uploads have rows saying `local` over bytes in R2, which the product
driver would read from the isolate's memory: the Worker points each such row whose key IS in the bucket at `binding`
once (compare-and-set, as `moveToBucket.ts`), at start.

Rehearsed under `wrangler dev` over one persisted state: session 9's worker (🔴 `HST_ENTRY` must be in WRANGLER's
env: `wrangler dev` runs `[build] command` itself and rebuilds the default entry over a hand build) seeded Campus and
stored a file as `local` (15/15); the HST-012 worker over the same state: the old link 200, `fileRowsToBinding: 1`, a
new upload `binding`, 14/14; restarted: `fileRowsToBinding: 0`, no bucket lookups, both links 200.

Live (Richard's Campus, nothing re-seeded):
| reading | result |
|---|---|
| before (session 9's `16875ec8`) | 12/12; 4 files, all rows `local`, all 200 (his PDF, 201,702 B) |
| deploy `d5f4656d` (HST-012) | the 4 links 200 (same sizes); `fileRowsToBinding: 4`; the owner's new upload **201**, row `binding`, link **200 signed out**; 14/14 |
| deploy `d728174c` (the refusal sentence) | 12/12; the PDF 200 |

### 5.4 AC3: the files rule through the MCP

`set_file_permissions { upload?, read?, delete? }` (noodl-mcp backend group, write-gated; P115-HST006-NOFILESRULE
fixed): merges over the backend's rule, `PUT /admin/permissions`, then the same `files` into the project's
`nodegx.security.json`, both or neither. A refused file call now says what was refused: *"Permission denied: you
may not upload files to this app."* (was *"…for this file operation."*, which named nothing; nothing pinned it).
- `noodl-mcp/tests/p115Hst012FileRules.test.ts` (2, a real enforced backend): before, a reader uploads (the
  finding); set `role:owner` → held by the backend, in the file; the reader 403 with the sentence, the owner 201 and
  the link 200; a field left out keeps its rule; nothing said is refused; a malformed rule changes neither side.
  Mutants: no merge, no mirror: both killed. `toolDisclosure` (the budget gate) and the tool-list suites: 64/64.
- **Fixture C**, through its own MCP (`fixtures/mcp-calls.mjs`, the log now also redacts an
  `x-parse-session-token` header): `set_file_permissions { upload: "role:owner" }` → `nodegx.security.json` files
  `role:owner`; on its local backend the second account **403** with the sentence, the owner **201**, the link
  **200**, signed out **403**.
- **Live**: the MCP cannot reach a remote backend, so the fixture's rule was carried to `hst-backend-spike` with the
  request the tool sends (`PUT /admin/permissions`, the collections unchanged); kept in the object's store
  (`security.json` read back from it). Graded as the page calls it: owner **201** + link **200** signed out, the
  second account **403** *"Permission denied: you may not upload files to this app."*, signed out the same. Carrying
  the project's rules at deploy is HST-014's job (AC: the deploy writes `nodegx.security.json`, never wipes).

**AC1 ✅ AC2 ✅ AC3 ✅.** Richard's phone: nothing he sees changed except that only the owner can upload now; his
upload (MUST 8) still works the same way.

### 5.5 Left, and found

- Backups on a Worker still do not exist (HST-011 §5.5); a binding's files would need the backup to read the binding.
- The mover (*Move files to the bucket*) moves `local` rows to a typed bucket only; `binding` rows stay where they are.
- **P115-S10-MCPTSCRUNTIME** (low, filed): noodl-mcp's `typecheck` is red on `@cloud-runtime` through
  `tests/p128PreviewCut.test.ts` → `steps/kinds` → `steps/records.ts`'s type import of `WorkflowRunner` (P132). Not
  this ticket's: s10 added no import; every s10 file is clean.
