/**
 * P99 HLT-023 — which function run a loopback request belongs to.
 *
 * A deployed function reaches the database by calling this same server over
 * 127.0.0.1 with the admin credential (`_noodl_cloudservices`, service.ts). The
 * rate limiter keys a bucket by principal, so every query of every run — and the
 * operator's own admin-token requests — shared ONE `data:admin` bucket: two
 * learners on a 26-query page got 17 loads and then 500s for everybody, the
 * operator included.
 *
 * The call that started a run is already budgeted, per caller, in the
 * `functions` class. The queries inside it are that call's implementation, not a
 * second request by anybody. So a run gets an id that lives exactly as long as
 * the run, the cloud-runtime clients send it (`X-NodeGX-Run`) on every loopback
 * request they make inside the run, and the server charges those requests to the
 * RUN — a per-run ceiling, the runaway guard — instead of to a client bucket.
 *
 * The id is carried by `AsyncLocalStorage`, so it follows the run through every
 * await, timer and callback the graph makes without the graph knowing. It is 128
 * random bits and is only honoured beside the admin credential, so it cannot be
 * guessed, and holding one grants nothing the admin credential did not already.
 */
import { AsyncLocalStorage } from 'async_hooks';
import { randomBytes } from 'crypto';

export const RUN_HEADER = 'x-nodegx-run';

export interface FunctionRun {
  readonly id: string;
  readonly functionName: string;
  /** Loopback requests this run has made so far. */
  requests: number;
}

export class FunctionRuns {
  private readonly live = new Map<string, FunctionRun>();
  private readonly context = new AsyncLocalStorage<FunctionRun>();

  /** Run `body` as one function run: its loopback requests carry the run's id until it settles. */
  async within<T>(functionName: string, body: () => Promise<T>): Promise<T> {
    const run: FunctionRun = { id: randomBytes(16).toString('hex'), functionName, requests: 0 };
    this.live.set(run.id, run);
    try {
      return await this.context.run(run, body);
    } finally {
      this.live.delete(run.id);
    }
  }

  /** The id of the run the caller is inside, if any — what the loopback clients send. */
  currentRunId(): string | undefined {
    const run = this.context.getStore();
    return run ? run.id : undefined;
  }

  /** A run that is still going. A settled or unknown id is `undefined`, and is charged as usual. */
  get(id: string | undefined): FunctionRun | undefined {
    return id ? this.live.get(id) : undefined;
  }

  /** Live run count — tests read this to prove a run is forgotten when it settles. */
  get size(): number {
    return this.live.size;
  }
}
