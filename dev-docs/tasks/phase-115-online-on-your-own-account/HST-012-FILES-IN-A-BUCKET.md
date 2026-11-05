# HST-012 — Files in a bucket, and who may upload

**Opened 2026-11-05.** **Depends on HST-010.** **Status: 📋 not started.** Kind: product. Seam 5 of HST-006 §8.7, and
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
