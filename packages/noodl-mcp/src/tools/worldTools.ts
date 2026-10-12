/**
 * P116 ONT-002 — the one tool that grades a person's world (R5), and the write beside it.
 *
 * `validate_world` reads `docs/world/` and returns the next questions: the ones that kill a
 * classic mistake the answers so far do not rule out, in the person's nouns, at most the budget
 * at a time. With no world yet it returns the brief — the document an agent reads before the
 * first sentence — and nothing else. Both tools live in the deferred `backend` group, so a
 * project that never asks for a backend never reads the brief (R5: "the brief doesn't get
 * accessed if the user just wants a landing page"), and neither costs the resident surface
 * (measured on both arms, ONT-002 §6).
 *
 * `write_world` exists because `write_project_doc` refuses every path under `docs/` that is not
 * `.md` (the editor's `assertInsideDocs`, which this server imports rather than reimplements),
 * and because the world's write rule needs the revision the writer read: a whole-file write that
 * never read the files cannot know what it replaces. Claude Code writes the files with its own
 * tools; an agent on this server alone writes them here, through `planWorldWrite`, and gets the
 * next questions back with the write.
 *
 * The fourth file, `verbs.json` (ONT-006), is optional and read when it is there: graded with the
 * three, its steps bound to nodes no spec knows counted as `outside`, and the functions each verb
 * calls listed for the agent to write. A write that leaves it out keeps it, graded against the
 * world written. The fifth, `rules.json` (ONT-013), the same: each rule read back with its
 * sentence and whether the store keeps it, or why not — the agent's read-back (R-e, step 3).
 */
import * as fs from 'fs';
import * as path from 'path';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import {
  nextQuestions,
  planWorldWrite,
  projectVerb,
  QUESTION_BUDGET,
  RULES_FILE,
  validateVerbs,
  VERBS_FILE,
  verbWords,
  WORLD_DIR,
  WORLD_FILES,
  worldBrief,
  worldRevision,
  type OutsideStep,
  type RulesFile,
  type RunnerReport,
  type VerbFunction,
  type VerbsFile,
  type WorldFiles,
  type WorldTexts
} from '@nodegx/project-contract/world';

import { ToolError } from '../errors';
import type { ProjectBinding } from '../project/ProjectBinding';
import type { ProjectStore } from '../project/ProjectStore';
import { writeTextAtomic } from './docsTools';
import { guarded, jsonResult } from './util';

const NAMES = ['nouns', 'relations', 'vocabulary'] as const;

const readText = (store: ProjectStore, rel: string): string | null => {
  const abs = path.join(store.projectDir, rel);
  return fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : null;
};

/** The three files as text, `null` where one is missing; the verbs and rules files too (each joins the revision only when it is there). */
function readTexts(store: ProjectStore): WorldTexts {
  const out = {} as WorldTexts;
  for (const n of NAMES) out[n] = readText(store, WORLD_FILES[n]);
  out.verbs = readText(store, VERBS_FILE);
  out.rules = readText(store, RULES_FILE);
  return out;
}

function parse(texts: WorldTexts): { files?: WorldFiles; missing: string[]; unreadable: string[] } {
  const missing = NAMES.filter((n) => texts[n] === null).map((n) => WORLD_FILES[n]);
  const unreadable: string[] = [];
  const parsed: Partial<Record<(typeof NAMES)[number] | 'verbs' | 'rules', unknown>> = {};
  const read = (n: (typeof NAMES)[number] | 'verbs' | 'rules', file: string) => {
    const text = texts[n];
    if (typeof text !== 'string') return;
    try {
      parsed[n] = JSON.parse(text);
    } catch (e) {
      unreadable.push(`${file}: ${e instanceof Error ? e.message : String(e)}`);
    }
  };
  for (const n of NAMES) read(n, WORLD_FILES[n]);
  read('verbs', VERBS_FILE);
  read('rules', RULES_FILE);
  if (missing.length || unreadable.length) return { missing, unreadable };
  return { files: parsed as unknown as WorldFiles, missing, unreadable };
}

export interface RulesReport {
  file: typeof RULES_FILE;
  /** Each rule as the person reads it back: the sentence, and whether the store keeps it — or why it only says it (R-e). */
  rules: { id: string; on: string; says: string; kept: boolean; why?: string }[];
}

/** ONT-013 step 3: the rules of a world that projected, each read back as kept or not kept, with the reason. */
function rulesReport(files: WorldFiles & { rules: RulesFile }, report: RunnerReport): RulesReport {
  const notHeld = report.ok ? report.schema.notHeld : [];
  return {
    file: RULES_FILE,
    rules: files.rules.rules.map((r) => {
      const said = notHeld.find((n) => n.says === r.says);
      return { id: r.id, on: r.on, says: r.says, kept: !said, ...(said ? { why: said.why } : {}) };
    })
  };
}

export interface VerbsReport {
  file: typeof VERBS_FILE;
  /** Steps bound to a node no spec knows (a cloud-only node): counted, never refused. */
  outside: OutsideStep[];
  /** Each verb in the person's words, and the functions it calls — the ones the agent writes. */
  verbs: { id: string; name: string; words: string[]; functions: VerbFunction[] }[];
}

/** The verbs over a world that validated: what is outside, and what each verb owes. */
function verbsReport(files: WorldFiles & { verbs: VerbsFile }): VerbsReport {
  const verdict = validateVerbs(files.verbs, files);
  return {
    file: VERBS_FILE,
    outside: verdict.outside,
    verbs: files.verbs.verbs.map((v) => {
      const projected = projectVerb(v, files);
      return { id: v.id, name: v.name, words: verbWords(v, files), functions: projected.ok ? projected.functions : [] };
    })
  };
}

export interface WorldReport {
  /** `none`: no world yet, start from the brief. `partial`: some of the three files are missing. `described`: graded. */
  world: 'none' | 'partial' | 'described';
  /** Where the files live, project-relative. */
  files: typeof WORLD_FILES;
  /** The revision of what is on disk, to pass back with `write_world`. */
  revision: string;
  missing?: string[];
  unreadable?: string[];
  /** The brief, when there is no world yet or it was asked for. */
  brief?: string;
  /** The grade: the next questions, the record, the schema — or the validator's problems (the verbs' among them). */
  report?: RunnerReport;
  /** When `docs/world/verbs.json` is there and the world validates. */
  verbs?: VerbsReport;
  /** When `docs/world/rules.json` is there and the world validates: each rule, kept or not kept (ONT-013). */
  rules?: RulesReport;
  note?: string;
}

function grade(store: ProjectStore, options: { brief?: boolean; limit?: number }): WorldReport {
  const texts = readTexts(store);
  const revision = worldRevision(texts);
  const { files, missing, unreadable } = parse(texts);
  if (missing.length === NAMES.length) {
    return {
      world: 'none',
      files: WORLD_FILES,
      revision,
      brief: worldBrief(),
      note: `No ${WORLD_DIR}/ yet. Read the brief, write the three files from what the person says, then call validate_world again for the questions.`
    };
  }
  if (!files) {
    return {
      world: 'partial',
      files: WORLD_FILES,
      revision,
      ...(missing.length ? { missing } : {}),
      ...(unreadable.length ? { unreadable } : {}),
      ...(options.brief ? { brief: worldBrief() } : {}),
      note: 'A world is three files, a fourth for its verbs and a fifth for its rules; write the missing or unreadable ones and call validate_world again.'
    };
  }
  const report = nextQuestions(files, options.limit === undefined ? {} : { limit: options.limit });
  return {
    world: 'described',
    files: WORLD_FILES,
    revision,
    ...(options.brief ? { brief: worldBrief() } : {}),
    report,
    ...(report.ok && files.verbs ? { verbs: verbsReport(files as WorldFiles & { verbs: VerbsFile }) } : {}),
    ...(report.ok && files.rules ? { rules: rulesReport(files as WorldFiles & { rules: RulesFile }, report) } : {}),
    note: !report.ok
      ? 'The world does not validate; each problem says what was expected and where. Fix the files and call validate_world again.'
      : report.enough
        ? 'Nothing stands: the world is described enough to build. The schema is what it projects to.'
        : `Ask the person the questions in ask, in order, and write each answer at its home. ${report.waiting} more wait behind them.`
  };
}

export function registerWorldReadTools(server: McpServer, binding: ProjectBinding): void {
  server.registerTool(
    'validate_world',
    {
      title: 'Validate the world',
      description:
        `Grade what the person has said about their world (${WORLD_DIR}/: nouns, relations, answers, and verbs when there are any) and return the next ` +
        `questions to ask — only the ones that kill a classic mistake the answers so far do not rule out, in the person's ` +
        `nouns, at most ${QUESTION_BUDGET} at a time, each with the mistake it stands for and the incident behind it. ` +
        'With no world yet, returns the brief: read it before the first sentence. Also returns the schema the world ' +
        'projects to, the record of what was asked and answered, the functions each verb calls, and the revision for write_world.',
      inputSchema: {
        brief: z.boolean().optional().describe('Return the brief as well, even when a world exists.'),
        limit: z.number().int().min(1).max(50).optional().describe(`How many questions at once (default ${QUESTION_BUDGET}).`)
      }
    },
    guarded((args: { brief?: boolean; limit?: number }) => jsonResult(grade(binding.require(), args)))
  );
}

export function registerWorldWriteTools(server: McpServer, binding: ProjectBinding): void {
  server.registerTool(
    'write_world',
    {
      title: 'Write the world',
      description:
        `Write the three ${WORLD_DIR}/ files, and the verbs and rules when given — WHOLE FILES, validated first — and return the next questions. ` +
        'Verbs and rules left out are kept, and graded against the world written. Pass the ' +
        'revision validate_world gave you; a write over files that changed since is refused with the current revision. ' +
        'A world the validator refuses is not written; each problem names what was expected and where.',
      inputSchema: {
        nouns: z.record(z.unknown()).describe('The nouns file, as an object.'),
        relations: z.record(z.unknown()).describe('The relations file, as an object.'),
        vocabulary: z.record(z.unknown()).describe('The vocabulary file, as an object.'),
        verbs: z.record(z.unknown()).optional().describe('The verbs file, as an object: what the person does over the world.'),
        rules: z.record(z.unknown()).optional().describe('The rules file, as an object: a rule the person said that no kind asked for, with its mutant.'),
        ifRevision: z.string().optional().describe('The revision read from validate_world. Required once any of the files exists.')
      }
    },
    guarded((args: { nouns: unknown; relations: unknown; vocabulary: unknown; verbs?: unknown; rules?: unknown; ifRevision?: string }) => {
      const store = binding.require();
      const disk = readTexts(store);
      const plan = planWorldWrite({
        disk,
        candidate: {
          nouns: args.nouns,
          relations: args.relations,
          vocabulary: args.vocabulary,
          ...(args.verbs === undefined ? {} : { verbs: args.verbs }),
          ...(args.rules === undefined ? {} : { rules: args.rules })
        } as WorldFiles,
        ifRevision: args.ifRevision
      });
      if (!plan.ok) {
        throw new ToolError(plan.refusal === 'conflict' ? 'conflict' : 'invalid-argument', plan.message, plan.refusal === 'invalid' ? { problems: plan.problems } : { revision: plan.actual });
      }
      for (const w of plan.writes) {
        const abs = path.join(store.projectDir, w.path);
        fs.mkdirSync(path.dirname(abs), { recursive: true });
        writeTextAtomic(abs, w.content);
      }
      // `grade` re-reads the files and carries the revision of what it read, which is `plan.revision`.
      return jsonResult({ written: plan.writes.map((w) => w.path), ...grade(store, {}) });
    })
  );
}
