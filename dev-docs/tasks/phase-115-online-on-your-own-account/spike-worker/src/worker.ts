/**
 * HST-004 spike: the backend's own WorkflowEngine, run on Cloudflare Workers.
 *
 * Nothing here re-implements a step. The engine, the step executors, the payload builder and the value language are
 * imported from packages/nodegx-backend/src as they are; this file only supplies what the Node service supplies:
 *
 *   - the workflows: the project's nodegx.automations.json, bundled at deploy (the `project-automations` alias);
 *   - the Secrets: `_noodl_get_secret`, read from the Worker's own secret bindings (never from the project);
 *   - a run history: a stub, because `createLogger()` may answer null (D1 is HST-006's);
 *   - the doors: `POST /workflows/<id>` (the spike's; how a browser calls a workflow is a finding) and the Worker's
 *     cron, which fires the project's schedule triggers.
 */
import { WorkflowEngine } from '@backend/workflow/WorkflowEngine';
import { CompositeStepExecutor } from '@backend/workflow/steps/CompositeStepExecutor';
import { buildRunPayload } from '@backend/workflow/runPayload';
import type { WorkflowDefinition } from '@backend/workflow/types';
import automations from 'project-automations';

interface Env {
  [name: string]: unknown;
  /** Local runs only: let the HTTP step call 127.0.0.1 (the stand-in). Never set on a deployed Worker. */
  ALLOW_PRIVATE_HTTP?: string;
}

type Trigger = {
  id: string;
  type: string;
  enabled?: boolean;
  target?: { kind: string; name: string };
  schedule?: { cron: string };
};

const file = automations as unknown as { workflows: WorkflowDefinition[]; triggers?: Trigger[] };
const byId = new Map(file.workflows.map((w) => [w.id, w]));

const history = {
  createLogger: () => null,
  list: () => [],
  markInterrupted: () => {},
  stampMetadata: () => {}
};

function install(env: Env): void {
  const g = globalThis as Record<string, unknown>;
  g._noodl_get_secret = (name: string) => {
    const v = env[name];
    return typeof v === 'string' ? { found: true, value: v } : { found: false };
  };
  g._noodl_http_step_policy = { allowPrivate: env.ALLOW_PRIVATE_HTTP === '1' };
}

function engine(): WorkflowEngine {
  const executor = new CompositeStepExecutor({ getRunner: () => null });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new WorkflowEngine({ executions: history as any, executor, backendId: 'worker', backendName: 'worker' });
}

const json = (v: unknown, status = 200) =>
  new Response(JSON.stringify(v, null, 2), { status, headers: { 'content-type': 'application/json' } });

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    install(env);
    const url = new URL(req.url);
    const m = /^\/workflows\/([a-z0-9-]+)$/.exec(url.pathname);
    if (!m) return json({ workflows: [...byId.keys()], triggers: (file.triggers || []).map((t) => t.id) });
    const def = byId.get(m[1]);
    if (!def) return json({ error: `no workflow "${m[1]}"` }, 404);
    if (req.method !== 'POST') return json({ error: 'POST to run it' }, 405);
    const body = await req.json().catch(() => ({}));
    const result = await engine().run(def, {
      trigger: { type: 'manual', source: 'worker POST' },
      payload: buildRunPayload({ type: 'manual', body })
    });
    return json(result, result.status === 'success' ? 200 : 500);
  },

  async scheduled(event: ScheduledController, env: Env): Promise<void> {
    install(env);
    for (const t of file.triggers || []) {
      if (t.type !== 'schedule' || t.enabled === false || t.schedule?.cron !== event.cron) continue;
      const def = t.target?.kind === 'workflow' ? byId.get(t.target.name) : undefined;
      if (!def) continue;
      const result = await engine().run(def, {
        trigger: { type: 'schedule', triggerId: t.id, source: `schedule ${t.id} (${event.cron})` },
        payload: buildRunPayload({ type: 'schedule', triggerId: t.id, cron: event.cron })
      });
      console.log(JSON.stringify({ trigger: t.id, status: result.status, failedStep: result.failedStep }));
    }
  }
};
