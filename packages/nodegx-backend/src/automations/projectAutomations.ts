/**
 * P127 BKO-001 — the automations a project carries to its backend.
 *
 * ## What was broken
 *
 * WF-001 workflows and WF-005 triggers live in a **backend's** data directory
 * (`workflow-defs/`, `triggers.json`). The agent's tools write them over
 * `/admin/workflow-defs` and `/admin/triggers`, so a reminder an agent added
 * existed on one machine only: not in git, not drawable from the project, not
 * on a backend provisioned from it, and not on the VM the project was shipped
 * to (P127-BKO001-BACKENDONLY).
 *
 * ## The shape (SB-015's, kept)
 *
 * `nodegx.automations.json` at the project root, beside `nodegx.security.json`,
 * holding the backend's own **write** shapes (`WorkflowInput`, `TriggerInput`):
 * no timestamps, no run status, no route decorations, so a run never changes
 * git, and **no secret**: a webhook's secret stays in the backend's
 * `secrets.json`. Richard's R1 (2026-10-26): the project's files are the truth,
 * a backend is a copy loaded from them.
 *
 * ## Seeding goes through the registries, never a file copy
 *
 * `upsert` is the one write path both registries validate on, and the trigger
 * registry mints a webhook's secret there. A raw copy into `triggers.json`
 * would start a webhook with no secret and refuse every call it gets. An
 * hmac-sha512 (Paystack) hook cannot be minted: its secret is the sender's key.
 * It is left out and named, never invented.
 *
 * ## Only into an empty backend
 *
 * A backend that already has workflows or triggers is never written here, the
 * rule `applyProjectPolicy` follows. When the two differ, the outcome says how,
 * and the caller reports it: a correct file that is not what is running is the
 * bug this module exists to end, so it must never be silent.
 *
 * @module nodegx-backend/automations/projectAutomations
 */

import * as fs from 'fs';
import * as path from 'path';

import type { TriggerDef, TriggerInput, TriggerRegistry } from '../triggers/registry';
import { validateTriggerDef, validateTriggerInput } from '../triggers/registry';
import type { WorkflowRegistry } from '../workflow/WorkflowRegistry';
import { validateWorkflowDefinition } from '../workflow/WorkflowEngine';
import { migrateDefinition } from '../workflow/steps/migrate';
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

export class ProjectAutomationsError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'ProjectAutomationsError';
    this.code = code;
  }
}

export function projectAutomationsPath(projectDir: string): string {
  return path.join(projectDir, PROJECT_AUTOMATIONS_FILE);
}

const DEFAULT_MAX_BODY_BYTES = 1024 * 1024;
/** The workflow registry's id rule (`WorkflowRegistry.ts` ID_RE), checked here so a bad id is named before a start. */
const WORKFLOW_ID_RE = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/;

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

/** A workflow in the form the project keeps, migrated to this backend's step vocabulary, defaults written out. */
export function projectWorkflow(w: WorkflowDefinition | ProjectWorkflow): ProjectWorkflow {
  const m = migrateDefinition({ ...w }) as ProjectWorkflow;
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

/** Every reason the entries are not valid, in the words the backend's own validators use. */
export function validateProjectAutomations(raw: unknown): string[] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return ['must be a JSON object'];
  const file = raw as Record<string, unknown>;
  const errors: string[] = [];
  for (const key of Object.keys(file)) {
    if (!['version', 'workflows', 'triggers'].includes(key)) errors.push(`unknown key "${key}"`);
  }
  if (file.version !== 1) errors.push(`unsupported version ${JSON.stringify(file.version)}`);
  const workflows = file.workflows === undefined ? [] : file.workflows;
  const triggers = file.triggers === undefined ? [] : file.triggers;
  if (!Array.isArray(workflows)) errors.push('workflows must be an array');
  if (!Array.isArray(triggers)) errors.push('triggers must be an array');
  if (errors.length) return errors;

  const seen = new Set<string>();
  for (const w of workflows as ProjectWorkflow[]) {
    const label = w && typeof w.id === 'string' && w.id ? `workflow "${w.id}"` : 'a workflow';
    if (!w || typeof w.id !== 'string' || !w.id) {
      errors.push(`${label}: needs an id (the project names every workflow, so a backend made from it keeps the same one)`);
      continue;
    }
    if (!WORKFLOW_ID_RE.test(w.id)) errors.push(`${label}: the id must match [A-Za-z0-9][A-Za-z0-9_-]{0,63}`);
    if (seen.has(`w:${w.id}`)) errors.push(`duplicate workflow id "${w.id}"`);
    seen.add(`w:${w.id}`);
    const def = { version: 1, createdAt: '', updatedAt: '', ...projectWorkflow(w) } as WorkflowDefinition;
    for (const e of validateWorkflowDefinition(def)) errors.push(`${label}: ${e}`);
  }
  const slugs = new Set<string>();
  for (const t of triggers as ProjectTrigger[]) {
    const label = t && typeof t.id === 'string' && t.id ? `trigger "${t.id}"` : 'a trigger';
    if (!t || typeof t.id !== 'string' || !t.id) {
      errors.push(`${label}: needs an id`);
      continue;
    }
    if ('secret' in t) errors.push(`${label}: holds a secret, which never goes in a project file (it stays in the backend's secrets.json)`);
    if (seen.has(`t:${t.id}`)) errors.push(`duplicate trigger id "${t.id}"`);
    seen.add(`t:${t.id}`);
    if (t.type === 'webhook' && t.webhook) {
      if (slugs.has(t.webhook.slug)) errors.push(`duplicate webhook slug "${t.webhook.slug}"`);
      slugs.add(t.webhook.slug);
    }
    const { secret: _secret, ...rest } = t as TriggerInput;
    const keyErrors = validateTriggerInput(rest);
    for (const e of keyErrors) errors.push(`${label}: ${e}`);
    // The input check reads keys only; the cron, the target and the type's own block are checked on the
    // trigger the registry would store, so a file that would refuse at upsert is named here first.
    if (!keyErrors.length) {
      const stored = { ...projectTrigger(t), createdAt: '', updatedAt: '', status: { lastFiredAt: null, nextFireAt: null, lastResult: null, fireCount: 0 } };
      for (const e of validateTriggerDef(stored)) errors.push(`${label}: ${e}`);
    }
  }
  return errors;
}

/**
 * Read and validate a project's automations file. Null only when there is no
 * file. Throws for a file that exists and is not valid, never falling back to
 * "none": an automation that silently does not load fails on a delay timer.
 */
export function readProjectAutomations(projectDir: string): ProjectAutomations | null {
  const file = projectAutomationsPath(projectDir);
  if (!fs.existsSync(file)) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (e) {
    throw new ProjectAutomationsError(
      'PROJECT_AUTOMATIONS_INVALID',
      `${file} is not valid JSON: ${e instanceof Error ? e.message : e}\n` +
        `  This file is the project's workflows and triggers. Fix it or delete it.`
    );
  }
  const errors = validateProjectAutomations(parsed);
  if (errors.length) {
    throw new ProjectAutomationsError(
      'PROJECT_AUTOMATIONS_INVALID',
      `${file} is not valid:\n${errors.map((e) => `  - ${e}`).join('\n')}`
    );
  }
  const p = parsed as Partial<ProjectAutomations>;
  return { version: 1, workflows: p.workflows || [], triggers: p.triggers || [] };
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

export type ProjectAutomationsOutcome =
  | { status: 'no-project-dir' }
  | { status: 'no-file'; file: string }
  /** The backend had its own; nothing was written. `differences` empty = they agree. */
  | { status: 'backend-has-its-own'; file: string; differences: string[] }
  | {
      status: 'applied';
      file: string;
      workflows: string[];
      triggers: string[];
      /** Webhooks given a new secret here: the sender needs it (rotate to read one). */
      mintedWebhooks: string[];
      /** hmac-sha512 hooks left out: their secret is the sender's key and cannot be made up. */
      needsSenderKey: string[];
    };

/**
 * Load a project's automations into a backend that has none.
 *
 * All or nothing: a workflow or trigger the registry refuses part-way removes
 * what this call added and throws, so a backend never starts with half of a
 * project's automations.
 */
export function seedProjectAutomations(args: {
  projectDir?: string | null;
  workflows: WorkflowRegistry;
  triggers: TriggerRegistry;
}): ProjectAutomationsOutcome {
  if (!args.projectDir) return { status: 'no-project-dir' };
  const file = projectAutomationsPath(args.projectDir);
  const project = readProjectAutomations(args.projectDir);
  if (!project) return { status: 'no-file', file };

  const existingWorkflows = args.workflows.list();
  const existingTriggers = args.triggers.list();
  if (existingWorkflows.length || existingTriggers.length) {
    const backend = automationsFromBackend(existingWorkflows, existingTriggers);
    return { status: 'backend-has-its-own', file, differences: diffAutomations(project, backend) };
  }

  const added = { workflows: [] as string[], triggers: [] as string[] };
  const mintedWebhooks: string[] = [];
  const needsSenderKey: string[] = [];
  try {
    for (const w of project.workflows) {
      args.workflows.upsert(w);
      added.workflows.push(w.id);
    }
    for (const t of project.triggers) {
      if (t.type === 'webhook' && t.webhook && t.webhook.scheme === 'hmac-sha512') {
        needsSenderKey.push(t.id);
        continue;
      }
      const { secret } = args.triggers.upsert(t);
      added.triggers.push(t.id);
      if (secret) mintedWebhooks.push(t.id);
    }
  } catch (e) {
    for (const id of added.triggers) args.triggers.delete(id);
    for (const id of added.workflows) args.workflows.delete(id);
    throw new ProjectAutomationsError(
      'PROJECT_AUTOMATIONS_REFUSED',
      `${file} could not be loaded into this backend, so none of it was: ${e instanceof Error ? e.message : e}`
    );
  }
  return { status: 'applied', file, ...added, mintedWebhooks, needsSenderKey };
}

/** What a caller should log about an outcome, or null for silence. */
export function describeProjectAutomationsOutcome(outcome: ProjectAutomationsOutcome): string | null {
  switch (outcome.status) {
    case 'applied': {
      const parts = [
        `[nodegx-backend] BKO-001: loaded the project's automations from ${outcome.file}: ` +
          `${outcome.workflows.length} workflow(s), ${outcome.triggers.length} trigger(s).`
      ];
      if (outcome.mintedWebhooks.length) {
        parts.push(
          `  Webhook(s) ${outcome.mintedWebhooks.map((id) => `"${id}"`).join(', ')} got a new secret on this backend. ` +
            `The sender needs it: rotate the secret (update_backend_trigger, rotateSecret) to read it once.`
        );
      }
      if (outcome.needsSenderKey.length) {
        parts.push(
          `  Webhook(s) ${outcome.needsSenderKey.map((id) => `"${id}"`).join(', ')} were NOT loaded: an hmac-sha512 ` +
            `hook checks calls with the sender's own key, so it needs that key set as its secret here.`
        );
      }
      return parts.join('\n');
    }
    case 'backend-has-its-own':
      if (!outcome.differences.length) return null;
      return (
        `[nodegx-backend] BKO-001: this backend's workflows and triggers differ from the project's ` +
        `(${outcome.file}), and an existing backend is never overwritten. The running ones are the backend's:\n` +
        outcome.differences.map((d) => `  - ${d}`).join('\n')
      );
    default:
      return null;
  }
}
