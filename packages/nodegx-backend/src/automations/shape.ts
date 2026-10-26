/**
 * P127 BKO-001 — the shape of `nodegx.automations.json`, with nothing heavy behind it.
 *
 * The file name, the form an entry takes in the project, and how a file and a backend differ. Kept apart
 * from `projectAutomations.ts` (the validator and the seeding) because the agent's server writes the
 * file too, and the validator reaches the workflow engine, which that server cannot load. Imports here
 * are types only, plus nothing.
 *
 * @module nodegx-backend/automations/shape
 */

import * as path from 'path';

import type { TriggerDef, TriggerInput } from '../triggers/registry';
import type { WorkflowDefinition, WorkflowInput } from '../workflow/types';

/** The project-root file. */
export const PROJECT_AUTOMATIONS_FILE = 'nodegx.automations.json';

/** A trigger as the project keeps it: the write shape, with its id, and never a secret. */
export type ProjectTrigger = Omit<TriggerInput, 'secret'> & { id: string };
/** A workflow as the project keeps it: the write shape, with its id. */
export type ProjectWorkflow = WorkflowInput & { id: string };

export interface ProjectAutomations {
  version: 1;
  workflows: ProjectWorkflow[];
  triggers: ProjectTrigger[];
}

export function projectAutomationsPath(projectDir: string): string {
  return path.join(projectDir, PROJECT_AUTOMATIONS_FILE);
}

const DEFAULT_MAX_BODY_BYTES = 1024 * 1024;

/** Keep only the keys that are set, so `undefined` and absent compare equal and never reach the file. */
function defined<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = v;
  return out as T;
}

/**
 * A trigger in the form the project keeps, from either a stored `TriggerDef` or
 * a hand-written entry, with the defaults the registry fills in written out.
 * Both sides of a comparison go through here, so a file that leaves a default
 * implicit does not read as different from the backend that filled it in.
 */
export function projectTrigger(t: TriggerDef | ProjectTrigger): ProjectTrigger {
  const base = defined({
    id: t.id,
    type: t.type,
    name: t.name,
    enabled: t.enabled !== undefined ? t.enabled : true,
    target: t.target ? defined({ kind: t.target.kind, name: t.target.name }) : t.target,
    responseMode: t.responseMode,
    responseTimeoutMs: t.responseTimeoutMs
  }) as ProjectTrigger;
  if (t.type === 'schedule' && t.schedule) {
    base.schedule = defined({
      cron: t.schedule.cron,
      missedFirePolicy: t.schedule.missedFirePolicy || 'skip',
      overlapPolicy: t.schedule.overlapPolicy,
      payload: t.schedule.payload
    });
  } else if (t.type === 'webhook' && t.webhook) {
    base.webhook = {
      slug: t.webhook.slug,
      scheme: t.webhook.scheme || 'hmac-sha256',
      maxBodyBytes: t.webhook.maxBodyBytes || DEFAULT_MAX_BODY_BYTES
    };
  } else if (t.type === 'db-change' && t.dbChange) {
    base.dbChange = { collection: t.dbChange.collection, actions: [...t.dbChange.actions] };
  }
  return base;
}

/**
 * A workflow in the form the project keeps, defaults written out. It does not migrate old step kinds:
 * that rule is the backend's (`steps/migrate.ts`, which needs the step executor), so a caller holding a
 * hand-written entry migrates first. What a backend answers is already migrated.
 */
export function projectWorkflow(w: WorkflowDefinition | ProjectWorkflow): ProjectWorkflow {
  const m = w;
  return defined({
    id: w.id,
    name: m.name,
    entry: m.entry,
    concurrency: m.concurrency && m.concurrency >= 1 ? m.concurrency : 1,
    timeoutMs: m.timeoutMs,
    stepTimeoutMs: m.stepTimeoutMs,
    steps: m.steps
  }) as ProjectWorkflow;
}

const byId = (a: { id: string }, b: { id: string }) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** The file a backend's automations make, sorted by id so a diff shows decisions, not order. */
export function automationsFromBackend(workflows: WorkflowDefinition[], triggers: TriggerDef[]): ProjectAutomations {
  return {
    version: 1,
    workflows: workflows.map(projectWorkflow).sort(byId),
    triggers: triggers.map(projectTrigger).sort(byId)
  };
}

/**
 * How a project's file and a backend's automations differ, one sentence each,
 * empty when they agree. Read from the project's side: "only in the project"
 * is what a backend made from it would gain.
 */
export function diffAutomations(project: ProjectAutomations, backend: ProjectAutomations): string[] {
  const out: string[] = [];
  const compare = <T extends { id: string }>(kind: string, ours: T[], theirs: T[], norm: (x: T) => T) => {
    const a = new Map(ours.map((x) => [x.id, JSON.stringify(norm(x))]));
    const b = new Map(theirs.map((x) => [x.id, JSON.stringify(norm(x))]));
    for (const id of [...a.keys()].sort()) {
      if (!b.has(id)) out.push(`${kind} "${id}" is in the project, not on the backend`);
      else if (a.get(id) !== b.get(id)) out.push(`${kind} "${id}" differs between the project and the backend`);
    }
    for (const id of [...b.keys()].sort()) if (!a.has(id)) out.push(`${kind} "${id}" is on the backend, not in the project`);
  };
  compare('workflow', project.workflows, backend.workflows, projectWorkflow);
  compare('trigger', project.triggers, backend.triggers, projectTrigger);
  return out;
}

