/**
 * P127 BKO-001 — what the agent writes to its project's backend, kept in the project too.
 *
 * `set_collection_permissions`, the workflow tools and the trigger tools wrote the running backend only,
 * so an agent-built app's rules, workflows and triggers lived in one data dir: not in git, not drawable
 * from the project, not on a backend made from it, not on the VM it was shipped to
 * (P127-BKO001-BACKENDONLY; the rules half measured in OWN-026 test 2). Ruling R1: the project's files
 * are the truth, the backend a copy loaded from them.
 *
 * The rule is the backend map's (`setTableRule`): **the backend first** (it validates and answers with
 * what it stored), **then the file**, patched by id, written from the backend's answer. If the file
 * cannot be written, the caller puts the backend back and says so: both, or neither.
 *
 * Only for the backend the project is bound to (`metadata.cloudservices.instanceId`). A write to another
 * backend (a live one, someone else's) is that backend's business, and the result says the file was not
 * touched rather than leaving the agent to assume either way.
 *
 * @module backend/projectFiles
 */

import * as fs from 'fs';
import * as path from 'path';

import { serializeV2File } from '@nodegx/project-contract/format';

import {
  PROJECT_AUTOMATIONS_FILE,
  ProjectAutomations,
  projectTrigger,
  projectWorkflow
} from '../../../nodegx-backend/src/automations/shape';
import { ToolError } from '../errors';
import type { ProjectBinding } from '../project/ProjectBinding';
import type { BackendClient } from './client';

export const PROJECT_RULES_FILE = 'nodegx.security.json';

/** What a write did to the project's files, returned beside the backend's answer. */
export type ProjectFileNote =
  | { file: string; written: true }
  | { file: string; written: false; reason: string };

/** The project this backend belongs to, or why a write to it does not reach a project file. */
export function projectOf(
  binding: ProjectBinding | undefined,
  client: BackendClient
): { projectDir: string } | { reason: string } {
  const store = binding?.peek();
  if (!store) return { reason: 'no project is open in this server' };
  const bound = store.readCloudServices().instanceId;
  if (!bound) return { reason: 'the project names no backend (provision_backend binds one)' };
  if (bound !== client.descriptor.id) {
    return { reason: `backend "${client.descriptor.id}" is not this project's backend ("${bound}")` };
  }
  return { projectDir: store.projectDir };
}

/** A file's text, or null when it does not exist. */
function readText(file: string): string | null {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : null;
}

function writeAtomic(file: string, text: string): void {
  const tmp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, text);
  fs.renameSync(tmp, file);
}

/** Put a file back as it was before a patch (deleted when it did not exist). */
export function restoreFile(file: string, before: string | null): void {
  if (before === null) fs.rmSync(file, { force: true });
  else writeAtomic(file, before);
}

const byId = (a: { id: string }, b: { id: string }) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/**
 * Set (entry) or remove (null) one workflow or trigger in `nodegx.automations.json`, from what the
 * backend stored. Creates the file when the project has none. Returns the text it replaced, for undo.
 */
export function patchAutomations(
  projectDir: string,
  kind: 'workflow' | 'trigger',
  id: string,
  stored: Record<string, unknown> | null
): { file: string; before: string | null } {
  const file = path.join(projectDir, PROJECT_AUTOMATIONS_FILE);
  const before = readText(file);
  const current: ProjectAutomations = before
    ? { version: 1, workflows: [], triggers: [], ...JSON.parse(before) }
    : { version: 1, workflows: [], triggers: [] };
  if (kind === 'workflow') {
    const rest = current.workflows.filter((w) => w.id !== id);
    current.workflows = stored ? [...rest, projectWorkflow(stored as never)].sort(byId) : rest;
  } else {
    const rest = current.triggers.filter((t) => t.id !== id);
    current.triggers = stored ? [...rest, projectTrigger(stored as never)].sort(byId) : rest;
  }
  writeAtomic(file, serializeV2File({ version: 1, workflows: current.workflows, triggers: current.triggers }, before));
  return { file, before };
}

/**
 * Set (entry) or remove (null) one collection's rule in `nodegx.security.json`. A project with no
 * rules file gets one made from the backend's whole policy, with `devOpen` false: the switch is the
 * backend's (`set_backend_enforcement`), and a deploy refuses rules that are switched off.
 */
export function patchRules(
  projectDir: string,
  collection: string,
  entry: Record<string, unknown> | null,
  backendConfig: Record<string, unknown>
): { file: string; before: string | null } {
  const file = path.join(projectDir, PROJECT_RULES_FILE);
  const before = readText(file);
  const base = before ? (JSON.parse(before) as Record<string, unknown>) : { ...backendConfig, devOpen: false };
  const collections = { ...((base.collections as Record<string, unknown>) ?? {}) };
  if (entry) collections[collection] = entry;
  else delete collections[collection];
  writeAtomic(file, serializeV2File({ ...base, collections }, before));
  return { file, before };
}

/**
 * Run a backend write, then keep it in the project. `mirror` patches the file from the write's answer;
 * if it throws, `undo` puts the backend back and the call fails saying so. Not this project's backend:
 * the write stands alone and the note says why.
 */
export async function writeBoth<T>(args: {
  binding: ProjectBinding | undefined;
  client: BackendClient;
  fileName: string;
  write: () => Promise<T>;
  mirror: (projectDir: string, answer: T) => unknown | Promise<unknown>;
  undo: () => Promise<void>;
}): Promise<{ answer: T; project: ProjectFileNote }> {
  const target = projectOf(args.binding, args.client);
  const answer = await args.write();
  if (!('projectDir' in target)) {
    return { answer, project: { file: args.fileName, written: false, reason: target.reason } };
  }
  try {
    await args.mirror(target.projectDir, answer);
  } catch (e) {
    let undone = true;
    try {
      await args.undo();
    } catch {
      undone = false;
    }
    const why = e instanceof Error ? e.message : String(e);
    throw new ToolError(
      'io-error',
      `The backend took the change but the project's ${args.fileName} could not be written (${why}), ` +
        (undone
          ? 'so the backend was put back as it was. Nothing changed.'
          : 'and putting the backend back failed too: the backend now has a change the project does not.')
    );
  }
  return { answer, project: { file: args.fileName, written: true } };
}
