---
id: P121-TWO001-MEMBERSPHOTO
title: A photo only a community's members may see has no shape — a private file is its uploader's alone, a public one anyone's with the link
status: fixed
commit: 672b8b58c
severity: high
area: backend / files (`packages/nodegx-backend/src/server/files.ts` private upload :30-45, `assertReadable` :249-258)
found: P121 TWO-001 s2, 2026-10-14
evidence: dev-docs/tasks/phase-121-a-marketplace-and-a-community/TWO-001-THE-TWO-WORLDS.md §7.3
phase: P121
regression: packages/nodegx-backend/tests/files-http.test.ts
---

The community template's rule for children (W1, Richard 2026-10-14) is that nothing a member posts is public: posts,
profiles and their photos are seen only by members who have been let in. The policy keeps that for every row
(`templates/gram/nodegx.security.json`, `two-001-gram-policy.test.ts`), but not for the photos, because the file
model has two settings and neither is "members":

- **Private** (`X-NodeGX-File-Private: true`): the file's ACL grants its uploader alone. Another approved member is
  refused the file and refused a signed link to it.
- **Not private**: anyone holding the URL reads it, with no account. The name's random 16-hex prefix is the only
  thing between a stranger and a child's photo, and a URL is copied, shared and logged.

Measured 2026-10-14 against the gram's policy on a fresh `BackendService` (ann and bob both `role:member`):

| | status |
|---|---|
| ann uploads a private photo | 201 |
| ann reads it | 200 |
| bob (an approved member) reads it | **403** |
| bob asks for a signed link | **403** |
| anonymous reads it | 403 |
| ann uploads a non-private photo; anonymous reads it | **200** |

Reproduce: the probe in the TWO-001 §7.3 description (upload with a session token, read with another member's).

Why it matters: the feed shows every member's photos to every other member. With private files the feed shows
nothing but your own; with public ones W1 is not kept. A cloud function running as the system could mint a signed
link for each photo on each read, which works but puts a function call in front of every image in a feed on a
slow connection, and every template that wants "members only" would rewrite it.

Fix, proposed: let a private upload name who may read it as a rule value the policy already speaks (for example
`X-NodeGX-File-Read: role:member`, written into the file row's ACL as `role:member`), refused unless the uploader
holds that role; `/sign` then admits any principal the ACL admits, as it already does for the uploader. Medium: the
upload handler, the ACL validator, and Upload File's `private` input growing a "who reads it" option. Owner: NONE
yet; TWO-005 (the community app) cannot ship photo posts without it.

**Built 2026-10-15 (P121 s12, TWO-005 §7), in the working tree.** Re-measured first: `files.ts` unchanged since it was
filed. The fix is the one proposed above:

- **`X-NodeGX-File-Readers: role:member, role:admin`** on an upload makes the file private and gives each role a
  read-only entry in the file row's ACL, beside the owner's read+write (`MetadataStore.create`). The one ACL check
  decides reading and `/sign`; deleting stays the uploader's.
- Only `role:<name>` is accepted, at most 8, refused in words naming the bad part (400). The uploader must hold at
  least one role they name (403 "You can share a file only with a role you hold…"), checked before the body is read;
  the master key may name any. A master-key upload with readers is no longer readable by everyone.
- In the CORS allow-list the day it was made (`ops/headers.ts`; the Private header was found missing by an exported
  app, EXP-011 §45).
- Upload File has a **Readers** input (string); `UploadFileOptions.readers` in the contract; the Parse wire sends the
  header trimmed, nothing when blank. Node spec, both catalogues, the node docs and the CHR-007 snapshot carry it.

The gram's policy spec now runs this bug's table again: ann's photo shared with `role:member, role:admin` reads 200
for bob and the pastor and signs for them; wes (waiting), zed (blocked) and a stranger are 403 on both; bob cannot
delete it. Six hand mutants (readers ignored, no role check, readers may write, readers not private, the CORS line,
no cap) all red; the runtime's conformance run went red with Readers dropped from the node's call.

Found on the way: the code export drops Readers and uploads the photo public (**P121-TWO001-EXPORTREADERS**, high,
P18's). A page script cannot sign a file (`Noodl.Files` has only `upload`): a feed signs each photo with a Sign File
URL node.

