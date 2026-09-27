/**
 * Admin workflow-definition routes (WF-001) — CRUD over the workflow registry
 * plus run/cancel, proxied by the editor and driven by the MCP workflow tools.
 * All routes are `admin` access, mirroring admin-triggers.ts.
 *
 *   GET    /admin/workflow-defs              list
 *   POST   /admin/workflow-defs             create
 *   GET    /admin/workflow-defs/:id         get one
 *   PUT    /admin/workflow-defs/:id         update
 *   DELETE /admin/workflow-defs/:id         delete
 *   POST   /admin/workflow-defs/:id/run     run now (payload optional)
 *   POST   /admin/workflow-runs/:executionId/cancel   cancel an in-flight run
 *   GET    /admin/workflow-step-kinds       the WF-002 step-kind catalog
 *
 * @module nodegx-backend/server/admin-workflows
 */

import type { RequestContext } from './HttpServer';
import type { ExecutionHistory } from '../execution/ExecutionStore';
import type { WorkflowSubsystem } from '../workflow/WorkflowSubsystem';
import { WorkflowConfigError } from '../workflow/WorkflowRegistry';
import { buildRunPayload, spreadableBody } from '../workflow/runPayload';
import { stepKindCatalog } from '../workflow/steps/kinds';
import type { WorkflowDefinition, WorkflowInput, WorkflowRunResult } from '../workflow/types';
import { HttpError, readJSONBody, sendJSON } from './http-util';

/**
 * What the Workflows page's *Last run* column shows (BMG-009): the newest
 * execution record of each workflow, or nothing. A DECORATION beside the
 * definitions, never on them — a definition is what a `PUT` carries back,
 * and it must not grow a field the registry did not write.
 */
export interface WorkflowLastRun {
  id: string;
  status: string;
  startedAt: number;
  durationMs?: number;
  /** `cancelled` / `timeout` when the engine said so; the store's own status alone cannot. */
  engineStatus?: string;
}

/** `GET /admin/workflow-defs`. */
export interface WorkflowListResponse {
  workflows: WorkflowDefinition[];
  /** BMG-009 — by workflow id; a workflow that never ran is absent. */
  lastRuns: Record<string, WorkflowLastRun>;
}

/** The body of every single-definition response (GET / POST / PUT). */
export interface WorkflowResponse {
  workflow: WorkflowDefinition;
}

/** `DELETE /admin/workflow-defs/:id`. */
export interface WorkflowDeletedResponse {
  deleted: boolean;
  id: string;
}

/**
 * `POST /admin/workflow-defs/validate` (WFA-007) — the dry run.
 *
 * `valid: false` is a **200**, not a 400: the caller asked a question and got an
 * answer. A 400 here would be indistinguishable from the route being wrong, and
 * the whole point is to distinguish "this would be rejected" from "something
 * went wrong asking".
 */
export interface WorkflowValidateResponse {
  valid: boolean;
  errors: string[];
  /**
   * CWF-005: **the definition this backend would store**, when it would accept
   * one. Null when it would not.
   *
   * It can differ from what the caller sent, because a definition written
   * against an older step vocabulary is migrated on the way in. A caller that
   * DRAWS a candidate before it is saved — the editor's proposal review — has to
   * draw this, not the submission, or it reviews a step kind this backend no
   * longer has and reports a change the proposal does not make.
   *
   * Additive: a caller that only reads `valid` / `errors` is unaffected, and an
   * older backend simply omits the field.
   */
  definition: WorkflowDefinition | null;
}

/** `POST /admin/workflow-defs/:id/run`. */
export interface WorkflowRunResponse {
  run: WorkflowRunResult;
}

/**
 * `POST /admin/workflow-defs/:id/run` with `wait: false` (BMG-009) — a **202**
 * as soon as the record is opened, so a page can land on `#/runs/<id>` while
 * the run is still going. Only when the history is on: without a record there
 * is no id to hand back, and the route waits as before.
 */
export interface WorkflowStartedResponse {
  started: true;
  executionId: string;
  workflowId: string;
}

export class AdminWorkflowRoutes {
  constructor(
    private readonly getWorkflows: () => WorkflowSubsystem | null,
    private readonly getExecutions: () => ExecutionHistory | null = () => null
  ) {}

  private subsystem(): WorkflowSubsystem {
    const wf = this.getWorkflows();
    if (!wf) throw new HttpError(503, 'Workflow engine is not ready');
    return wf;
  }

  /**
   * The step-kind catalog (WF-002): every kind this backend can run, with its
   * params, routes, output shape and prose. This is how an authoring agent — or
   * a human reading the API — discovers the step vocabulary, since a workflow
   * step is not a graph node and so cannot appear in SUB-004's node catalog.
   *
   * Deliberately does NOT go through `subsystem()`: the vocabulary is static,
   * and "what can I author?" must be answerable before the engine is ready.
   */
  stepKinds(ctx: RequestContext): void {
    sendJSON(ctx.res, 200, stepKindCatalog());
  }

  list(ctx: RequestContext): void {
    const workflows = this.subsystem().registry.list();
    const history = this.getExecutions();
    const lastRuns: Record<string, WorkflowLastRun> = {};
    if (history) {
      for (const def of workflows) {
        const [last] = history.list({ workflowId: def.id, limit: 1 });
        if (!last) continue;
        const engineStatus = last.metadata && typeof last.metadata.engineStatus === 'string' ? last.metadata.engineStatus : undefined;
        lastRuns[def.id] = {
          id: last.id,
          status: last.status,
          startedAt: last.startedAt,
          ...(last.durationMs !== undefined && last.durationMs !== null ? { durationMs: last.durationMs } : {}),
          ...(engineStatus ? { engineStatus } : {})
        };
      }
    }
    sendJSON(ctx.res, 200, { workflows, lastRuns } satisfies WorkflowListResponse);
  }

  get(ctx: RequestContext): void {
    const def = this.subsystem().registry.get(ctx.params.id);
    if (!def) throw new HttpError(404, `No workflow "${ctx.params.id}"`);
    sendJSON(ctx.res, 200, { workflow: def } satisfies WorkflowResponse);
  }

  /**
   * WFA-007 — validate a candidate definition against THIS backend, writing
   * nothing.
   *
   * The editor's review surface asks this before it renders a proposal (a
   * candidate that could not be saved must never be offered as a choice) and
   * again after a partial accept (whatever the review's dependency closures
   * miss, the authoritative validator sees). MCP asks it before staging a
   * proposal, so an agent gets the backend's own errors instead of the user
   * getting an unacceptable choice.
   *
   * The version skew this closes is real: a definition valid against one
   * backend is not necessarily valid against another, which is the same reason
   * the step-kind registry is served rather than bundled.
   */
  async validate(ctx: RequestContext): Promise<void> {
    const body = await readJSONBody(ctx.req);
    const { errors, definition } = this.subsystem().registry.preview(body as unknown as WorkflowInput);
    sendJSON(ctx.res, 200, {
      valid: errors.length === 0,
      errors,
      definition
    } satisfies WorkflowValidateResponse);
  }

  async create(ctx: RequestContext): Promise<void> {
    const body = await readJSONBody(ctx.req);
    this.upsert(ctx, body as unknown as WorkflowInput, undefined, 201);
  }

  async update(ctx: RequestContext): Promise<void> {
    const body = await readJSONBody(ctx.req);
    this.upsert(ctx, body as unknown as WorkflowInput, ctx.params.id, 200);
  }

  private upsert(ctx: RequestContext, input: WorkflowInput, id: string | undefined, status: number): void {
    try {
      const def = this.subsystem().registry.upsert({ ...input, id: id || input.id });
      sendJSON(ctx.res, status, { workflow: def } satisfies WorkflowResponse);
    } catch (e) {
      if (e instanceof WorkflowConfigError) throw new HttpError(400, e.message);
      throw e;
    }
  }

  delete(ctx: RequestContext): void {
    const ok = this.subsystem().registry.delete(ctx.params.id);
    if (!ok) throw new HttpError(404, `No workflow "${ctx.params.id}"`);
    sendJSON(ctx.res, 200, { deleted: true, id: ctx.params.id } satisfies WorkflowDeletedResponse);
  }

  /** Run a workflow now (records as a 'manual' execution unless a body says otherwise). */
  async run(ctx: RequestContext): Promise<void> {
    const body = await readJSONBody(ctx.req);
    // `{"payload": …}` is the documented form; a bare object is accepted as the
    // payload itself. WFA-003: whichever it was, the caller's data lands under
    // `body` — and stays spread at the top level as the deprecated legacy view,
    // which is the shape every workflow authored before this reads.
    // BMG-009: `wait: false` is the page's, never part of the caller's data. It is
    // read off the envelope form only; a bare body is the payload, `wait` and all.
    const noWait = !!body && body.wait === false && 'payload' in body;
    const callerData = (body && (body.payload as Record<string, unknown>)) || body || {};
    const payload = buildRunPayload({
      type: 'manual',
      body: callerData,
      legacy: spreadableBody(callerData)
    });
    const id = ctx.params.id;
    const subsystem = this.subsystem();
    if (!subsystem.registry.get(id)) throw new HttpError(404, `No workflow "${id}"`);

    let answered = false;
    let startedHook: ((executionId: string) => void) | undefined;
    const started = new Promise<WorkflowStartedResponse>((resolve) => {
      if (!noWait) return;
      // FED-004's `onStarted`: called once with the record id before the graph runs.
      startedHook = (executionId: string) => resolve({ started: true, executionId, workflowId: id });
    });

    const finished = subsystem.run(id, { type: 'manual', source: `manual run of ${id}`, ...(noWait ? { onStarted: (eid) => startedHook && startedHook(eid) } : {}) }, payload);
    // Whichever comes first: the record opening (202) or, with the history off, the run ending (200).
    const outcome = await Promise.race([
      started.then((s) => ({ kind: 'started' as const, s })),
      finished.then((r) => ({ kind: 'finished' as const, r }))
    ]);
    if (outcome.kind === 'started') {
      answered = true;
      sendJSON(ctx.res, 202, outcome.s);
      // The run goes on; its record is where its outcome lands. A rejection here would otherwise be unhandled.
      finished.catch(() => undefined);
      return;
    }
    const { found, result } = outcome.r;
    if (answered) return;
    if (!found || !result) throw new HttpError(404, `No workflow "${id}"`);
    sendJSON(ctx.res, 200, { run: result } satisfies WorkflowRunResponse);
  }

  /** Cancel an in-flight run by its execution id. */
  cancel(ctx: RequestContext): void {
    const cancelled = this.subsystem().cancel(ctx.params.executionId);
    if (!cancelled) throw new HttpError(404, `No active run "${ctx.params.executionId}"`);
    sendJSON(ctx.res, 200, { cancelling: true, executionId: ctx.params.executionId });
  }
}
