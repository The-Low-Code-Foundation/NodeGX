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
 *     run by the cloud runtime's CloudRunner the way `HttpServer.runFunction` runs them: one runner per isolate,
 *     reused (P115-HST004-WARMRUNNER fixed; a fresh one cost 11–32 ms CPU a call), loaded and run once at startup
 *     (HST-004 §9: an isolate's first calls cost 10–35 ms otherwise). `x-warmed-at-startup` on each answer says so.
 */
import { WorkflowEngine } from '@backend/workflow/WorkflowEngine';
import { CompositeStepExecutor } from '@backend/workflow/steps/CompositeStepExecutor';
import { fetchHttpTransport } from '@backend/workflow/steps/httpTransport';
import { buildRunPayload } from '@backend/workflow/runPayload';
import type { WorkflowDefinition } from '@backend/workflow/types';
import automations from 'project-automations';
import functionsBundle from 'project-functions';
import { CloudRunner } from '@cloud-runtime';
import { handlePlanLimit, type PlanLimitEnv } from './planLimit';

interface Env extends PlanLimitEnv {
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
/**
 * One runner per isolate, as the backend keeps one per process, built, loaded and run once at startup (below), so all
 * of it is paid from the startup allowance (1 s CPU) rather than from the first calls' 10 ms each. If the warm-up
 * fails, the bundle is loaded on the first call instead; a failed load is not kept, so the next call retries.
 */
/** The project's cloud functions by name: the only names a refusal report may put in the builder's email. */
const FUNCTION_NAMES = new Set(
  (functionsBundle as unknown as { components: { name: string }[] }).components.map((c) => c.name.replace(/^\/#__cloud__\//, ''))
);
const runner0 = new CloudRunner({});
let runnerReady: Promise<CloudRunner> | null = null;

type BundleNode = { type: string; parameters?: Record<string, unknown> };
type BundleComponent = { name: string; nodes: BundleNode[] };

/** A body every declared field of a function's Request node accepts: what one warm-up run sends. */
function warmUpBody(c: BundleComponent): Record<string, unknown> {
  const p = c.nodes.find((n) => n.type === 'noodl.cloud.request')?.parameters ?? {};
  const body: Record<string, unknown> = {};
  for (const f of String(p.params ?? '').split(',').map((s) => s.trim()).filter(Boolean)) {
    const t = p[`ptype-${f}`];
    body[f] = t === 'number' ? 0 : t === 'boolean' ? false : t === 'array' ? [] : t === 'object' ? {} : 'warm-up@example.com';
  }
  return body;
}

/**
 * Warm the runner at STARTUP, from the 1 s startup allowance instead of the first calls' 10 ms each: load the bundle
 * and run every function once. Measured on the deploy (HST-004 §9): a cold isolate's first cloud calls cost 10–35 ms
 * (loading the bundle, then V8 compiling the interpreter's code the first time it runs); a warm one 1–2 ms.
 *
 * A Worker's global scope refuses timers and I/O, so for the warm-up only: timers become microtasks (a run's own
 * timeout and the HTTP node's abort timer become no-ops), `fetch` answers a canned 200 without leaving the Worker,
 * and any Secret reads a dummy value. All of it is put back before the first request.
 */
const WARM_RUNS = 20;
function warmAtStartup(): Promise<CloudRunner> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = globalThis as any;
  const saved = { si: g.setImmediate, st: g.setTimeout, ct: g.clearTimeout, fetch: g.fetch, secret: g._noodl_get_secret };
  g.setImmediate = (f: (...a: unknown[]) => void, ...a: unknown[]) => queueMicrotask(() => f(...a));
  g.setTimeout = () => 0;
  g.clearTimeout = () => {};
  g.fetch = async () => new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
  g._noodl_get_secret = () => ({ found: true, value: 'warm-up' });
  const restore = () => {
    g.setImmediate = saved.si;
    g.setTimeout = saved.st;
    g.clearTimeout = saved.ct;
    g.fetch = saved.fetch;
    g._noodl_get_secret = saved.secret;
  };
  const components = (functionsBundle as unknown as { components: BundleComponent[] }).components;
  // Put back at the first request, not when the warm-up settles: a microtask the warm-up leaves behind (the runtime's
  // next update) may still call `setImmediate` during startup, where the real one throws.
  restoreAtFirstRequest = restore;
  return (
    runner0
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .load(functionsBundle as any)
      .then(async () => {
        // WARM_RUNS, not one: V8 compiles a function to faster code only after it has run a number of times, so one
        // run pays the load and first compile but leaves an isolate's next ~10 real calls at 8–17 ms (HST-004 §9).
        for (let i = 0; i < WARM_RUNS; i++) {
          for (const c of components) {
            await runner0
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .run(c.name.replace(/^\/#__cloud__\//, ''), { body: JSON.stringify(warmUpBody(c)), headers: {} } as any)
              .catch(() => null);
          }
        }
      })
      .then(() => runner0)
  );
}
let restoreAtFirstRequest: (() => void) | null = null;
/** The first request puts back what the warm-up replaced (timers, fetch, the secret reader), before `install(env)`. */
function leaveStartup(): void {
  if (!restoreAtFirstRequest) return;
  restoreAtFirstRequest();
  restoreAtFirstRequest = null;
}
let warmedAtStartup: 'pending' | 'yes' | 'no' = 'pending';
try {
  runnerReady = warmAtStartup();
  runnerReady.then(
    () => (warmedAtStartup = 'yes'),
    () => ((warmedAtStartup = 'no'), (runnerReady = null))
  );
} catch {
  warmedAtStartup = 'no';
  runnerReady = null;
}

function warmRunner(): Promise<CloudRunner> {
  if (!runnerReady) {
    const r = runner0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    runnerReady = r.load(functionsBundle as any).then(() => r);
    runnerReady.catch(() => (runnerReady = null));
  }
  return runnerReady;
}

async function runFunction(name: string, req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'POST to run it' }, 405);
  const body = await req.json().catch(() => ({}));
  const runner = await warmRunner();
  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => (headers[k] = v));
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const out: any = await runner.run(name, { body: JSON.stringify(body), headers } as any, { timeoutMs: 10000 });
    return new Response(out.body, { status: out.statusCode, headers: { 'content-type': 'application/json', 'x-warmed-at-startup': warmedAtStartup } });
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
    leaveStartup();
    install(env);
    const url = new URL(req.url);
    // HST-004 §10: the page's report that Cloudflare refused one of its calls over the plan's limit.
    if (url.pathname === '/__nodegx/plan-limit') return handlePlanLimit(req, env, 'hst-spike-worker', FUNCTION_NAMES);
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
    leaveStartup();
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
