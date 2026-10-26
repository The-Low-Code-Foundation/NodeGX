/**
 * P127 BKO-001 AC6 — does the project's backend still hold what `nodegx.automations.json` says?
 *
 * Since BKO-001 every workflow and trigger the agent writes lands in both places. Three writers still
 * reach the backend alone: a backend made before that change, the backend's admin page, and a proposal
 * accepted in the old editor's Workflows panel. A backend started from the project logs the difference
 * once, at start, where no agent reads it. This says it where the agent looks before it works:
 * `get_project_info` and `session_status`, each with the two ways to agree.
 *
 * Both ways go through the tools that already exist, because each of them writes the file from the
 * backend's answer (`writeBoth`): writing a definition to the backend again is how the backend's
 * version reaches the project, and writing the file's entry is how the project's reaches the backend.
 *
 * 🔴 It never says "they agree" without having read the backend. A backend that is not running, or
 * does not answer in time, is `unknown`, with the reason (and nothing at all when the project has no
 * file either, because then nothing is known on either side).
 *
 * A known blind spot: the backend migrates an old step kind (`retry`) when it reads a workflow, and
 * that migration needs the step executor, which this server cannot load. A hand-written file that
 * still holds `kind: "retry"` reads here as "differs". Every file the tools write is already migrated.
 *
 * @module backend/automationsDrift
 */

import * as fs from 'fs';
import * as path from 'path';

import {
  PROJECT_AUTOMATIONS_FILE,
  ProjectAutomations,
  automationsFromBackend,
  diffAutomations
} from '../../../nodegx-backend/src/automations/shape';
import type { TriggerDef } from '../../../nodegx-backend/src/triggers/registry';
import type { WorkflowDefinition } from '../../../nodegx-backend/src/workflow/types';
import type { ProjectBinding } from '../project/ProjectBinding';
import { BackendClient, listBackends } from './client';

/** Long enough for a backend on this machine, short enough that a hung one does not hold up the answer. */
const DRIFT_TIMEOUT_MS = 2_000;

export type AutomationsDrift =
  | { file: string; backend: string; state: 'agree'; workflows: number; triggers: number }
  | { file: string; backend: string; state: 'drift'; differences: string[]; toKeepTheProjects: string; toKeepTheBackends: string }
  | { file: string; backend: string | null; state: 'unknown'; reason: string };

const TO_KEEP_THE_PROJECTS =
  'make the backend match nodegx.automations.json: for each one, create_backend_workflow / create_backend_trigger ' +
  'with the file\'s entry when the backend lacks it, update_… with the file\'s entry when they differ, delete_… when ' +
  'only the backend has it.';

const TO_KEEP_THE_BACKENDS =
  'write the backend\'s own definition back through the tools, which keep it in the file: update_backend_workflow ' +
  'with what get_backend_workflow returns, and for a trigger set_backend_trigger_enabled with its current state. One ' +
  'that is only in the file: create it, then delete it, and both sides are without it.';

/**
 * The drift for the bound project, or `undefined` when there is nothing to compare: no project, or a
 * project with neither an automations file nor a backend of its own.
 */
export async function automationsDriftOf(binding: ProjectBinding | undefined): Promise<AutomationsDrift | undefined> {
  const store = binding?.peek();
  if (!store) return undefined;
  const file = path.join(store.projectDir, PROJECT_AUTOMATIONS_FILE);
  const hasFile = fs.existsSync(file);
  const bound = store.readCloudServices().instanceId ?? null;
  if (!bound) {
    if (!hasFile) return undefined;
    return {
      file: PROJECT_AUTOMATIONS_FILE,
      backend: null,
      state: 'unknown',
      reason: 'the project names no backend, so there is nothing to compare the file with (provision_backend binds one)'
    };
  }

  // With no file, an unreadable backend leaves nothing known on either side, so nothing is said.
  const unknown = (reason: string): AutomationsDrift | undefined =>
    hasFile ? { file: PROJECT_AUTOMATIONS_FILE, backend: bound, state: 'unknown', reason } : undefined;

  let project: ProjectAutomations = { version: 1, workflows: [], triggers: [] };
  if (hasFile) {
    try {
      project = { ...project, ...(JSON.parse(fs.readFileSync(file, 'utf-8')) as Partial<ProjectAutomations>) };
    } catch (e) {
      return unknown(`${PROJECT_AUTOMATIONS_FILE} is not valid JSON (${e instanceof Error ? e.message : e}), so a backend made from it would refuse to start`);
    }
  }

  const descriptor = listBackends().find((b) => b.id === bound);
  if (!descriptor) return unknown(`backend "${bound}" is not on this machine`);
  const client = new BackendClient(descriptor);

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<'timeout'>((resolve) => {
    timer = setTimeout(() => resolve('timeout'), DRIFT_TIMEOUT_MS);
    timer.unref?.();
  });
  const read = (async () => {
    if (!(await client.isReachable())) return 'down' as const;
    const workflows = (await client.request('GET', '/admin/workflow-defs')).json as { workflows?: WorkflowDefinition[] };
    const triggers = (await client.request('GET', '/admin/triggers')).json as { triggers?: TriggerDef[] };
    return automationsFromBackend(workflows?.workflows ?? [], triggers?.triggers ?? []);
  })();
  let answer: ProjectAutomations | 'down' | 'timeout';
  try {
    answer = await Promise.race([read, timeout]);
  } catch (e) {
    return unknown(`backend "${bound}" could not be read: ${e instanceof Error ? e.message : e}`);
  } finally {
    if (timer) clearTimeout(timer);
  }
  read.catch(() => undefined);
  if (answer === 'down') return unknown(`backend "${bound}" is not running, so it could not be compared with the file`);
  if (answer === 'timeout') return unknown(`backend "${bound}" did not answer within ${DRIFT_TIMEOUT_MS / 1000}s`);

  const backend = answer;
  if (!hasFile && backend.workflows.length === 0 && backend.triggers.length === 0) return undefined;
  const differences = diffAutomations(project, backend);
  if (differences.length === 0) {
    return { file: PROJECT_AUTOMATIONS_FILE, backend: bound, state: 'agree', workflows: backend.workflows.length, triggers: backend.triggers.length };
  }
  return {
    file: PROJECT_AUTOMATIONS_FILE,
    backend: bound,
    state: 'drift',
    differences,
    toKeepTheProjects: TO_KEEP_THE_PROJECTS,
    toKeepTheBackends: TO_KEEP_THE_BACKENDS
  };
}
