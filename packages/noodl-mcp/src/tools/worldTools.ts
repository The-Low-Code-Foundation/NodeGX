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
 */
import * as fs from 'fs';
import * as path from 'path';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import {
  nextQuestions,
  planWorldWrite,
  QUESTION_BUDGET,
  WORLD_DIR,
  WORLD_FILES,
  worldBrief,
  worldRevision,
  type RunnerReport,
  type WorldFiles,
  type WorldTexts
} from '@nodegx/project-contract/world';

import { ToolError } from '../errors';
import type { ProjectBinding } from '../project/ProjectBinding';
import type { ProjectStore } from '../project/ProjectStore';
import { writeTextAtomic } from './docsTools';
import { guarded, jsonResult } from './util';

const NAMES = ['nouns', 'relations', 'vocabulary'] as const;

/** The three files as text, `null` where one is missing. */
function readTexts(store: ProjectStore): WorldTexts {
  const out = {} as WorldTexts;
  for (const n of NAMES) {
    const abs = path.join(store.projectDir, WORLD_FILES[n]);
    out[n] = fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : null;
  }
  return out;
}

function parse(texts: WorldTexts): { files?: WorldFiles; missing: string[]; unreadable: string[] } {
  const missing = NAMES.filter((n) => texts[n] === null).map((n) => WORLD_FILES[n]);
  const unreadable: string[] = [];
  const parsed: Partial<Record<(typeof NAMES)[number], unknown>> = {};
  for (const n of NAMES) {
    if (texts[n] === null) continue;
    try {
      parsed[n] = JSON.parse(texts[n] as string);
    } catch (e) {
      unreadable.push(`${WORLD_FILES[n]}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  if (missing.length || unreadable.length) return { missing, unreadable };
  return { files: parsed as unknown as WorldFiles, missing, unreadable };
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
  /** The grade: the next questions, the record, the schema — or the validator's problems. */
  report?: RunnerReport;
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
      note: 'A world is three files; write the missing or unreadable ones and call validate_world again.'
    };
  }
  const report = nextQuestions(files, options.limit === undefined ? {} : { limit: options.limit });
  return {
    world: 'described',
    files: WORLD_FILES,
    revision,
    ...(options.brief ? { brief: worldBrief() } : {}),
    report,
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
        `Grade what the person has said about their world (${WORLD_DIR}/: nouns, relations, answers) and return the next ` +
        `questions to ask — only the ones that kill a classic mistake the answers so far do not rule out, in the person's ` +
        `nouns, at most ${QUESTION_BUDGET} at a time, each with the mistake it stands for and the incident behind it. ` +
        'With no world yet, returns the brief: read it before the first sentence. Also returns the schema the world ' +
        'projects to, the record of what was asked and answered, and the revision for write_world.',
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
        `Write the three ${WORLD_DIR}/ files — WHOLE FILES, validated first — and return the next questions. Pass the ` +
        'revision validate_world gave you; a write over files that changed since is refused with the current revision. ' +
        'A world the validator refuses is not written; each problem names what was expected and where.',
      inputSchema: {
        nouns: z.record(z.unknown()).describe('The nouns file, as an object.'),
        relations: z.record(z.unknown()).describe('The relations file, as an object.'),
        vocabulary: z.record(z.unknown()).describe('The vocabulary file, as an object.'),
        ifRevision: z.string().optional().describe('The revision read from validate_world. Required once any of the files exists.')
      }
    },
    guarded((args: { nouns: unknown; relations: unknown; vocabulary: unknown; ifRevision?: string }) => {
      const store = binding.require();
      const disk = readTexts(store);
      const plan = planWorldWrite({
        disk,
        candidate: { nouns: args.nouns, relations: args.relations, vocabulary: args.vocabulary } as WorldFiles,
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
