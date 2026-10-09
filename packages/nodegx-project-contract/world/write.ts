/**
 * P116 ONT-001 — the write rule over `docs/world/`: refuse when the files changed since read.
 *
 * The MCP's rule for a component (`ProjectStore.assertNoDrift`, `if_revision`), stated once for
 * the world's three files and kept pure, so the MCP, the editor and a home-made page all run
 * the same refusal: the caller reads the files' text, takes `revision`, and passes it back with
 * the candidate. The plan says what to write; the caller writes it. A file whose content would
 * not change is not written (P109 ISL-019: a rebuild that changes nothing leaves git clean).
 */
import { VERBS_FILE, WORLD_FILES, type WorldFileName, type WorldFiles } from './files';
import { validateWorld, type WorldProblem } from './validate';
import { WORLD_VOCABULARY_REF, type VocabularyRef } from './vocabulary';

/** The three files' text as on disk; `null` for a file that does not exist. `verbs` (ONT-006) when the caller read for it. */
export type WorldTexts = Record<WorldFileName, string | null> & { verbs?: string | null };

const NAMES: readonly WorldFileName[] = ['nouns', 'relations', 'vocabulary'];

/** cyrb53: a 53-bit string hash, pure, the same in a page and in Node. Change detection, not security. */
function hash53(text: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
}

/** The revision of the world as read: changes when any of the three files' text does, or one appears or goes. */
export function worldRevision(texts: WorldTexts): string {
  // The verbs file joins the revision only when it is there: a world of three files keeps the revision it had.
  const parts = NAMES.map((n) => (texts[n] === null ? '\u0000' : texts[n]));
  if (typeof texts.verbs === 'string') parts.push(texts.verbs);
  return hash53(parts.join('\u0001'));
}

/** How the files are written: two-space JSON and a final newline, so a rewrite of the same world is the same bytes. */
export function serializeWorldFile(value: unknown): string {
  return JSON.stringify(value, null, 2) + '\n';
}

export type WorldWritePlan =
  | { ok: true; writes: { path: string; content: string }[]; revision: string }
  | { ok: false; refusal: 'conflict'; message: string; expected?: string; actual: string }
  | { ok: false; refusal: 'invalid'; message: string; problems: WorldProblem[] };

/**
 * Plans a whole-world write. `ifRevision` is the revision the caller read; it is required once
 * any of the files exists, because a writer that never read them cannot know what it replaces.
 */
export function planWorldWrite(args: {
  disk: WorldTexts;
  candidate: WorldFiles;
  ifRevision?: string;
  vocabulary?: VocabularyRef;
}): WorldWritePlan {
  const actual = worldRevision(args.disk);
  const exists = NAMES.some((n) => args.disk[n] !== null);
  if (exists && args.ifRevision === undefined) {
    return {
      ok: false,
      refusal: 'conflict',
      message: `${WORLD_FILES.nouns} and its neighbours already exist. Read them, and pass the revision you read (${actual}) with the write.`,
      actual
    };
  }
  if (args.ifRevision !== undefined && args.ifRevision !== actual) {
    return {
      ok: false,
      refusal: 'conflict',
      message: `The world changed since it was read (read ${args.ifRevision}, now ${actual}) — the editor, the agent or another page wrote it. Read it again and re-apply the change.`,
      expected: args.ifRevision,
      actual
    };
  }
  const verdict = validateWorld(args.candidate, args.vocabulary ?? WORLD_VOCABULARY_REF);
  if (!verdict.ok) {
    return { ok: false, refusal: 'invalid', message: verdict.problems.map((p) => p.message).join('\n'), problems: verdict.problems };
  }
  const next = {} as WorldTexts;
  const writes: { path: string; content: string }[] = [];
  for (const n of NAMES) {
    const content = serializeWorldFile(args.candidate[n]);
    next[n] = content;
    if (content !== args.disk[n]) writes.push({ path: WORLD_FILES[n], content });
  }
  if (args.candidate.verbs !== undefined) {
    const content = serializeWorldFile(args.candidate.verbs);
    next.verbs = content;
    if (content !== args.disk.verbs) writes.push({ path: VERBS_FILE, content });
  } else if (typeof args.disk.verbs === 'string') next.verbs = args.disk.verbs;
  return { ok: true, writes, revision: worldRevision(next) };
}
