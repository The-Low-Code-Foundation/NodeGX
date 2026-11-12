/**
 * P128 S1 (CCN-009) — the agent reads the canon: where the person sees the app, and the hand-over at the end.
 *
 * The audit (`dev-docs/reviews/the-three-surfaces-audit-2026-10-27.md` §1.3–§1.4) measured an agent that built a
 * language switch as typed `fr`/`en` strings and a `States` node, then told the person "NodeGX has no option-set type"
 * and "I haven't opened that node in the editor": nothing it read named Studio, the mini editor or the NodeGX editor,
 * or said what Studio draws. This module is that missing text, and every sentence of it a person might hear is quoted
 * from `docs/CANON.md` through the pinned copy (`CANON`), never reworded here.
 *
 * Two readers:
 * - {@link SURFACES_DOCTRINE_MD}, `get_project_info`'s `surfacesDoctrine` (section `surfaces`): a result field, so it
 *   costs the resident surface nothing (`toolDisclosure.test.ts`).
 * - {@link handoverFor}, on `apply_plan`'s result when the build plan is done (canon rule 3).
 */
import * as fs from 'fs';
import * as path from 'path';

import { CANON } from './editor-deps';
import { pageLegacyCandidates } from '../../noodl-editor/src/editor/src/models/AiAssistant/scoping/scope';
import type { ProjectStore } from './project/ProjectStore';

/** The canon's "Get the tools" addresses, read from the pinned text so a changed URL changes here too. */
export const EDITOR_DOWNLOAD = canonUrl('The NodeGX editor');
export const YOUR_OWN_EDITOR = canonUrl('Your own editor');

function canonUrl(label: string): string {
  const line = CANON['Get the tools'].split('\n').find((l) => l.includes(`**${label}**`));
  const url = line && /(nodegx\.io\/\S+)\s*$/.exec(line)?.[1];
  if (!url) throw new Error(`docs/CANON.md "Get the tools" has no address for "${label}"`);
  return url;
}

/** A hard-wrapped canon paragraph as one line, for a field a person may be read. Prose only: not tables or lists. */
export function unwrap(text: string): string {
  return text.replace(/([^\n])\n(?=[^\n])/g, '$1 ');
}

/** The canon's offer sentence, verbatim ("The wiring underneath", in italics there). */
export const CANON_OFFER = unwrap(/\*"([^*]+)"\*/.exec(CANON['The wiring underneath'])?.[1] ?? '');

const RULES_HEADING = 'For the agent (the rules, not copy)';

/** Rule `n` of the canon's "For the agent", unwrapped. */
export function canonRule(n: number): string {
  const rules = CANON[RULES_HEADING].split(/\n(?=\d+\. )/);
  const rule = rules.find((r) => r.startsWith(`${n}. `));
  if (!rule) throw new Error(`docs/CANON.md "${RULES_HEADING}" has no rule ${n}`);
  return unwrap(rule.slice(`${n}. `.length).replace(/\n {3}/g, '\n'));
}

/** "What NodeGX is for", one of its three bold-led paragraphs ("When it's finished,"), unwrapped. */
function canonMoment(lead: string): string {
  const para = CANON['What NodeGX is for'].split('\n\n').find((p) => p.startsWith(`**${lead}**`));
  if (!para) throw new Error(`docs/CANON.md "What NodeGX is for" has no paragraph "${lead}"`);
  return unwrap(para.replace(/\*\*/g, ''));
}

/**
 * `get_project_info`'s `surfacesDoctrine`. The lead is this server's (which tool is which surface); everything under
 * the `###` headings is the canon, verbatim.
 */
export const SURFACES_DOCTRINE_MD = [
  '## Where the person sees the app',
  '',
  'The person may not read code. What they see is one of three surfaces, and NodeGX names them the same way',
  'everywhere: the text below is `docs/CANON.md`, the page every NodeGX surface quotes, and when you tell the person',
  'what they can do, say it in these words. The part in the chat is `show_mini_editor`; NodeGX Studio is',
  '`open_studio` (inside the conversation where the host draws it, otherwise a URL beside it); the NodeGX editor is',
  `\`open_in_editor\`, once it is installed (${EDITOR_DOWNLOAD}, then the person presses Connect Claude in it).`,
  'Studio does not edit every node: a `States` node, a Function or Script node, an Expression you wrote (it edits only',
  'the ones its own composer made), a logic component placed on a page. When you build one, rule 4 below applies.',
  '',
  ...(['Which AI coder', 'Three ways to touch your app', 'The wiring underneath', 'Get the tools', RULES_HEADING] as const).flatMap(
    (heading) => [`### ${heading}`, '', CANON[heading], '']
  )
].join('\n');

/** The build plan `create_project` recorded: the agreed pages, under "**Pages.**" in the initial scope. */
const INITIAL_SCOPE = 'docs/decisions/000-initial-scope.md';

/** The page names the scope agreed, or `[]` when the project has no recorded scope (not made by `create_project`). */
export function scopedPages(projectDir: string): string[] {
  let text: string;
  try {
    text = fs.readFileSync(path.join(projectDir, ...INITIAL_SCOPE.split('/')), 'utf8');
  } catch {
    return [];
  }
  const at = text.indexOf('\n**Pages.**\n');
  if (at < 0) return [];
  const names: string[] = [];
  for (const line of text.slice(at + '\n**Pages.**\n'.length).split('\n')) {
    if (!line.trim()) {
      if (names.length > 0) break;
      continue;
    }
    // scope.ts renders each as `- <name> — <purpose>`
    const m = /^- (.+?) — /.exec(line);
    if (!m) break;
    names.push(m[1].trim());
  }
  return names;
}

/** Projects whose hand-over this server has given: once per project per process, never on every later apply. */
const handedOver = new Set<string>();

export interface Handover {
  note: string;
  /** Canon, "What NodeGX is for": the "When it's finished" paragraph. */
  theyOwn: string;
  /** Canon, "What NodeGX is for": the "When you want more" paragraph. */
  comeBack: string;
  /** Canon rule 3, verbatim. */
  rule: string;
}

/**
 * The hand-over, when the last page of the build plan has just been applied (canon rule 3); `undefined` otherwise.
 *
 * "The plan" is the one `create_project` recorded, not one `create_plan` call: while Studio is on screen a build is
 * many plans of at most `STUDIO_BURST` components (CCN-005), and a hand-over after every burst would be said a dozen
 * times before the app was done.
 */
export function handoverFor(store: ProjectStore): Handover | undefined {
  if (handedOver.has(store.projectDir)) return undefined;
  const pages = scopedPages(store.projectDir);
  if (pages.length === 0) return undefined;
  const have = new Set(store.listComponents().map((row) => row.legacyName));
  if (!pages.every((name) => pageLegacyCandidates(name).some((c) => have.has(c)))) return undefined;
  handedOver.add(store.projectDir);
  return {
    note:
      `Every page the scope agreed (${INITIAL_SCOPE}) is built: the plan is done, so hand over now, in one message ` +
      'and no questions: what they own, what they can change in Studio themselves, that an editor can be built for ' +
      'them if Studio is too much, and how to come back. Say it from `theyOwn` and `comeBack`, the canon\'s words.',
    theyOwn: canonMoment("When it's finished,"),
    comeBack: canonMoment('When you want more,'),
    rule: canonRule(3)
  };
}

/** Test seam: forget which projects were handed over. */
export function resetHandovers(): void {
  handedOver.clear();
}
