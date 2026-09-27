/**
 * BMG-009 — the Runs page's filter model and the run drawer's model, under jsdom.
 *
 * AC2: the rows *status is error · name contains digest · started is within
 * the past 7 days* become exactly the query `GET /executions` reads; what the
 * route cannot answer (an *or*, a group) is refused in words, never sent
 * half. AC4: the status row offers `EXECUTION_STATUSES`, nothing else. AC1:
 * a workflow whose steps read `body.<name>` opens with those names as rows;
 * one that reads nothing opens with an empty editor. AC5: neither page has a
 * textarea at rest. AC3: the word a cancelled run wears, and which rows may
 * be cancelled. The flat filter rows offer no *or* and no groups.
 */
import { mount, unmount, settle, q, qa, text } from './dom';

import { EXECUTION_STATUSES, runStatusWord } from '../../src/admin/app/format';
import { fieldOps, windowRange, Group } from '../../src/admin/app/filters';
import { FilterRows } from '../../src/admin/app/composers/FilterRow';
import { RUN_KINDS } from '../../src/execution/kind';
import { PAGE_SIZE, RunsView, canCancel, groupFromQuery, listQueryString, runsFields, runsQuery } from '../../src/admin/app/views/runs';
import { WorkflowsView, inferInputs, lastRunWord, startingRows } from '../../src/admin/app/views/workflows';

const NOW = new Date(2026, 8, 25, 14, 30);
const cond = (field: string, op: string, value?: string, value2?: string) => ({ kind: 'cond' as const, field, op, value, value2 });
const and = (...items: Array<ReturnType<typeof cond> | Group>): Group => ({ kind: 'group', conj: 'and', items });

describe('BMG-009 AC2 — rows → the query GET /executions reads', () => {
  it('status is error · name contains digest · started is within the past 7 days', () => {
    const [a, b] = windowRange('past7', NOW);
    expect(runsQuery(and(cond('status', 'is', 'error'), cond('name', 'contains', 'digest'), cond('started', 'within', 'past7')), NOW)).toEqual({
      status: 'error',
      name: 'digest',
      since: String(a.getTime()),
      until: String(b.getTime() - 1)
    });
  });

  it('kind, trigger, workflow and duration in seconds → the route’s spellings', () => {
    expect(runsQuery(and(cond('kind', 'is', 'function'), cond('trigger', 'is', 'trg_1'), cond('workflow', 'is', 'greet'), cond('duration (s)', 'gte', '2.5')), NOW)).toEqual({
      kind: 'function',
      trigger: 'trg_1',
      workflowId: 'greet',
      minDurationMs: '2500'
    });
  });

  it('dates: on, before, after, between are local-midnight ranges, the last millisecond in', () => {
    const d = (y: number, m: number, day: number) => new Date(y, m - 1, day).getTime();
    expect(runsQuery(and(cond('started', 'on', '2026-09-24')), NOW)).toEqual({ since: String(d(2026, 9, 24)), until: String(d(2026, 9, 25) - 1) });
    expect(runsQuery(and(cond('started', 'before', '2026-09-24')), NOW)).toEqual({ until: String(d(2026, 9, 24) - 1) });
    expect(runsQuery(and(cond('started', 'after', '2026-09-24')), NOW)).toEqual({ since: String(d(2026, 9, 25)) });
    expect(runsQuery(and(cond('started', 'between', '2026-09-24', '2026-09-20')), NOW)).toEqual({ since: String(d(2026, 9, 20)), until: String(d(2026, 9, 25) - 1) });
  });

  it('a row with nothing in its slot is not a filter yet', () => {
    expect(runsQuery(and(cond('status', 'is', ''), cond('name', 'contains', '  '), cond('duration (s)', 'gte', ''), cond('started', 'on', '')), NOW)).toEqual({});
  });

  it('refuses what the route cannot answer, in words, and sends nothing', () => {
    expect(() => runsQuery({ kind: 'group', conj: 'or', items: [cond('status', 'is', 'error'), cond('kind', 'is', 'backup')] }, NOW)).toThrow(/"and" only/);
    expect(() => runsQuery(and(cond('status', 'is', 'error'), and(cond('kind', 'is', 'backup'))), NOW)).toThrow(/"and" only/);
    expect(() => runsQuery(and(cond('status', 'is', 'error'), cond('status', 'is', 'success')), NOW)).toThrow(/asked twice/);
    expect(() => runsQuery(and(cond('duration (s)', 'gte', 'soon')), NOW)).toThrow(/number of seconds/);
    expect(() => runsQuery(and(cond('colour', 'is', 'red')), NOW)).toThrow(/no field called "colour"/);
  });

  it('#/runs?trigger=<id> arrives as a filled row, and goes back out as the same query', () => {
    const g = groupFromQuery({ trigger: 'trg_9', status: 'error' });
    expect(g.items).toEqual([cond('trigger', 'is', 'trg_9'), cond('status', 'is', 'error')]);
    expect(runsQuery(g, NOW)).toEqual({ trigger: 'trg_9', status: 'error' });
    expect(groupFromQuery(undefined).items).toEqual([]);
    expect(groupFromQuery({ colour: 'red' }).items).toEqual([]);
  });

  it('the list’s query string is stable and paged', () => {
    expect(listQueryString({ status: 'error', kind: 'function' }, 0)).toBe('kind=function&status=error&limit=' + PAGE_SIZE);
    expect(listQueryString({}, 100)).toBe('limit=' + PAGE_SIZE + '&offset=100');
  });
});

describe('BMG-009 AC4 — the fields the filter offers', () => {
  const fields = runsFields([{ id: 'trg_1', name: 'Nightly' }], [{ id: 'greet', name: 'Greet' }]);

  it('status offers exactly the store’s statuses; kind exactly the four kinds', () => {
    expect(fields.find((f) => f.name === 'status')!.options!.map((o) => o.value)).toEqual(EXECUTION_STATUSES.filter((s) => s));
    expect(fields.find((f) => f.name === 'kind')!.options!.map((o) => o.value)).toEqual(RUN_KINDS.map((k) => k.id));
    expect(fields.find((f) => f.name === 'trigger')!.options).toEqual([{ value: 'trg_1', label: 'Nightly' }]);
    expect(fields.find((f) => f.name === 'workflow')!.options).toEqual([{ value: 'greet', label: 'Greet' }]);
  });

  it('every field offers only the operators the route answers, and each one is real', () => {
    for (const f of fields) {
      expect(f.ops && f.ops.length).toBeTruthy();
      expect(fieldOps(f).map((o) => o.id)).toEqual(f.ops);
    }
    expect(fieldOps(fields.find((f) => f.name === 'name')!).map((o) => o.label)).toEqual(['contains']);
    expect(fieldOps(fields.find((f) => f.name === 'started')!).map((o) => o.id)).toEqual(['within', 'on', 'before', 'after', 'between']);
  });

  it('flat rows: no and/or, no groups, a choice as a select, the operator list narrowed', async () => {
    let group: Group = and(cond('status', 'is', 'error'), cond('name', 'contains', 'digest'));
    const root = mount(<FilterRows group={group} fields={fields} flat onChange={(g) => (group = g)} />);
    await settle();
    expect(qa(root, 'select[aria-label="And or or"]').length).toBe(0);
    expect(qa(root, 'button').map((b) => text(b).trim())).not.toContain('+ Add group');
    expect(qa(root, 'button').map((b) => text(b).trim())).toContain('+ Add condition');
    const statusValue = q<HTMLSelectElement>(root, 'select[aria-label="status value"]');
    expect(Array.from(statusValue.options).map((o) => o.value)).toEqual(['', ...EXECUTION_STATUSES.filter((s) => s)]);
    expect(statusValue.value).toBe('error');
    const ops = qa<HTMLSelectElement>(root, 'select[aria-label="Operator"]');
    expect(Array.from(ops[0].options).map((o) => o.textContent)).toEqual(['is']);
    expect(Array.from(ops[1].options).map((o) => o.textContent)).toEqual(['contains']);
    expect(qa(root, 'textarea').length).toBe(0);
    unmount(root);
  });
});

describe('BMG-009 AC1 — what a workflow reads by name', () => {
  it('finds every $path into body.<name>, once each, in order, however deep', () => {
    const def = {
      id: 'greet',
      steps: [
        { id: 'a', kind: 'call-function', params: { name: 'hello', input: { who: { $path: 'body.customerId' }, again: { $path: 'body.customerId' } } } },
        { id: 'b', kind: 'branch', conditions: [{ left: { $path: 'body.amount.value' }, op: 'gt', right: 100 }], routes: { yes: 'c' } },
        { id: 'c', kind: 'return', params: { value: [{ $path: 'previous.total' }, { $path: 'trigger.id' }, { $literal: { $path: 'body.notThis' } }, { $path: 'customerId' }] } }
      ]
    };
    expect(inferInputs(def)).toEqual(['customerId', 'amount']);
    expect(inferInputs({ id: 'ping', steps: [{ id: 'hold', kind: 'wait', params: { duration: 1 } }] })).toEqual([]);
    expect(inferInputs(null)).toEqual([]);
    expect(startingRows(['customerId', 'amount'])).toEqual([
      { key: 'customerId', type: 'text', raw: '' },
      { key: 'amount', type: 'text', raw: '' }
    ]);
  });
});

describe('BMG-009 AC3 — the word a run wears, and who may be cancelled', () => {
  it('cancelled and timed out come from the engine’s stamp; otherwise the store’s status', () => {
    expect(runStatusWord({ status: 'error', metadata: { engineStatus: 'cancelled', cancelled: true } })).toBe('cancelled');
    expect(runStatusWord({ status: 'error', metadata: { timedOut: true } })).toBe('timed out');
    expect(runStatusWord({ status: 'error', metadata: {} })).toBe('error');
    expect(runStatusWord({ status: 'running' })).toBe('running');
    expect(lastRunWord({ id: 'x', status: 'error', startedAt: 1, engineStatus: 'cancelled' })).toBe('cancelled');
    expect(lastRunWord({ id: 'x', status: 'success', startedAt: 1 })).toBe('success');
    expect(lastRunWord(undefined)).toBe('');
  });

  it('only a running workflow can be cancelled', () => {
    expect(canCancel({ status: 'running', kind: 'workflow' })).toBe(true);
    expect(canCancel({ status: 'running', kind: 'function' })).toBe(false);
    expect(canCancel({ status: 'success', kind: 'workflow' })).toBe(false);
  });
});

describe('BMG-009 AC5 — the pages at rest, over a stubbed backend', () => {
  const realFetch = globalThis.fetch;
  const RUNS = [
    { id: 'exec_1', kind: 'workflow', workflowId: 'slow', workflowName: 'Slow', triggerType: 'manual', status: 'running', startedAt: Date.now() - 5000, metadata: { kind: 'workflow' } },
    { id: 'exec_2', kind: 'function', workflowId: 'digest', workflowName: 'digest', triggerType: 'schedule', status: 'error', startedAt: Date.now() - 60000, durationMs: 40, metadata: { triggerId: 'trg_1' } },
    { id: 'exec_3', kind: 'workflow', workflowId: 'greet', workflowName: 'Greet', triggerType: 'manual', status: 'error', startedAt: Date.now() - 90000, durationMs: 9, metadata: { kind: 'workflow', engineStatus: 'cancelled', cancelled: true } }
  ];
  const DEFS = {
    workflows: [
      { version: 1, id: 'greet', name: 'Greet', entry: 'answer', concurrency: 1, steps: [{ id: 'answer', kind: 'return', params: { value: { $path: 'body.name' } } }] },
      { version: 1, id: 'ping', name: 'Ping', entry: 'hold', concurrency: 1, steps: [{ id: 'hold', kind: 'wait', params: { duration: 1 } }] }
    ],
    lastRuns: { greet: { id: 'exec_3', status: 'error', startedAt: Date.now() - 90000, durationMs: 9, engineStatus: 'cancelled' } }
  };
  const asked: string[] = [];
  beforeAll(() => {
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      asked.push(url);
      const body = url.startsWith('/executions?') ? RUNS : url.startsWith('/admin/triggers') ? { triggers: [{ id: 'trg_1', name: 'Nightly' }] } : url.startsWith('/admin/workflow-defs') ? DEFS : {};
      return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json', 'X-Total-Count': url.startsWith('/executions?') ? '3' : '0' } });
    }) as typeof fetch;
  });
  afterAll(() => {
    globalThis.fetch = realFetch;
  });

  it('Runs: filter rows, no textarea, the kind and the word per row, Cancel only on the running workflow, the trigger linked', async () => {
    const root = mount(<RunsView params={[]} query={{ trigger: 'trg_1' }} />);
    await settle(50);
    await settle(50);
    expect(qa(root, 'textarea').length).toBe(0);
    expect(q<HTMLSelectElement>(root, '#runs-filter select[aria-label="trigger value"]').value).toBe('trg_1');
    expect(asked.some((u) => u === '/executions?trigger=trg_1&limit=' + PAGE_SIZE)).toBe(true);
    const rows = qa(root, 'tbody tr');
    expect(rows.length).toBe(3);
    const cells = (i: number) => qa(rows[i], 'td').map((c) => text(c).trim());
    expect(cells(0)[1]).toBe('workflow');
    expect(cells(0)[4]).toBe('running');
    expect(cells(1)[1]).toBe('function');
    expect(cells(1)[4]).toBe('error');
    expect(cells(2)[4]).toBe('cancelled');
    expect(qa(rows[0], 'button').map((b) => text(b).trim())).toEqual(['Cancel', 'Detail']);
    expect(qa(rows[1], 'button').map((b) => text(b).trim())).toEqual(['Detail']);
    expect(q<HTMLAnchorElement>(rows[1], 'a').getAttribute('href')).toBe('#/triggers/trg_1');
    expect(text(q(rows[1], 'a'))).toBe('Nightly');
    expect(text(q(root, '#runs-count'))).toMatch(/Showing 1–3 of 3/);
    expect(text(q(root, '.chip.accent'))).toBe('live');
    unmount(root);
  });

  it('Workflows: the list with its last run, and the run drawer with the names the steps read — no textarea', async () => {
    const root = mount(<WorkflowsView params={['greet']} />);
    await settle(50);
    await settle(50);
    expect(qa(root, 'textarea').length).toBe(0);
    const rows = qa(root, 'tbody tr');
    expect(rows.length).toBe(2);
    expect(text(q(rows[0], '.chip')).trim()).toBe('cancelled');
    expect(text(qa(rows[1], 'td')[2]).trim()).toBe('never');
    const drawer = q(root, '.drawer');
    expect(text(q(drawer, '.drawer-title, h2, h3'))).toMatch(/Run Greet/);
    expect(qa<HTMLInputElement>(drawer, '#run-payload .kv-key').map((i) => i.value)).toEqual(['name']);
    expect(text(q(drawer, '#run-inputs'))).toMatch(/ask for “name” by name/);
    unmount(root);
  });
});
