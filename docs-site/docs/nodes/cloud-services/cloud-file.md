---
title: "Cloud File"
---
Unwraps a cloudfile value into its name and URL, for display or download links.

Cloud File takes a `cloudfile`-typed value — produced by Upload File or stored on a record's file property — and exposes its `name` and `url` as strings. It performs no requests; it is a value adapter between the opaque cloud-file handle and the string-typed inputs the UI actually wants (an Image `src`, a link, a caption).

## When to use it

Whenever a file handle needs to become a URL or filename. Note the cloudfile→image typecast lets a cloudfile feed an Image `src` directly; reach for Cloud File when you need the URL as a *string* or the file's name.

## At a glance

| | |
|---|---|
| Category | Cloud Services |
| Type name | `Cloud File` |
| Available in | browser, cloud |
| SSR compatibility | safe |
| Provided by | `noodl-runtime` |
| Behaviour spec | version 2 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `file` | Cloudfile | — | Stored file to read, as an Upload File node or a record property produces it; any other value leaves the previous file in place |

### What each input does

**Cloud File** (`file`)

- a stored file: held, and URL, Name, Content Type and Size are sent from it
- anything else (nothing, text, a plain object): ignored — the file held before stays, nothing is sent

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `contentType` | String | — | MIME type the backend recorded on upload; empty on a backend that does not report one, and on a file read back from a record property |
| `name` | String | — | Original file name as it was uploaded, without the storage prefix |
| `size` | Number | — | Size in bytes the backend recorded on upload; empty on a backend that does not report one, and on a file read back from a record property |
| `url` | String | — | Address the file can be fetched from; a private file needs a Sign File URL node before this link works |

## Examples

**Create a record with an uploaded file attachment**

The create-with-attachment flow: Open File Picker hands the picked browser file to Upload File, which stores it in cloud storage and outputs a `cloudFile`. Cloud File exposes that file's `url`, previewed in an Image (the cloudfile→image cast). When the upload succeeds, Create Record (NewDbModelProperties) writes a new 'Attachment' record whose properties — including the file — are set on the node's schema-generated inputs.

**Load a rich-text editor from a CDN at runtime**

The interesting node here is the one that loads nothing visual: a `JavaScriptFunction` that injects a `<script>` tag and resolves once it has loaded, so the editor library arrives at run time rather than being bundled. That is the pattern to take away — it is how any large third-party library gets into a NodeGX app without inflating the build. The `Javascript2` node then mounts TinyMCE onto a `Group`'s element, a `CSS Definition` reconciles the editor's chrome with the project's tokens, and `Cloud File` plus `NewDbModelProperties` give pasted images somewhere to live. ⚠️ `tinymce-api-key` is a `String` node holding an empty value — TinyMCE's CDN build wants your own key, and this graph deliberately does not carry one.

## Related nodes

[Upload File](./upload-file.md), [Image](../visual/image.md), [External Link](../navigation/net-noodl-externallink.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

[How export works](../../how-export-works.md) shows what an export writes, with a worked example.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 2. The spec is the reference the conformance tests grade the runtime against. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

Nothing. Its outputs depend only on its inputs and its own state.

### Starting state

```json
{}
```

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/cloud-file.ts"
/**
 * Cloud File (`Cloud File`) — read from `packages/noodl-runtime/src/nodes/std-library/data/cloudfilenode.ts` on 2026-10-03
 * (NSP-014 s30), with the stored file it reads, `api/cloudfile.ts`.
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE: the node holds ONE stored file and reports four of its fields. A value that is a stored file (the runtime's
 * `instanceof CloudFile`, :76; here `isStoredFile` — what canonical.ts tags `$cloudFile`) replaces the held one and sends
 * all four outputs (:79-83); ANY other value — `null`, a string, a plain object with the same keys — leaves the held file
 * in place and sends nothing (:76-78). The outputs read the held file: URL (:27), Content Type (:55) and Size (:64) its
 * getters, `undefined` (never sent, C3) when it did not carry one; Name (v2, row C52 ruled "Keep the real name") the name
 * the file was uploaded as when it carries one (`getFilename`); else, for a file addressed by a target (PocketBase,
 * Supabase), its stored name whole; else its stored name with everything up to the FIRST underscore dropped — Parse's
 * `<guid>_` prefix — when there is one: `abc_my_photo.png` → `my_photo.png`, `plain.png` → `plain.png`, `_x` → `x`.
 * v1 applied that last rule to every file, so PocketBase's `photo_g235k8arvj.png` showed `g235k8arvj.png`.
 *
 * No world: a stored file carries everything the node reports, and the node asks nothing of the backend.
 *
 * NOT GRADED HERE, named:
 *   - `getInspectInfo` (:17-19) — the editor's inspector, not a port.
 *   - a stored file with no name (`getName()` not a string): the Name getter calls `.split` on it and throws. No backend
 *     hands one (the contract's `FileRef.name` is required) and no scenario makes one.
 */

import { isStoredFile, type StoredFileLike } from '../canonical';
import { defineNode } from '../spec';

type CloudFileState = {
  /** `_internal.cloudFile` (:8) */
  file: StoredFileLike | undefined;
};

/** Stored files the generator hands, beside the cross-type pool: Parse-prefixed, plain, with and without the optional fields. */
export const STORED_FILES: readonly unknown[] = [
  { $cloudFile: { name: 'abc_photo.png', url: 'https://files.example/abc_photo.png', contentType: 'image/png', size: 3 } },
  { $cloudFile: { name: 'abc_my_photo.png', url: 'https://files.example/abc_my_photo.png' } },
  { $cloudFile: { name: 'plain.png', url: 'https://files.example/plain.png', size: 0 } },
  // PocketBase's stored name: the upload's name sanitised, a random suffix appended (BCN-007-FILES-PROBE-OUTPUT.txt :62)
  { $cloudFile: { name: 'photo_g235k8arvj.png', url: 'https://pb.example/api/files/notes/r1/photo_g235k8arvj.png', target: { kind: 'record', collection: 'notes', recordId: 'r1', field: 'attachment' } } },
  // Directus's: the file's UUID (fileRef.ts DIRECTUS_FILE_FIELDS — `name` is `id`)
  { $cloudFile: { name: '6f1c0a52-1b6e-4c1e-9a2b-1d2c3e4f5a6b', url: 'https://directus.example/assets/6f1c0a52-1b6e-4c1e-9a2b-1d2c3e4f5a6b' } },
  // v2 (C52): files that know the name they were uploaded as — Directus's reported one, PocketBase's from Upload File
  { $cloudFile: { name: '6f1c0a52-1b6e-4c1e-9a2b-1d2c3e4f5a6b', url: 'https://directus.example/assets/6f1c0a52-1b6e-4c1e-9a2b-1d2c3e4f5a6b', filename: 'holiday photo.png' } },
  { $cloudFile: { name: 'photo_g235k8arvj.png', url: 'https://pb.example/api/files/notes/r1/photo_g235k8arvj.png', target: { kind: 'record', collection: 'notes', recordId: 'r1', field: 'attachment' }, filename: 'photo.png' } },
  // a plain object with a stored file's keys: dropped
  { name: 'abc_photo.png', url: 'https://files.example/abc_photo.png' }
];

const names = (s: Readonly<CloudFileState>) => {
  if (!s.file) return undefined;
  // v2 (row C52 ruled "Keep the real name"): the name it was uploaded as, when known
  const filename = typeof s.file.getFilename === 'function' ? s.file.getFilename() : undefined;
  if (typeof filename === 'string' && filename !== '') return filename;
  // v2: a file addressed by a target (PocketBase, Supabase) — its stored name whole; v1 chopped it at its first underscore
  if (s.file.getTarget() !== undefined) return String(s.file.getName());
  // :38-41 — "parse prefixes the file with a guid_" (a Directus UUID has no underscore: whole either way)
  const n = String(s.file.getName()).split('_');
  return n.length === 1 ? n[0] : n.slice(1).join('_');
};

export const CloudFile = defineNode({
  type: 'Cloud File',
  // v2 (P109 ISL-030, row C52 ruled "Keep the real name"): Name is the name the file was uploaded as when it is known; else a
  // target-addressed file's stored name whole; else the Parse wire's prefix dropped. v1 dropped everything to the first
  // underscore on every backend (PocketBase showed its random suffix).
  version: 2,
  source: 'packages/noodl-runtime/src/nodes/std-library/data/cloudfilenode.ts; api/cloudfile.ts',
  state: { file: undefined } as CloudFileState,
  inputs: {
    // :69-85
    file: {
      type: 'cloudfile',
      coerce: 'none',
      displayName: 'Cloud File',
      group: 'General',
      description: 'Stored file to read, as an Upload File node or a record property produces it; any other value leaves the previous file in place',
      examples: STORED_FILES
    }
  },
  outputs: {
    // :21-29
    url: { type: 'string', displayName: 'URL', group: 'General', description: 'Address the file can be fetched from; a private file needs a Sign File URL node before this link works', from: (s) => s.file?.getUrl() },
    // :30-43
    name: { type: 'string', displayName: 'Name', group: 'General', description: 'Original file name as it was uploaded, without the storage prefix', from: names },
    // :49-57
    contentType: {
      type: 'string',
      displayName: 'Content Type',
      group: 'General',
      description: 'MIME type the backend recorded on upload; empty on a backend that does not report one, and on a file read back from a record property',
      from: (s) => s.file?.getContentType?.()
    },
    // :58-66
    size: {
      type: 'number',
      displayName: 'Size',
      group: 'General',
      description: 'Size in bytes the backend recorded on upload; empty on a backend that does not report one, and on a file read back from a record property',
      from: (s) => s.file?.getSize?.()
    }
  }
}).on({
  // :75-84 — only a stored file is taken, and then all four are sent
  file: (_s, v) =>
    isStoredFile(v)
      ? { says: 'a stored file: held, and URL, Name, Content Type and Size are sent from it', set: { file: v }, send: ['name', 'url', 'contentType', 'size'] }
      : { says: 'anything else (nothing, text, a plain object): ignored — the file held before stays, nothing is sent', send: [] }
});
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
