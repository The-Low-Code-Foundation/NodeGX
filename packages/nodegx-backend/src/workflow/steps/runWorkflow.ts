/**
 * P132 BWF-013 (R6): the `run-workflow` step: runs a reusable piece (another workflow) and hands on its answer.
 *
 * `workflow` is the piece's id; `send` its named values, each a value the run has (a literal, `{"$path"}`, a formula),
 * resolved by the engine before the step runs, and arriving as the piece's `body`. The piece runs as its own recorded
 * run (its record names this run and step), so a person opens it from the step as they open any run. The step's
 * output is `{ result, run }`: `result` what the piece answered (its `return`, else its last step's output), `run`
 * the piece's run id.
 *
 * The piece failing fails the step, with the piece's reason in the message, so this step's `onError` route applies.
 * Cancelling this run cancels the piece's. A run more than MAX_PIECE_DEPTH pieces deep is refused before it starts
 * (rings are refused when a workflow is saved; this guards what reached the disk another way).
 *
 * @module nodegx-backend/workflow/steps/runWorkflow
 */
import type { StepExecContext, StepExecReturn, StepExecutor } from '../StepExecutor';
import { StepExecutionError } from '../StepExecutor';
import { MAX_PIECE_DEPTH } from '../pieces';
import type { WorkflowRunResult } from '../types';

export interface PieceRunRequest {
  workflow: string;
  body: Record<string, unknown>;
  parent: { executionId: string; workflowId: string; stepId: string; depth: number };
  test?: boolean;
  startedByApp?: boolean;
  /** Called with the piece's run id as soon as its record is open (so a cancel can reach it). */
  onStarted?: (executionId: string) => void;
}

export interface PieceRunner {
  /** Runs the piece; `null` when there is no workflow by that id. */
  run(req: PieceRunRequest): Promise<{ result: WorkflowRunResult; name: string } | null>;
  cancel(executionId: string): void;
}

const isPlainObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

export class RunWorkflowStepExecutor implements StepExecutor {
  constructor(private readonly getRunner: () => PieceRunner | null) {}

  async execute(ctx: StepExecContext): Promise<StepExecReturn> {
    const at = `Step "${ctx.step.name || ctx.step.id}"`;
    // resolved by the engine (neither is raw); read from the input, where the step's own params stand over the payload
    const id = ctx.input.workflow;
    if (typeof id !== 'string' || !id) throw new StepExecutionError(`${at}: Run a workflow needs "workflow", the id of the workflow to run`);
    const send = ctx.input.send === undefined ? {} : ctx.input.send;
    if (!isPlainObject(send)) throw new StepExecutionError(`${at}: "send" must be named values, { "<name>": <value> }`);
    const runner = this.getRunner();
    if (!runner) throw new StepExecutionError(`${at}: this backend cannot run a workflow from a step here`);
    const depth = (ctx.run?.depth ?? 0) + 1;
    if (depth > MAX_PIECE_DEPTH) {
      throw new StepExecutionError(
        `${at}: running "${id}" would be ${depth} pieces deep, more than the ${MAX_PIECE_DEPTH} allowed. A workflow that runs itself, ` +
          'directly or through others, never ends: look for a ring among the workflows it runs.'
      );
    }
    let child = '';
    const onAbort = () => {
      if (child) runner.cancel(child);
    };
    ctx.signal.addEventListener('abort', onAbort, { once: true });
    let ran: Awaited<ReturnType<PieceRunner['run']>>;
    try {
      ran = await runner.run({
        workflow: id,
        body: send,
        parent: { executionId: ctx.run?.executionId ?? '', workflowId: ctx.workflow.id, stepId: ctx.step.id, depth },
        ...(ctx.run?.test ? { test: true } : {}),
        ...(ctx.startedByApp ? { startedByApp: true } : {}),
        onStarted: (eid) => {
          child = eid;
          if (ctx.signal.aborted) runner.cancel(eid);
        }
      });
    } finally {
      ctx.signal.removeEventListener('abort', onAbort);
    }
    if (!ran) throw new StepExecutionError(`${at}: there is no workflow "${id}" on this backend to run`);
    const { result, name } = ran;
    if (result.status !== 'success') {
      const why = result.failedStep
        ? ` at its step "${result.failedStep.name || result.failedStep.id}": ${result.failedStep.message}`
        : result.timedOut
          ? ': it ran out of time'
          : result.status === 'cancelled'
            ? ': it was cancelled'
            : '';
      throw new StepExecutionError(`${at}: the piece "${name}" ${result.status === 'cancelled' ? 'stopped' : 'failed'}${why} (its run: ${result.executionId || 'not recorded'})`);
    }
    return { result: result.output === undefined ? null : result.output, run: result.executionId };
  }
}
