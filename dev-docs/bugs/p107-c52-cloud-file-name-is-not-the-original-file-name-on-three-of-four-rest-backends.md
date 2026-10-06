---
id: P107-C52
title: Cloud File's Name is the original file name only on NodeGX — on PocketBase it is the random suffix, on Directus a UUID, on Supabase the bucket path
status: fixed
commit: 214020378
phase: P109
task: ISL-030
severity: medium
area: runtime / Cloud File (`cloudfilenode.ts` Name :30-43), the stored file (`api/cloudfile.ts` — `filename` not kept), `api/backends/fileRef.ts` (each backend's stored `name`)
found: P107 (the node says what it does) s30, 2026-10-03
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Cloud File.json "a PocketBase file Upload File made: Name is the name it was uploaded as (v2, C52)" (and the read-back and Directus rows; Upload File.json "a FileRef with no filename (PocketBase): the stored file keeps the sent file's name (v3, C52)")
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-014-BATCH-DATA-AND-CLOUD.md §6.28–§6.29 (row C52); scenario "a PocketBase file: its stored name's first part is dropped — Name is the random suffix (row C52)" (scenarios/Cloud File.json); PocketBase's stored names measured in dev-docs/tasks/phase-16-runtime-deploy-health/uba-e2e/BCN-007-FILES-PROBE-OUTPUT.txt :62, :97
---

Cloud File's Name says *"Original file name as it was uploaded, without the storage prefix"*. It is computed as the
stored name with everything up to the FIRST underscore dropped (:38-41, "parse prefixes the file with a guid_") — a rule
for one backend, applied to all of them:

- **NodeGX / Parse wire:** stored `bbbbe9fdadf8f3bc_photo.png` → `photo.png`. Correct.
- **PocketBase:** stores `photo.png` as `photo_g235k8arvj.png` (sanitised name + `_` + a random suffix — measured,
  BCN-007 probe :62 `bcn007_pb_g235k8arvj.png`) → Name is **`g235k8arvj.png`**.
- **Directus:** the stored name is the file's UUID (`fileRef.ts` maps `name` to `id`) → Name is a UUID. The original
  name IS on the upload's FileRef (`filename`, from `filename_download`), but the stored file drops it
  (`cloudfile.ts` keeps name, url, contentType, size, target).
- **Supabase:** the stored name is the object's `bucket/path` → Name is that path (and loses its first part when the
  bucket or path has an underscore).

Graded s30 on the runtime target: the PocketBase scenario reads `g235k8arvj.png`, seeds 20729 and 13 and at 10,000.

**Plain words:** *"A Cloud File node's Name is meant to be what the user called the file. On PocketBase it shows a random
code, on Directus a long id, on Supabase a storage path. Make it the real file name?"*

**Proposed:** keep the FileRef's `filename` on the stored file and read it first; fall back to the prefix rule only on
the Parse wire. (A file read back from a record property has no `filename` — the same round-trip limit `contentType` and
`size` already document.) A spec v2.

**Ruling:** R3 (a) — the runtime wins until Richard rules.

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Keep the real name".** The node keeps the uploaded name and shows it. When the name is unknown (a file read back from a record), it shows the stored name whole instead of chopping it. A moderate change. Those read-back files still show a stored name, as their type and size already do. The question as asked: *"Should Cloud File's Name be the name the person uploaded, on every backend?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Fixed 214020378 (P109 ISL-030, 2026-10-06), as ruled (as recommended: the prefix rule kept for the Parse wire).** The stored file keeps the name it was uploaded as and Cloud File's Name reads it first; unknown, a target-addressed file shows its stored name whole, otherwise the Parse prefix is dropped. Cloud File v2, Upload File v3.
