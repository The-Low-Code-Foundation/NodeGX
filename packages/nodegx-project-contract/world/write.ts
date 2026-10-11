/**
 * P116 ONT-001 — the write rule over `docs/world/`: refuse when the files changed since read.
 *
 * The MCP's rule for a component (`ProjectStore.assertNoDrift`, `if_revision`), stated once for
 * the world's three files and kept pure, so the MCP, the editor and a home-made page all run
 * the same refusal: the caller reads the files' text, takes `revision`, and passes it back with
 * the candidate. The plan says what to write; the caller writes it. A file whose content would
 * not change is not written (P109 ISL-019: a rebuild that changes nothing leaves git clean).
 *
 * The two optional files, `verbs.json` (ONT-006) and `rules.json` (ONT-013), join the revision
 * only when they are there, and a write that leaves either out keeps it — graded against the
 * world written, so a noun renamed under a verb or a rule that names it is refused here.
 */
import { RULES_FILE, VERBS_FILE, WORLD_FILES, type WorldFileName, type WorldFiles } from './files';
import { validateWorld, type WorldProblem } from './validate';
import { WORLD_VOCABULARY_REF, type VocabularyRef } from './vocabulary';
import { hash53 } from '../hash';

/** The three files' text as on disk; `null` for a file that does not exist. `verbs` (ONT-006) and `rules` (ONT-013) when the caller read for them. */
export type WorldTexts = Record<WorldFileName, string | null> & { verbs?: string | null; rules?: string | null };

const NAMES: readonly WorldFileName[] = ['nouns', 'relations', 'vocabulary'];
/** The optional files, each with its path: read, kept and written the same way. */
const OPTIONAL = [
  { key: 'verbs', path: VERBS_FILE, what: 'verbs' },
  { key: 'rules', path: RULES_FILE, what: 'rules' }
] as const;

/** The revision of the world as read: changes when any of the three files' text does, or one appears or goes. */
export function worldRevision(texts: WorldTexts): string {
  // An optional file joins the revision only when it is there: a world of three files keeps the revision it had.
  const parts = NAMES.map((n) => (texts[n] === null ? '\u0000' : texts[n]));
  for (const o of OPTIONAL) if (typeof texts[o.key] === 'string') parts.push(`${o.key}\u0002${texts[o.key]}`);
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
  // A write that leaves an optional file out keeps what is on disk, so it is graded against the world
  // it writes: a noun renamed or taken out under a verb or a rule that names it is refused here, not found later.
  const graded: WorldFiles = { ...args.candidate };
  for (const o of OPTIONAL) {
    if (args.candidate[o.key] !== undefined || typeof args.disk[o.key] !== 'string') continue;
    try {
      (graded as unknown as Record<string, unknown>)[o.key] = JSON.parse(args.disk[o.key] as string);
    } catch (e) {
      const message = `${o.path} is on disk but is not JSON (${e instanceof Error ? e.message : String(e)}); pass the ${o.what} with the write, so the world and its ${o.what} are graded together.`;
      return { ok: false, refusal: 'invalid', message, problems: [{ file: o.path, at: '', expected: 'JSON', message }] };
    }
  }
  const verdict = validateWorld(graded, args.vocabulary ?? WORLD_VOCABULARY_REF);
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
  for (const o of OPTIONAL) {
    if (args.candidate[o.key] !== undefined) {
      const content = serializeWorldFile(args.candidate[o.key]);
      next[o.key] = content;
      if (content !== args.disk[o.key]) writes.push({ path: o.path, content });
    } else if (typeof args.disk[o.key] === 'string') next[o.key] = args.disk[o.key];
  }
  return { ok: true, writes, revision: worldRevision(next) };
}
