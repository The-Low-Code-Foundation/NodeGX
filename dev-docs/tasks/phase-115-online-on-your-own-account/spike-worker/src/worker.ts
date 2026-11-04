/**
 * HST-004 spike: the backend's own WorkflowEngine, run on Cloudflare Workers.
 *
 * Nothing here re-implements a step. The engine, the step executors, the payload builder and the value language are
 * imported from packages/nodegx-backend/src as they are; this file only supplies what the Node service supplies:
 *
 *   - the workflows: the project's nodegx.automations.json, bundled at deploy (the `project-automations` alias);
 *   - the Secrets: `_noodl_get_secret`, read from the Worker's own secret bindings (never from the project);
 *   - Call an API's transport: `fetch` (`fetchHttpTransport`), since workerd has no `lookup` for the address guard;
 *   - a run history: a stub, because `createLogger()` may answer null (D1 is HST-006's);
 *   - the doors: `POST /workflows/<id>` (the spike's; how a browser calls a workflow is a finding), the Worker's
 *     cron, which fires the project's schedule triggers, and (session 2) `POST /functions/<name>`, the door the exported
 *     page's Cloud Function node calls: the project's cloud functions, built by the editor's own bundler (build.mjs),
 *     run by the cloud runtime's CloudRunner the way `HttpServer.runFunction` runs them, one runner per request
 *     (P115-HST004-WARMRUNNER).
 */
import { WorkflowEngine } from '@backend/workflow/WorkflowEngine';
import { CompositeStepExecutor } from '@backend/workflow/steps/CompositeStepExecutor';
import { fetchHttpTransport } from '@backend/workflow/steps/httpTransport';
import { buildRunPayload } from '@backend/workflow/runPayload';
import type { WorkflowDefinition } from '@backend/workflow/types';
import automations from 'project-automations';
import functionsBundle from 'project-functions';
import { CloudRunner } from '@cloud-runtime';

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
  // workerd has node:http's client but not its `lookup` (P115-HST004-HTTPLOOKUP): Call an API sends over fetch here,
  // and a deployed Worker cannot reach a private address anyway. checkLiteralHost still runs in the step.
  const executor = new CompositeStepExecutor({ getRunner: () => null, httpTransport: fetchHttpTransport });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new WorkflowEngine({ executions: history as any, executor, backendId: 'worker', backendName: 'worker' });
}

const json = (v: unknown, status = 200) =>
  new Response(JSON.stringify(v, null, 2), { status, headers: { 'content-type': 'application/json' } });

/**
 * `POST /functions/<name>`, as the backend answers it: the JSON body handed on as a string with the headers verbatim,
 * and the Response node's status and body sent back unchanged (the client reads `{ result }` or `{ error }` from it).
 */
async function runFunction(name: string, req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'POST to run it' }, 405);
  const body = await req.json().catch(() => ({}));
  const runner = new CloudRunner({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await runner.load(functionsBundle as any);
  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => (headers[k] = v));
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const out: any = await runner.run(name, { body: JSON.stringify(body), headers } as any, { timeoutMs: 10000 });
    return new Response(out.body, { status: out.statusCode, headers: { 'content-type': 'application/json' } });
  } catch (e) {
    // As WorkflowRunner answers them: a body the Request node's declared contract refuses is the caller's 400 (CWF-014),
    // a graph that never reached a Response is a 504, anything else is a 500.
    const err = e as { name?: string; message?: string; fields?: unknown[] };
    if (err?.name === 'CloudFunctionBadRequestError') {
      return json({ error: err.message, code: 'function/bad-request', fields: err.fields || [] }, 400);
    }
    if (err?.name === 'CloudFunctionTimeoutError') return json({ error: err.message, code: 'function/timeout' }, 504);
    return json({ error: err?.message ?? String(e) }, 500);
  }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    install(env);
    const url = new URL(req.url);
    const fn = /^\/functions\/([^/]+)$/.exec(url.pathname);
    if (fn) return runFunction(decodeURIComponent(fn[1]), req);
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
