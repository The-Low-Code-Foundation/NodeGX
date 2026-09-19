/**
 * FED-004 §3.1 — a schedule does not trip over itself.
 *
 * The defect this grades has no unit smaller than a TIMELINE. `scheduler.ts`
 * armed one timer per schedule and dispatched on every fire, and its `running`
 * flag was about the scheduler's own lifecycle rather than the target's — so
 * "the previous run has not finished" was a question nothing in the process
 * could answer. Reading the file tells you that; only running four minutes of
 * clock against a target that takes ninety seconds tells you what it costs.
 *
 * So: fake timers, a real `TriggerRegistry` over a real temp directory, and a
 * dispatcher whose `fire` resolves after a configured number of FAKE
 * milliseconds. `Date.now()` is faked too, which is what lets the scheduler's
 * own default clock be the one under test rather than an injected stand-in that
 * could drift from the timers it is supposed to agree with.
 *
 * The three cases are one setup with one word changed, deliberately: every
 * difference in the outcome has to be attributable to the policy and to nothing
 * else (a control pair proves what you varied only).
 *
 * ⚠️ **The overlap policy guards the SCHEDULER's fires and nothing else.** A
 * manual test fire from the dashboard, a webhook, and a db-change trigger all
 * reach `dispatcher.fire` without passing this gate, and that is correct: a
 * person pressing "run now" is not a schedule tripping over itself. The last
 * case in this file pins it, because the opposite reading is the natural one.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { SecretsStore } from '../src/config/SecretsStore';
import { TriggerRegistry, effectiveOverlapPolicy, DEFAULT_OVERLAP_POLICY } from '../src/triggers/registry';
import type { OverlapPolicy } from '../src/triggers/registry';
import { CronScheduler } from '../src/triggers/scheduler';
import type { TriggerDispatcher, FireInput, FireOutcome, SkipInput } from '../src/triggers/dispatcher';

/** Midnight, so the minute boundaries in the timelines below are readable. */
const START = Date.parse('2026-03-01T00:00:00.000Z');
const MINUTE = 60_000;
/** The slow source in the person sentence: a run that outlasts its own interval. */
const RUN_MS = 90_000;

interface RecordedRun {
  source: string;
  executionId: string;
  startedAt: number;
  endedAt: number | null;
}

/**
 * A dispatcher that takes `runMs` of fake time to answer and reports its
 * execution id the moment it starts — which is the whole of what the scheduler
 * needs from a real one.
 */
function slowDispatcher(runMs: number) {
  const runs: RecordedRun[] = [];
  const skips: SkipInput[] = [];
  let seq = 0;

  const dispatcher = {
    fire: (input: FireInput): Promise<FireOutcome> =>
      new Promise<FireOutcome>((resolve) => {
        const executionId = `exec_${++seq}`;
        const run: RecordedRun = { source: input.source, executionId, startedAt: Date.now(), endedAt: null };
        runs.push(run);
        // Real runners announce this from inside `startExecution`, before the
        // graph runs. Same moment here.
        if (input.onStarted) input.onStarted(executionId);
        setTimeout(() => {
          run.endedAt = Date.now();
          resolve({ result: { ok: true, at: new Date().toISOString() }, statusCode: 200, body: '{}' });
        }, runMs);
      }),
    recordRejection: () => ({ ok: false, at: new Date().toISOString() }),
    recordSkip: (input: SkipInput) => {
      skips.push(input);
      return { ok: true, at: new Date().toISOString() };
    }
  };

  return { runs, skips, dispatcher: dispatcher as unknown as TriggerDispatcher };
}

describe('FED-004 overlapPolicy — four minutes of a minutely schedule against a 90-second run', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-fed004-'));
    jest.useFakeTimers({ now: START });
  });

  afterEach(() => {
    jest.useRealTimers();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  /** One schedule, one word changed. */
  function armed(overlapPolicy?: OverlapPolicy) {
    const registry = new TriggerRegistry(dir, new SecretsStore(dir));
    const { trigger } = registry.upsert({
      type: 'schedule',
      target: { kind: 'function', name: 'poll-feeds' },
      schedule: { cron: '* * * * *', missedFirePolicy: 'skip', ...(overlapPolicy ? { overlapPolicy } : {}) }
    });
    const { runs, skips, dispatcher } = slowDispatcher(RUN_MS);
    const scheduler = new CronScheduler({ registry, dispatcher });
    scheduler.start();
    return { registry, trigger, runs, skips, scheduler };
  }

  /** Minutes of fake time, letting every promise continuation settle. */
  const advance = (ms: number) => jest.advanceTimersByTimeAsync(ms);

  /** Elapsed seconds since START — the unit every timeline below is written in. */
  const at = (t: number | null) => (t === null ? null : (t - START) / 1000);

  it('AC1 skip: two runs execute, two fires are recorded as skipped-overlap naming the run they yielded to', async () => {
    const { runs, skips, registry, trigger, scheduler } = armed('skip');

    // Fires at 60s, 120s, 180s, 240s. 60 dispatches (ends 150); 120 finds it
    // running; 180 dispatches (ends 270); 240 finds THAT running.
    await advance(4 * MINUTE + 5000);
    scheduler.stop();

    expect(runs.map((r) => at(r.startedAt))).toEqual([60, 180]);
    expect(skips.length).toBe(2);

    // "each naming the run it yielded to" — and they are two DIFFERENT runs,
    // which is the half a single-skip assertion would not catch.
    expect(skips.map((s) => s.yieldedTo)).toEqual(['exec_1', 'exec_2']);
    for (const skip of skips) {
      expect(skip.policy).toBe('skip');
      expect(skip.trigger.id).toBe(trigger.id);
      expect(skip.reason).toContain('still running');
      expect(skip.triggerData).toMatchObject({ cron: '* * * * *', overlapPolicy: 'skip' });
    }

    // ⚠️ `status.fireCount` / `skipCount` are NOT asserted here and it would be
    // a lie if they were: stamping the registry is the real `TriggerDispatcher`'s
    // job, and this file's dispatcher is a stand-in that does no such thing. A
    // zero read here would say something about the double, not about the
    // scheduler. `fed-004-overlap-drive.test.ts` reads them off the real one.
    expect(registry.get(trigger.id)!.schedule!.overlapPolicy).toBe('skip');
  });

  it('AC2 queue-one: the waiting fire dispatches the moment the running one ends, and a second waiter is skipped', async () => {
    const { runs, skips, scheduler } = armed('queue-one');

    /**
     * 🔴 The measured timeline, which is NOT the one AC2 was drafted with —
     * corrected in the task file rather than asserted around (the task file's
     * §5 says why). Fires land at 60/120/180/240/300:
     *
     *   60  dispatch A            (ends 150)
     *   120 A running, nothing waiting  → QUEUE
     *   150 A ends                      → dispatch B from the queue (ends 240)
     *   180 B running, nothing waiting  → QUEUE
     *   240 B ends                      → dispatch C from the queue (ends 330)
     *       ...and the 240 fire, arriving after, finds C running → QUEUE
     *   300 C running and one already waiting → SKIP
     *
     * So four minutes gives three runs and NO skip — the fourth fire is waiting,
     * not refused. The first skip needs a FIFTH fire, which is the case the AC
     * meant and the timeline it did not have.
     */
    await advance(5 * MINUTE + 5000);
    scheduler.stop();

    // Back to back: each run starts exactly when the previous one ended.
    expect(runs.map((r) => at(r.startedAt))).toEqual([60, 150, 240]);
    expect(runs.slice(0, 2).map((r) => at(r.endedAt))).toEqual([150, 240]);

    // The delayed run says so in the record, which is how an operator tells a
    // run that started late from one that started on time.
    expect(runs[1].source).toContain('queued behind the previous run');
    expect(runs[0].source).not.toContain('queued');

    expect(skips.length).toBe(1);
    expect(skips[0].policy).toBe('queue-one');
    expect(skips[0].reason).toContain('already waiting');
    expect(skips[0].yieldedTo).toBe('exec_3');
  });

  it('AC3 allow: every fire dispatches, overlapping, exactly as before this field existed', async () => {
    const { runs, skips, scheduler } = armed('allow');

    await advance(4 * MINUTE + 5000);
    scheduler.stop();

    expect(runs.map((r) => at(r.startedAt))).toEqual([60, 120, 180, 240]);
    expect(skips).toEqual([]);
    // Overlapping, not merely four: the second starts while the first is going.
    expect(at(runs[0].endedAt)).toBe(150);
    expect(runs[1].startedAt).toBeLessThan(runs[0].endedAt!);
  });

  it('an unauthored schedule gets `skip`, which is the one default in this file that CHANGES behaviour', async () => {
    const { runs, skips, registry, trigger, scheduler } = armed(undefined);

    // Nothing on disk — a diff of triggers.json shows decisions, not defaults.
    expect('overlapPolicy' in (registry.get(trigger.id)!.schedule as object)).toBe(false);
    expect(effectiveOverlapPolicy(registry.get(trigger.id)!)).toBe(DEFAULT_OVERLAP_POLICY);

    await advance(4 * MINUTE + 5000);
    scheduler.stop();

    // Identical to AC1: the default IS `skip`, not `allow`.
    expect(runs.map((r) => at(r.startedAt))).toEqual([60, 180]);
    expect(skips.length).toBe(2);
  });

  it('a stopped scheduler never dispatches the fire that was waiting for the running one', async () => {
    const { runs, scheduler } = armed('queue-one');

    // 60 dispatches (ends 150); 120 queues. Stop at 130, before the running one
    // ends: the waiter must die with the scheduler rather than arriving after
    // an operator disabled it.
    await advance(2 * MINUTE + 10_000);
    expect(runs.length).toBe(1);
    scheduler.stop();

    await advance(3 * MINUTE);
    expect(runs.length).toBe(1);
  });

  it('a skipped fire still re-arms: the next occurrence is a fact about the clock, not about the last fire', async () => {
    const { registry, trigger, scheduler } = armed('skip');

    await advance(2 * MINUTE + 5000);
    scheduler.stop();

    // The 120s fire was skipped, and the 180s fire is still on the books.
    expect(registry.get(trigger.id)!.status.nextFireAt).toBe(new Date(START + 3 * MINUTE).toISOString());
  });
});

/**
 * AC7's dashboard half.
 *
 * ⚠️ **Not a `toContain` on the markup.** The page is one large inline script no compiler ever
 * reads, and asserting that a string appears in it passes just as happily when the function is
 * dead code nothing calls. So the cell builder is EXTRACTED and RUN, against DOM stubs, and what
 * is asserted is what it produces.
 *
 * The one thing that would still get past this is the function never being reached from the row
 * builder — so that call site is asserted too, which is the smallest honest version of "the
 * column is on the page".
 */
describe('FED-004 AC7 — the Overlap column in the admin dashboard', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'src', 'admin', 'ui', 'index.html'), 'utf-8');

  /** Lift one top-level `function name(...) {...}` out of the inline script by brace matching. */
  function extract(name: string): string {
    const start = html.indexOf(`function ${name}(`);
    expect(start).toBeGreaterThan(-1);
    let depth = 0;
    for (let i = html.indexOf('{', start); i < html.length; i++) {
      if (html[i] === '{') depth++;
      else if (html[i] === '}' && --depth === 0) return html.slice(start, i + 1);
    }
    throw new Error(`unbalanced braces in ${name}`);
  }

  /** The three page helpers the cell reaches for, reduced to what an assertion can read. */
  interface Stub {
    tag: string;
    text: string;
    title?: string;
    tone?: string;
    children: Stub[];
    /** The one DOM verb the cell uses. Given to each stub rather than to `Object.prototype`. */
    appendChild(child: Stub): void;
  }
  function stub(tag: string, text: string, extra: Partial<Stub> = {}): Stub {
    const node: Stub = {
      tag,
      text,
      children: [],
      appendChild(child: Stub) {
        node.children.push(child);
      },
      ...extra
    };
    return node;
  }
  function run(trigger: unknown): Stub {
    const el = (tag: string, attrs: Record<string, string> | null, ...children: (Stub | null)[]): Stub => {
      const node = stub(tag, (attrs && attrs.text) || '', { title: attrs ? attrs.title : undefined });
      for (const child of children) if (child) node.children.push(child);
      return node;
    };
    const chip = (text: string, tone?: string): Stub => stub('chip', text, { tone });
    const when = (iso: string | null) => (iso ? `at ${iso}` : '—');
    // eslint-disable-next-line no-new-func
    const factory = new Function('el', 'chip', 'when', `${extract('overlapCell')}; return overlapCell;`);
    return factory(el, chip, when)(trigger) as Stub;
  }

  /** Everything the cell rendered, flattened, so an assertion can read it as one string. */
  function textOf(node: Stub): string {
    return [node.text, ...node.children.map(textOf)].filter(Boolean).join(' | ');
  }

  it('is actually reached: the row builder calls it, and the header names it', () => {
    expect(html).toContain("el('td', {}, overlapCell(t))");
    expect(html).toContain("'Enabled', 'Overlap', 'Last fired'");
  });

  it('shows the policy in force, taken from the ROUTE and not recomputed here', () => {
    const cell = run({ type: 'schedule', effectiveOverlapPolicy: 'queue-one', status: {} });
    expect(textOf(cell)).toContain('queue-one');

    // 🔴 The whole reason `effectiveOverlapPolicy` exists. A dashboard that read
    // `schedule.overlapPolicy` would show nothing for the commonest trigger there is — the one
    // nobody configured — and a dashboard that filled that gap with its own `|| 'skip'` would be
    // a second copy of the default, free to drift from the scheduler's.
    const source = extract('overlapCell');
    expect(source).toContain('effectiveOverlapPolicy');
    expect(source).not.toContain('schedule.overlapPolicy');
  });

  it('shows the last skip, how many there have been, and which run it yielded to', () => {
    const cell = run({
      type: 'schedule',
      effectiveOverlapPolicy: 'skip',
      status: { skipCount: 4, lastSkip: { at: '2026-03-01T09:00:00.000Z', policy: 'skip', yieldedTo: 'exec_77' } }
    });
    const rendered = textOf(cell);
    expect(rendered).toContain('skipped 4×');
    expect(rendered).toContain('exec_77');
    expect(rendered).toContain('2026-03-01T09:00:00.000Z');
  });

  it('colours a skip as WORKING, never as a failure', () => {
    const cell = run({ type: 'schedule', effectiveOverlapPolicy: 'skip', status: {} });
    const chips = cell.children.filter((c) => c.tag === 'chip');
    expect(chips.length).toBe(1);
    // `bad` is the palette's red. An operator who learns this column goes red when everything is
    // fine is an operator who stops reading it (phase-23's palette law says red is for danger).
    expect(chips[0].tone).not.toBe('bad');
    expect(chips[0].tone).toBe('ok');
  });

  it('says nothing about a webhook, which has no such policy', () => {
    expect(textOf(run({ type: 'webhook', status: {} }))).toBe('—');
  });
});
