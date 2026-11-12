/**
 * P115 HST-014 §5.4 item 2 — a project's workflows, triggers and saved API calls, carried to its RUNNING backend by a
 * redeploy.
 *
 * A backend takes `nodegx.automations.json` at its FIRST start only (P127 BKO-001 `seedProjectAutomations`: never into
 * a backend that has its own). On Cloudflare the backend starts once and lives in its object, so before this a changed
 * schedule or a new workflow never reached a deployed app, and the command only said so.
 *
 * The rule is the VM deploy's (`deploy/folder/start.js` `planAutomations`, Richard 2026-10-23: *a reship brings the
 * project's rules; an edit made on the server lasts until the project's change*), on the deployment record instead of a
 * marker in the data folder:
 *
 *   none        the project has no file: the backend keeps its own.
 *   unchanged   the file is the one the last deploy installed (its sha256 in `deployment.json`): nothing is written, so an
 *               edit made on the backend since is kept. A difference is NAMED, never silent.
 *   agree       a new or unrecorded file the backend already matches: nothing is written, the file is recorded.
 *   replace     a new or unrecorded file that differs: the backend's set is handed back (the caller keeps it beside the
 *               record, as the VM moves `triggers.json` aside), then made to match through the admin API — saved calls,
 *               workflows, triggers created or updated in that order (a trigger aims at a workflow, a workflow uses a
 *               call), then the triggers and workflows the file no longer has deleted. Saved API calls are never deleted
 *               (the VM does not move them either): one only on the backend is kept and named.
 *
 * All or nothing: a refusal part-way puts back what was there (a created one deleted, an updated one written back) and
 * throws, so a backend never runs half of a project's automations. An update keeps a webhook's secret (the registry
 * keeps it when none is sent); a new webhook is minted one and named; an hmac-sha512 (Paystack) hook the backend lacks
 * is left out and named, as the seeding does: its secret is the sender's key.
 *
 * Transport-free (`AdminCall`), so jest runs it against a real `BackendService` in Node.
 */
import * as crypto from 'crypto';

import { automationsFromBackend, diffAutomations, projectApiCall, projectTrigger, projectWorkflow, type ProjectAutomations } from '../src/automations/shape';
import type { TriggerDef } from '../src/triggers/registry';
import type { ApiCallDefinition } from '../src/workflow/apiCallTypes';
import type { WorkflowDefinition } from '../src/workflow/types';
import { ApplyError, type AdminCall, type AdminAnswer } from './applyProject';

export type AutomationsAction = 'none' | 'unchanged' | 'agree' | 'replace';

export interface AutomationsReport {
  action: AutomationsAction;
  /** The sha256 of the file, to record as installed; null when the project has none. */
  sha256: string | null;
  /** One sentence per thing done or kept, for the person. */
  lines: string[];
  created: string[];
  updated: string[];
  deleted: string[];
  /** On `replace`: the backend's set as it was, in the project's shape, for the caller to keep. */
  before?: ProjectAutomations;
}

export function automationsSha256(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

async function must(call: AdminCall, method: string, path: string, body?: unknown): Promise<AdminAnswer> {
  const answer = await call(method, path, body);
  if (answer.status >= 300) {
    const said = (answer.json as { error?: string } | null)?.error ?? answer.text.slice(0, 600);
    throw new ApplyError(`${method} /${path.replace(/^\//, '')} answered ${answer.status}: ${said}`);
  }
  return answer;
}

interface Live {
  workflows: WorkflowDefinition[];
  triggers: TriggerDef[];
  /** Undefined when the backend has no `/admin/api-calls` (an older one): then not compared. */
  apiCalls?: ApiCallDefinition[];
}

async function readLive(call: AdminCall): Promise<Live> {
  const wf = (await must(call, 'GET', '/admin/workflow-defs')).json as { workflows?: WorkflowDefinition[] } | null;
  const tr = (await must(call, 'GET', '/admin/triggers')).json as { triggers?: TriggerDef[] } | null;
  const ac = await call('GET', '/admin/api-calls');
  return {
    workflows: wf?.workflows ?? [],
    triggers: tr?.triggers ?? [],
    apiCalls: ac.status < 300 ? (ac.json as { calls?: ApiCallDefinition[] } | null)?.calls ?? [] : undefined
  };
}

const enc = encodeURIComponent;
const quoted = (ids: string[]) => ids.map((id) => `"${id}"`).join(', ');

export async function applyAutomations(
  call: AdminCall,
  text: string | null,
  options: { installedSha256?: string | null }
): Promise<AutomationsReport> {
  const report: AutomationsReport = { action: 'none', sha256: null, lines: [], created: [], updated: [], deleted: [] };
  if (text === null) {
    report.lines.push("Workflows and triggers: the project has no nodegx.automations.json, so the backend keeps its own.");
    return report;
  }
  const parsed = JSON.parse(text) as Partial<ProjectAutomations>;
  const project: ProjectAutomations = { version: 1, workflows: parsed.workflows ?? [], triggers: parsed.triggers ?? [] };
  if (parsed.apiCalls?.length) project.apiCalls = parsed.apiCalls;
  report.sha256 = automationsSha256(text);

  const live = await readLive(call);
  const backend = automationsFromBackend(live.workflows, live.triggers, live.apiCalls);
  // Saved calls are only ever added or updated here, so one only on the backend is not a difference to act on.
  const differences = diffAutomations(project, backend).filter((d) => !/^saved API call ".*" is on the backend, not in the project$/.test(d));

  if (options.installedSha256 && options.installedSha256 === report.sha256) {
    report.action = 'unchanged';
    if (!differences.length) {
      report.lines.push(`Workflows and triggers: unchanged since the last deploy, and the backend runs them (${project.workflows.length} and ${project.triggers.length}).`);
    } else {
      report.lines.push(
        'Workflows and triggers: nodegx.automations.json is unchanged since the last deploy, so the backend keeps its ' +
          `own, which were edited there since:\n${differences.map((d) => `    - ${d}`).join('\n')}\n` +
          '    Change the project\'s file and deploy again to replace them.'
      );
    }
    return report;
  }
  if (!differences.length) {
    report.action = 'agree';
    report.lines.push(`Workflows and triggers: the backend already runs the project's (${project.workflows.length} and ${project.triggers.length}).`);
    return report;
  }

  report.action = 'replace';
  report.before = backend;
  const liveWorkflow = new Map(live.workflows.map((w) => [w.id, w]));
  const liveTrigger = new Map(live.triggers.map((t) => [t.id, t]));
  const liveCall = new Map((live.apiCalls ?? []).map((c) => [c.id, c]));
  const undo: Array<() => Promise<unknown>> = [];
  const minted: string[] = [];
  const needsSenderKey: string[] = [];
  const same = <T>(norm: (x: T) => T, a: T, b: T) => JSON.stringify(norm(a)) === JSON.stringify(norm(b));

  try {
    if (project.apiCalls?.length && !live.apiCalls) throw new ApplyError('the project has saved API calls, and this backend has no place to keep them.');
    for (const c of project.apiCalls ?? []) {
      const was = liveCall.get(c.id);
      if (was && same(projectApiCall, c, was)) continue;
      await must(call, 'PUT', `/admin/api-calls/${enc(c.id)}`, c);
      (was ? report.updated : report.created).push(`saved API call "${c.id}"`);
      undo.push(() => (was ? call('PUT', `/admin/api-calls/${enc(c.id)}`, projectApiCall(was)) : call('DELETE', `/admin/api-calls/${enc(c.id)}`)));
    }
    for (const w of project.workflows) {
      const was = liveWorkflow.get(w.id);
      if (was && same(projectWorkflow, w, was)) continue;
      await must(call, was ? 'PUT' : 'POST', was ? `/admin/workflow-defs/${enc(w.id)}` : '/admin/workflow-defs', w);
      (was ? report.updated : report.created).push(`workflow "${w.id}"`);
      undo.push(() => (was ? call('PUT', `/admin/workflow-defs/${enc(w.id)}`, projectWorkflow(was)) : call('DELETE', `/admin/workflow-defs/${enc(w.id)}`)));
    }
    for (const t of project.triggers) {
      const was = liveTrigger.get(t.id);
      if (was && same(projectTrigger, t, was)) continue;
      if (!was && t.type === 'webhook' && t.webhook?.scheme === 'hmac-sha512') {
        needsSenderKey.push(t.id);
        continue;
      }
      if (was && was.type !== t.type) {
        // A different type is a different trigger (the registry refuses the change in place): delete, then create.
        await must(call, 'DELETE', `/admin/triggers/${enc(t.id)}`);
        undo.push(() => call('POST', '/admin/triggers', projectTrigger(was)));
      }
      const replaceInPlace = was && was.type === t.type;
      const made = await must(call, replaceInPlace ? 'PUT' : 'POST', replaceInPlace ? `/admin/triggers/${enc(t.id)}` : '/admin/triggers', t);
      (was ? report.updated : report.created).push(`trigger "${t.id}"`);
      if ((made.json as { secret?: string } | null)?.secret) minted.push(t.id);
      undo.push(() => (replaceInPlace ? call('PUT', `/admin/triggers/${enc(t.id)}`, projectTrigger(was!)) : call('DELETE', `/admin/triggers/${enc(t.id)}`)));
    }
    // Deleted last, triggers before the workflows they aim at; nothing is deleted until every write above is in.
    const keepTriggers = new Set(project.triggers.map((t) => t.id));
    for (const t of live.triggers) {
      if (keepTriggers.has(t.id)) continue;
      await must(call, 'DELETE', `/admin/triggers/${enc(t.id)}`);
      report.deleted.push(`trigger "${t.id}"`);
      undo.push(() => call('POST', '/admin/triggers', projectTrigger(t)));
    }
    const keepWorkflows = new Set(project.workflows.map((w) => w.id));
    for (const w of live.workflows) {
      if (keepWorkflows.has(w.id)) continue;
      await must(call, 'DELETE', `/admin/workflow-defs/${enc(w.id)}`);
      report.deleted.push(`workflow "${w.id}"`);
      undo.push(() => call('POST', '/admin/workflow-defs', projectWorkflow(w)));
    }
  } catch (e) {
    for (const step of undo.reverse()) await step().catch(() => undefined);
    throw new ApplyError(
      `nodegx.automations.json could not be carried to the backend, so none of it was (the backend's are as they were): ${(e as Error).message}`
    );
  }

  const parts = [
    report.created.length ? `made ${report.created.join(', ')}` : '',
    report.updated.length ? `changed ${report.updated.join(', ')}` : '',
    report.deleted.length ? `deleted ${report.deleted.join(', ')}` : ''
  ].filter(Boolean);
  report.lines.push(`Workflows and triggers: replaced with the project's (nodegx.automations.json changed): ${parts.join('; ') || 'nothing to write'}.`);
  if (minted.length) {
    report.lines.push(
      `Webhook(s) ${quoted(minted)} got a new secret on this backend. The sender needs it: rotate the secret on the ` +
        "backend's Triggers page (or update_backend_trigger, rotateSecret) to read it once."
    );
  }
  if (needsSenderKey.length) {
    report.lines.push(
      `Webhook(s) ${quoted(needsSenderKey)} were NOT made: an hmac-sha512 hook checks calls with the sender's own key, ` +
        'so it needs that key set as its secret on the backend.'
    );
  }
  const onlyBackendCalls = (live.apiCalls ?? []).filter((c) => !(project.apiCalls ?? []).some((p) => p.id === c.id)).map((c) => c.id);
  if (onlyBackendCalls.length) report.lines.push(`Kept on the backend: saved API call(s) ${quoted(onlyBackendCalls)} (not in the project; never deleted by a deploy).`);
  return report;
}
