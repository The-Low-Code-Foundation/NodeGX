/**
 * HTX-006. The disk half of `nodegx export --target html --component`: one part written into a folder another page's
 * own code shares, and written again after a Studio edit without touching that code.
 *
 * The rule is the manifest's (`nodegx-export.json`): every file this export writes, with the SHA-256 of what it wrote.
 *
 * - A re-export writes what changed, removes what it wrote last time and no longer writes, and leaves every other file
 *   in the folder as it is. A file the export writes with the same bytes is not written again (its time stays).
 * - It refuses, by name and writing nothing, when a file it wrote was changed by hand since, when a file it would write
 *   is already there and is not its own (the page's own `lib/core.js`, say), or when the folder holds another part's
 *   export. Each is a decision for a person; the export only says which files.
 *
 * `writeExport` (the whole app's writer) is not used: it overwrites by name, which is right in a folder the export owns
 * and wrong in one it shares.
 */

import { createHash } from 'crypto';
import type * as fsType from 'fs';
import * as path from 'path';

export const PART_MANIFEST = 'nodegx-export.json';

export type PartFs = Pick<typeof fsType, 'existsSync' | 'readFileSync' | 'mkdirSync' | 'writeFileSync' | 'unlinkSync' | 'readdirSync' | 'rmdirSync' | 'statSync'>;

export interface PartManifest {
  /** What wrote it, so a person reading the folder knows. */
  writtenBy: string;
  /** The part's path in the project. */
  component: string;
  /** The project's name, as it said when exported. */
  project: string;
  /** The entry a host page imports and the stylesheet it links. */
  entry: { js: string; css: string; mount: string };
  /** Every file written, relative to the folder → its SHA-256, hex. */
  files: Record<string, string>;
}

export interface PartOutput {
  files: Record<string, string>;
  copies: ReadonlyArray<{ from: string; to: string }>;
  component: string;
  entry: { js: string; css: string; mount: string };
}

export type PartWrite =
  | { ok: true; written: string[]; unchanged: string[]; removed: string[]; first: boolean }
  | { ok: false; reason: string; files: string[] };

const sha256 = (bytes: Buffer | string): string => createHash('sha256').update(bytes).digest('hex');

/**
 * Writes `output` into `outDir` under the manifest rule. Everything is decided before anything is written: a refusal
 * writes nothing.
 */
export function writePart(projectDir: string, projectName: string, outDir: string, output: PartOutput, fs: PartFs): PartWrite {
  const manifestPath = path.join(outDir, PART_MANIFEST);
  let before: PartManifest | undefined;
  if (fs.existsSync(manifestPath)) {
    try {
      before = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as PartManifest;
    } catch {
      return { ok: false, reason: `${PART_MANIFEST} in ${outDir} cannot be read as JSON, so this export cannot tell which files are its own. Nothing was written.`, files: [PART_MANIFEST] };
    }
    if (typeof before.files !== 'object' || before.files === null || typeof before.component !== 'string') {
      return { ok: false, reason: `${PART_MANIFEST} in ${outDir} is not one this export wrote. Nothing was written.`, files: [PART_MANIFEST] };
    }
    if (before.component !== output.component) {
      return {
        ok: false,
        reason: `${outDir} holds the export of "${before.component}", not "${output.component}". Two parts in one folder would share ${PART_MANIFEST} and each would remove the other's files: export "${output.component}" into a folder of its own. Nothing was written.`,
        files: [PART_MANIFEST]
      };
    }
  }

  // The bytes this export writes now, by path: the generated text, and each copy's own bytes.
  const next = new Map<string, Buffer>();
  for (const [file, text] of Object.entries(output.files)) next.set(file, Buffer.from(text, 'utf8'));
  for (const c of output.copies) next.set(c.to, fs.readFileSync(path.join(projectDir, c.from)) as Buffer);
  if (next.has(PART_MANIFEST)) throw new Error(`The export would write its own ${PART_MANIFEST}.`);

  const owned = before?.files ?? {};
  const handEdited: string[] = [];
  for (const [file, hash] of Object.entries(owned)) {
    const at = path.join(outDir, file);
    if (fs.existsSync(at) && sha256(fs.readFileSync(at) as Buffer) !== hash) handEdited.push(file);
  }
  if (handEdited.length > 0) {
    return {
      ok: false,
      reason:
        `${handEdited.length === 1 ? 'A file' : `${handEdited.length} files`} this export wrote ${handEdited.length === 1 ? 'was' : 'were'} changed since, by hand or by something else: ` +
        `${handEdited.join(', ')}. Exporting again would lose ${handEdited.length === 1 ? 'that change' : 'those changes'}. Move ${handEdited.length === 1 ? 'it' : 'them'} aside (or put back what the export wrote) and export again. Nothing was written.`,
      files: handEdited.sort()
    };
  }
  const notOurs = [...next.keys()].filter((file) => !(file in owned) && fs.existsSync(path.join(outDir, file))).sort();
  if (notOurs.length > 0) {
    return {
      ok: false,
      reason:
        `${notOurs.length === 1 ? 'A file' : `${notOurs.length} files`} this export would write ${notOurs.length === 1 ? 'is' : 'are'} already in ${outDir} and ${notOurs.length === 1 ? 'is' : 'are'} not ${before ? 'listed in its manifest' : 'its own'}: ` +
        `${notOurs.join(', ')}. The export never writes over a file it did not write: move ${notOurs.length === 1 ? 'it' : 'them'}, or export into another folder. Nothing was written.`,
      files: notOurs
    };
  }

  const written: string[] = [];
  const unchanged: string[] = [];
  const files: Record<string, string> = {};
  for (const [file, bytes] of [...next].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const hash = sha256(bytes);
    files[file] = hash;
    const at = path.join(outDir, file);
    if (owned[file] === hash && fs.existsSync(at)) {
      unchanged.push(file);
      continue;
    }
    fs.mkdirSync(path.dirname(at), { recursive: true });
    fs.writeFileSync(at, bytes);
    written.push(file);
  }
  const removed: string[] = [];
  for (const file of Object.keys(owned).sort()) {
    if (next.has(file)) continue;
    const at = path.join(outDir, file);
    if (fs.existsSync(at)) fs.unlinkSync(at);
    removed.push(file);
    // A folder the export emptied goes too; one that holds anything else stays.
    for (let dir = path.dirname(at); path.relative(outDir, dir) !== '' && !path.relative(outDir, dir).startsWith('..'); dir = path.dirname(dir)) {
      if (!fs.existsSync(dir) || fs.readdirSync(dir).length > 0) break;
      fs.rmdirSync(dir);
    }
  }
  const manifest: PartManifest = {
    writtenBy: 'nodegx export --target html --component',
    component: output.component,
    project: projectName,
    entry: output.entry,
    files
  };
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  return { ok: true, written, unchanged, removed, first: before === undefined };
}
