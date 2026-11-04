/**
 * WorkflowSubsystem — the composition root for the WF-001 engine, owned by the
 * BackendService (mirrors TriggerSubsystem's shape).
 *
 * It wires the three pieces the service needs together and exposes what the rest
 * of the service talks to:
 *   - `registry` — CRUD over workflow definitions (admin routes + MCP);
 *   - `run()` / `cancel()` — start / stop a run (admin routes, and the trigger
 *     dispatcher's `target.kind === 'workflow'` path);
 *   - `start()` — recover interrupted runs at startup (durability policy).
 *
 * The step executor is `CompositeStepExecutor`, which dispatches on step kind:
 * `call-function` (and the function-invoking parts of `for-each`/`retry`) runs
 * real cloud functions through the shared WorkflowRunner/CloudRunner, so the
 * engine still schedules real, catalogued nodes and never invents a second node
 * abstraction; WF-002's control-flow kinds (branch/switch/merge/stop/wait) are
 * scheduling decisions the engine already had a seam for.
 *
 * @module nodegx-backend/workflow/WorkflowSubsystem
 */

import type { ExecutionHistory } from '../execution/ExecutionStore';
import type { WorkflowRunner, RunTriggerContext } from './WorkflowRunner';
import { WorkflowEngine } from './WorkflowEngine';
import type { StepExecutor } from './StepExecutor';
import { CompositeStepExecutor } from './steps/CompositeStepExecutor';
import { ApiCallConfigError, ApiCallRegistry } from './ApiCallRegistry';
import { callsUsedBy } from './apiCalls';
import type { ApiCallDefinition, ApiCallInput } from './apiCalls';
import { WorkflowRegistry } from './WorkflowRegistry';
import type { PieceRunner } from './steps/runWorkflow';
import { buildRunPayload } from './runPayload';
import type { WorkflowRunResult } from './types';

export interface WorkflowSubsystemDeps {
  dataDir: string;
  executions: ExecutionHistory;
  getRunner: () => WorkflowRunner | null;
  backendId: string;
  backendName: string;
  /** Test hook: inject a deterministic executor instead of the function one. */
  executor?: StepExecutor;
}

export interface RunByIdResult {
  found: boolean;
  result?: WorkflowRunResult;
}

export class WorkflowSubsystem {
  readonly registry: WorkflowRegistry;
  /** P132 BWF-012: saved API calls. Loaded first: the workflow registry checks a written workflow's uses against it. */
  readonly apiCalls: ApiCallRegistry;
  readonly engine: WorkflowEngine;

  constructor(deps: WorkflowSubsystemDeps) {
    this.apiCalls = new ApiCallRegistry(deps.dataDir);
    const getApiCall = (id: string) => this.apiCalls.get(id);
    this.registry = new WorkflowRegistry(deps.dataDir, getApiCall);
    this.engine = new WorkflowEngine({
      executions: deps.executions,
      executor: deps.executor || new CompositeStepExecutor({ getRunner: deps.getRunner, getApiCall, getPieceRunner: () => this.pieces }),
      backendId: deps.backendId,
      backendName: deps.backendName
    });
  }

  /**
   * P132 BWF-013: how a `run-workflow` step runs its piece: the piece's own run, through this engine, its record naming
   * the run and step that started it. Not a trigger: the run's type says a workflow started it.
   */
  readonly pieces: PieceRunner = {
    run: async (req) => {
      const def = this.registry.get(req.workflow);
      if (!def) return null;
      const result = await this.engine.run(def, {
        trigger: { type: 'internal_event', source: `workflow ${req.parent.workflowId} step ${req.parent.stepId}`, ...(req.onStarted ? { onStarted: req.onStarted } : {}) },
        payload: buildRunPayload({ type: 'internal_event', body: req.body }),
        parent: req.parent,
        startedByApp: !!req.startedByApp,
        ...(req.test ? { test: true } : {})
      });
      return { result, name: def.name || def.id };
    },
    cancel: (executionId) => {
      this.engine.cancel(executionId);
    }
  };

  /** The workflows that use a saved call, by id. */
  usersOfApiCall(id: string): string[] {
    return this.registry
      .list()
      .filter((w) => callsUsedBy(w).includes(id))
      .map((w) => w.id)
      .sort();
  }

  /**
   * P132 BWF-012: save a call. A change that would leave a workflow using it with a blank unfilled (a blank added)
   * or reading one that is gone is refused, naming the workflows, as a delete is.
   */
  saveApiCall(input: ApiCallInput): ApiCallDefinition {
    const blanks = new Set((input.blanks || []).map((b) => b.name));
    const hit: string[] = [];
    for (const w of this.registry.list()) {
      for (const s of w.steps) {
        if (s.kind !== 'http-request' || !s.params || s.params.call !== input.id) continue;
        const fill = (s.params.fill && typeof s.params.fill === 'object' ? s.params.fill : {}) as Record<string, unknown>;
        const empty = [...blanks].filter((b) => fill[b] === undefined);
        if (empty.length) hit.push(`"${w.id}" (step "${s.id}" fills no ${empty.map((b) => `"${b}"`).join(', ')})`);
      }
    }
    if (hit.length) {
      throw new ApiCallConfigError(
        `The saved call "${input.id}" would have a blank that ${hit.length === 1 ? 'a workflow' : 'workflows'} using it ${hit.length === 1 ? 'does' : 'do'} not fill: ${hit.join('; ')}. ` +
          'Fill it in those workflows first, or leave it out of the call.'
      );
    }
    return this.apiCalls.upsert(input);
  }

  /** Delete a saved call no workflow uses. `false` when there is none; throws naming the workflows that use it. */
  deleteApiCall(id: string): boolean {
    const users = this.usersOfApiCall(id);
    if (users.length) {
      throw new ApiCallConfigError(
        `The saved call "${id}" is used by ${users.length === 1 ? 'the workflow' : 'the workflows'} ${users.map((u) => `"${u}"`).join(', ')}: ` +
          'change them to call something else first, or they would fail at their next run.'
      );
    }
    return this.apiCalls.delete(id);
  }

  /** Recover interrupted runs. Call once at startup. Returns the count. */
  start(): number {
    return this.engine.recoverInterrupted();
  }

  /** Run a workflow by id with a payload. `found:false` if no such workflow. */
  async run(
    id: string,
    trigger: RunTriggerContext,
    payload?: Record<string, unknown>,
    test?: { stopAfter?: string; test?: boolean }
  ): Promise<RunByIdResult> {
    const def = this.registry.get(id);
    if (!def) return { found: false };
    const result = await this.engine.run(def, { trigger, payload, ...test });
    return { found: true, result };
  }

  /** Cancel a run by execution id. */
  cancel(executionId: string): boolean {
    return this.engine.cancel(executionId);
  }
}
