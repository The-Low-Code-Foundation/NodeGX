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
