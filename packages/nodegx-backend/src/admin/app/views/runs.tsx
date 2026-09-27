/**
 * Runs — every function, trigger, workflow and backup run this backend has
 * recorded. The page is now called Runs (BMG-001); `#/runs/<id>` opens that
 * record, and pressing "Detail" navigates there so the URL is what opens it.
 *
 * BMG-009: above the FED-007 record view (unchanged), the filter said in rows
 * — *status is · kind is · name contains · trigger is · workflow is · started
 * is within · duration ≥ N s* — over `GET /executions`'s own parameters
 * (`runsQuery` is the whole translation, pure). The list pages by the route's
 * `X-Total-Count`; while any run is still going it re-reads every five
 * seconds and says so with a *live* chip; a running workflow can be
 * cancelled from its row or its record. `#/runs?trigger=<id>` (from the
 * trigger's drawer) arrives as a filled row.
 */
import { useEffect, useRef, useState } from 'preact/hooks';

import { api, apiFull, encode } from '../api';
import { EmptyState, FilterRows } from '../composers';
import { Cond, FilterField, Group, addDays, describe, midnight, windowRange } from '../filters';
import { EXECUTION_STATUSES, ExecutionSummary, cellText, executionStatusKind, extractExecutionRows, recordSummary, runStatusWord, stepStatusKind, when } from '../format';
import { href, navigate } from '../router';
import { Btn, Chip, ChipKind, Dialog, Disclosure, Gap, Hint, JsonTree, Page, Row, Spacer, Table, WriteBtn, confirmSimple, fail, openModal, toast } from '../ui';
import { RUN_KINDS } from '../../../execution/kind';
import type { ViewProps } from './index';

type Rec = Record<string, any>;

/** How many rows a page shows. */
export const PAGE_SIZE = 50;
/** How often the list re-reads while a run is still going. */
export const LIVE_EVERY_MS = 5000;

// ------------------------------------------------------------- the model --

/** The rows the filter offers, with what each may ask. Statuses are `EXECUTION_STATUSES` (FED-007 AC2). */
export function runsFields(triggers: Array<{ id: string; name?: string }>, workflows: Array<{ id: string; name?: unknown }>): FilterField[] {
  return [
    { name: 'status', kind: 'choice', ops: ['is'], options: EXECUTION_STATUSES.filter((s) => s).map((s) => ({ value: s, label: s })) },
    { name: 'kind', kind: 'choice', ops: ['is'], options: RUN_KINDS.map((k) => ({ value: k.id, label: k.label })) },
    { name: 'name', kind: 'text', ops: ['contains'] },
    { name: 'trigger', kind: 'choice', ops: ['is'], options: triggers.map((t) => ({ value: t.id, label: t.name || t.id })) },
    { name: 'workflow', kind: 'choice', ops: ['is'], options: workflows.map((w) => ({ value: w.id, label: typeof w.name === 'string' && w.name ? w.name : w.id })) },
    { name: 'started', kind: 'date', ops: ['within', 'on', 'before', 'after', 'between'] },
    { name: 'duration (s)', kind: 'number', ops: ['gte'] }
  ];
}

/**
 * The query string `GET /executions` reads for a flat group of rows. A row
 * with nothing in its value slot is not a filter yet and is skipped; a group
 * or an *or* is refused in words, because the route answers *and* only. Dates
 * are local-midnight ranges like the collections' (`since` inclusive, `until`
 * inclusive, so the day's last millisecond is in).
 */
export function runsQuery(group: Group, now: Date = new Date()): Record<string, string> {
  if (group.conj === 'or' && group.items.length > 1) throw new Error('Runs can be filtered with "and" only.');
  const q: Record<string, string> = {};
  const once = (key: string, value: string) => {
    if (q[key] !== undefined) throw new Error(key + ' is asked twice.');
    q[key] = value;
  };
  for (const item of group.items) {
    if (item.kind === 'group') throw new Error('Runs can be filtered with "and" only.');
    const c: Cond = item;
    const v = (c.value || '').trim();
    switch (c.field) {
      case 'status':
        if (v) once('status', v);
        break;
      case 'kind':
        if (v) once('kind', v);
        break;
      case 'name':
        if (v) once('name', v);
        break;
      case 'trigger':
        if (v) once('trigger', v);
        break;
      case 'workflow':
        if (v) once('workflowId', v);
        break;
      case 'started': {
        if (c.op === 'within') {
          const [a, b] = windowRange(v || 'today', now);
          once('since', String(a.getTime()));
          once('until', String(b.getTime() - 1));
        } else if (c.op === 'on' && v) {
          const day = midnight(v);
          once('since', String(day.getTime()));
          once('until', String(addDays(day, 1).getTime() - 1));
        } else if (c.op === 'before' && v) {
          once('until', String(midnight(v).getTime() - 1));
        } else if (c.op === 'after' && v) {
          once('since', String(addDays(midnight(v), 1).getTime()));
        } else if (c.op === 'between' && v && (c.value2 || '').trim()) {
          const a = midnight(v);
          const b = midnight((c.value2 || '').trim());
          const [lo, hi] = a <= b ? [a, b] : [b, a];
          once('since', String(lo.getTime()));
          once('until', String(addDays(hi, 1).getTime() - 1));
        }
        break;
      }
      case 'duration (s)': {
        if (!v) break;
        const n = Number(v);
        if (isNaN(n) || n < 0) throw new Error('duration needs a number of seconds.');
        once('minDurationMs', String(Math.round(n * 1000)));
        break;
      }
      default:
        throw new Error('There is no field called "' + c.field + '".');
    }
  }
  return q;
}

/** `#/runs?trigger=<id>&status=error&kind=function&name=digest&workflow=<id>` as rows. Unknown keys are ignored. */
export function groupFromQuery(query: Record<string, string> | undefined): Group {
  const items: Cond[] = [];
  const q = query || {};
  if (q.trigger) items.push({ kind: 'cond', field: 'trigger', op: 'is', value: q.trigger });
  if (q.workflow) items.push({ kind: 'cond', field: 'workflow', op: 'is', value: q.workflow });
  if (q.status) items.push({ kind: 'cond', field: 'status', op: 'is', value: q.status });
  if (q.kind) items.push({ kind: 'cond', field: 'kind', op: 'is', value: q.kind });
  if (q.name) items.push({ kind: 'cond', field: 'name', op: 'contains', value: q.name });
  return { kind: 'group', conj: 'and', items };
}

/** The list's query string, with paging, in a stable key order. */
export function listQueryString(q: Record<string, string>, offset: number, limit = PAGE_SIZE): string {
  const parts: string[] = [];
  for (const k of Object.keys(q).sort()) parts.push(encode(k) + '=' + encode(q[k]));
  parts.push('limit=' + limit);
  if (offset) parts.push('offset=' + offset);
  return parts.join('&');
}

/** A workflow still going can be stopped; nothing else can (a function run has no cancel). */
export function canCancel(rec: Rec): boolean {
  return rec.status === 'running' && rec.kind === 'workflow';
}

// -------------------------------------------------------------- the page --

export function RunsView({ params, query }: ViewProps) {
  const [triggers, setTriggers] = useState<Array<{ id: string; name?: string }>>([]);
  const [workflows, setWorkflows] = useState<Array<{ id: string; name?: unknown }>>([]);
  const [group, setGroup] = useState<Group>(() => groupFromQuery(query));
  const [problem, setProblem] = useState<string | null>(null);
  const [rows, setRows] = useState<Rec[] | null>(null);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const wanted = params[0] || '';
  // The id whose dialog is open, so a reload while it is open does not open it twice.
  const opened = useRef<string | null>(null);
  const fields = runsFields(triggers, workflows);

  // A link can change the query while the page is mounted (the trigger drawer → Runs).
  const queryKey = JSON.stringify(query || {});
  useEffect(() => {
    setGroup(groupFromQuery(query));
    setOffset(0);
  }, [queryKey]);

  useEffect(() => {
    api<{ triggers?: Array<{ id: string; name?: string }> }>('GET', '/admin/triggers')
      .then((d) => setTriggers((d && d.triggers) || []))
      .catch(() => setTriggers([]));
    api<{ workflows?: Array<{ id: string; name?: unknown }> }>('GET', '/admin/workflow-defs')
      .then((d) => setWorkflows((d && d.workflows) || []))
      .catch(() => setWorkflows([]));
  }, []);

  let q: Record<string, string> | null = null;
  let qProblem: string | null = null;
  try {
    q = runsQuery(group);
  } catch (e) {
    qProblem = (e as Error).message;
  }
  const qs = q ? listQueryString(q, offset) : null;

  function load() {
    if (!qs) return;
    apiFull('GET', '/executions?' + qs)
      .then(({ body, headers }) => {
        setRows(extractExecutionRows(body) as Rec[]);
        const n = parseInt(headers.get('X-Total-Count') || '', 10);
        setTotal(isNaN(n) ? (extractExecutionRows(body) as Rec[]).length : n);
        setProblem(null);
      })
      .catch(fail);
  }
  useEffect(() => {
    setProblem(qProblem);
    load();
  }, [qs, qProblem]);

  // Live while something is running: a five-second re-read, said with a chip.
  const running = !!rows && rows.some((r) => r.status === 'running');
  useEffect(() => {
    if (!running) return;
    const t = setInterval(load, LIVE_EVERY_MS);
    return () => clearInterval(t);
  }, [running, qs]);

  function cancel(rec: Rec) {
    confirmSimple('Cancel this run', '"' + (rec.workflowName || rec.workflowId) + '" stops where it is. Steps already done are not undone; the record says cancelled.', () => {
      api('POST', '/admin/workflow-runs/' + encode(rec.id) + '/cancel', {})
        .then(() => {
          toast('Cancelling — the record says so when it has stopped.', 'ok');
          setTimeout(load, 600);
        })
        .catch(fail);
    }, 'Cancel the run');
  }

  /**
   * 🔴 FED-007 — the record, as a record: the band, the failures first, the steps as rows,
   * and the raw JSON one click away.
   */
  function detail(id: string) {
    api<Rec>('GET', '/executions/' + encode(id))
      .then((data) => {
        openModal(
          (close) => <ExecutionDialog id={id} data={data || {}} close={close} onCancel={canCancel(data || {}) ? () => cancel(data) : undefined} />,
          () => {
            opened.current = null;
            navigate('runs');
          }
        );
      })
      .catch((e) => {
        fail(e);
        opened.current = null;
        navigate('runs');
      });
  }

  useEffect(() => {
    if (!rows || !wanted || opened.current === wanted) return;
    opened.current = wanted;
    detail(wanted);
  }, [rows, wanted]);

  const triggerName = (id: string) => (triggers.find((t) => t.id === id) || { name: '' }).name || id;
  const from = total ? offset + 1 : 0;
  const to = Math.min(offset + PAGE_SIZE, total);
  const filtered = group.items.length > 0;

  return (
    <Page title="Runs" subtitle="Every function, trigger, workflow and backup run this backend has recorded.">
      <div id="runs-filter">
        <FilterRows group={group} fields={fields} flat onChange={(g) => { setGroup(g); setOffset(0); }} />
      </div>
      {problem ? <Hint>{problem}</Hint> : null}
      <Gap />
      <Row>
        {running ? (
          <Chip kind="accent" title={'A run is still going: this list re-reads every ' + LIVE_EVERY_MS / 1000 + ' seconds.'}>
            live
          </Chip>
        ) : null}
        <span class="hint" id="runs-count">
          {total ? 'Showing ' + from + '–' + to + ' of ' + total : rows ? 'No runs' : ''}
          {filtered && q && Object.keys(q).length ? ' where ' + describe(group, fields) : ''}
        </span>
        <Spacer />
        <Btn tiny disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>
          ‹ Newer
        </Btn>
        <Btn tiny disabled={offset + PAGE_SIZE >= total} onClick={() => setOffset(offset + PAGE_SIZE)}>
          Older ›
        </Btn>
        <Btn onClick={load}>Refresh</Btn>
      </Row>
      <Gap />
      {rows ? (
        <Table
          columns={['Started', 'Kind', 'Name', 'Trigger', 'Status', 'Duration', '']}
          rows={rows}
          empty={
            filtered ? (
              <EmptyState>No runs match.</EmptyState>
            ) : (
              <EmptyState icon="▶" action={{ label: 'Open Workflows', onClick: () => navigate('workflows'), write: false }}>
                No runs recorded yet. Fire a trigger or run a workflow and it appears here.
              </EmptyState>
            )
          }
          renderRow={(x, i) => {
            const word = runStatusWord(x);
            const tid = x.metadata && typeof x.metadata.triggerId === 'string' ? (x.metadata.triggerId as string) : '';
            return (
              <tr key={x.id || i} class={x.id === wanted ? 'hit' : ''}>
                <td>{when(x.startedAt)}</td>
                <td>
                  <span class="hint">{cellText(x.kind)}</span>
                </td>
                <td>{cellText(x.workflowName || x.workflowId || x.functionName)}</td>
                <td>
                  {tid ? (
                    <a href={href('triggers', tid)} title="Open this trigger">
                      {triggerName(tid)}
                    </a>
                  ) : (
                    cellText(x.triggerType)
                  )}
                </td>
                <td>
                  <Chip kind={executionStatusKind(word) as ChipKind}>{word}</Chip>
                </td>
                <td>{x.durationMs !== undefined && x.durationMs !== null ? x.durationMs + ' ms' : '—'}</td>
                <td class="actions">
                  {canCancel(x) ? (
                    <WriteBtn tiny kind="danger" onClick={() => cancel(x)}>
                      Cancel
                    </WriteBtn>
                  ) : null}
                  <Btn tiny onClick={() => navigate('runs', x.id)}>
                    Detail
                  </Btn>
                </td>
              </tr>
            );
          }}
        />
      ) : null}
    </Page>
  );
}

// ------------------------------------------------------------ the record --

/**
 * A record is a table of 34 rows, not a confirmation dialog: wide, so an error
 * message is not wrapped mid-word. The order is Richard's (FED-007 §2): the
 * band, the failures, the steps, the raw JSON behind a click.
 */
function ExecutionDialog({ id, data, close, onCancel }: { id: string; data: Rec; close: () => void; onCancel?: () => void }) {
  const summary = recordSummary(data);
  return (
    <Dialog
      title={'Execution ' + id}
      wide
      autoFocus={false}
      actions={
        <>
          {onCancel ? (
            <WriteBtn kind="danger" onClick={onCancel}>
              Cancel the run
            </WriteBtn>
          ) : null}
          <Btn onClick={close}>Close</Btn>
        </>
      }
    >
      <Band summary={summary} word={runStatusWord(data)} />
      <FailureBand summary={summary} />
      <StepTable steps={(data.steps || []) as Rec[]} />
      <Disclosure label="Raw JSON">
        <textarea value={JSON.stringify(data, null, 2)} readOnly style="min-height:320px" />
      </Disclosure>
    </Dialog>
  );
}

/** Fact, fact, fact — and the cost line on its own row. */
function Band({ summary, word }: { summary: ExecutionSummary; word: string }) {
  const fact = (label: string, value: unknown) =>
    value === '' || value === null || value === undefined ? null : (
      <span class="rec-fact">
        {label + ' '}
        <b>{String(value)}</b>
      </span>
    );
  return (
    <div class="rec-band">
      <Chip kind={executionStatusKind(word) as ChipKind}>{word || 'unknown'}</Chip>
      {fact('ran', summary.workflow)}
      {fact('triggered by', summary.triggerSource || summary.trigger)}
      {fact('started', summary.startedAt ? when(summary.startedAt) : '')}
      {fact('took', summary.durationMs === undefined || summary.durationMs === null ? '' : summary.durationMs + ' ms')}
      {fact('steps', summary.stepCount)}
      {summary.capped ? <Chip kind="warn">record capped</Chip> : null}
      {summary.costLine ? <div class="rec-cost">{summary.costLine}</div> : null}
    </div>
  );
}

/**
 * 🔴 AC4 — the failed fetch and the URL it names are reachable without scrolling and without
 * expanding anything. Capped, because a loop that fails per item can fail hundreds of times;
 * the steps table below holds every one.
 */
const SHOWN = 5;

function FailureBand({ summary }: { summary: ExecutionSummary }) {
  if (!summary.failures.length) return null;
  const n = summary.failures.length;
  return (
    <div class="rec-danger">
      <div class="rec-danger-head">{n === 1 ? '1 step failed' : n + ' steps failed'}</div>
      {summary.failures.slice(0, SHOWN).map((f) => (
        <>
          <div class="rec-danger-step">{f.step + (f.type ? '  ·  ' + f.type : '')}</div>
          {f.message ? <div class="rec-danger-why">{f.message}</div> : null}
          {f.detail
            ? Object.keys(f.detail).map((k) => {
                const v = f.detail![k];
                if (v === null || typeof v === 'object') return null;
                return <div class="rec-danger-why">{k + ': ' + String(v)}</div>;
              })
            : null}
        </>
      ))}
      {n > SHOWN ? <div class="rec-danger-why">{'and ' + (n - SHOWN) + ' more — every step is in the table below.'}</div> : null}
    </div>
  );
}

/** Each step a row; each row opens onto its own error, input and output. */
function StepTable({ steps }: { steps: Rec[] }) {
  if (!steps.length) return <div class="empty">This run recorded no steps.</div>;
  return (
    <div class="scroller">
      <table>
        <thead>
          <tr>
            {['', 'Step', 'Type', 'Duration', 'Status'].map((c, i) => (
              <th key={i}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {steps.map((step, i) => (
            <StepRow key={i} step={step} index={i} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StepRow({ step, index }: { step: Rec; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr class={'step-row' + (open ? ' open' : '')} onClick={() => setOpen(!open)}>
        <td>{String(index + 1)}</td>
        <td>{cellText(step.nodeName || step.nodeId)}</td>
        <td>{cellText(step.nodeType)}</td>
        <td>{step.durationMs === undefined || step.durationMs === null ? '—' : step.durationMs + ' ms'}</td>
        <td>
          <Chip kind={stepStatusKind(step.status) as ChipKind}>{cellText(step.status)}</Chip>
        </td>
      </tr>
      <tr class={'step-pane' + (open ? '' : ' hidden')}>
        <td colSpan={5}>
          <StepPane step={step} />
        </td>
      </tr>
    </>
  );
}

/**
 * A step's own three things. `skipped` is a branch the run did not take, so it is said in
 * words rather than shown as a status nobody can act on.
 */
function StepPane({ step }: { step: Rec }) {
  // 🔴 TWO levels open, not one. A step's output is almost always `{ outcome, detail }` and
  // `detail` is the half anybody opened the step for.
  const part = (title: string, value: unknown) => (
    <div class="pane-part">
      <h4>{title}</h4>
      <div class="jx">
        <JsonTree value={value} name={null} depth={0} openTo={2} />
      </div>
    </div>
  );
  const hasInput = step.inputData !== undefined && step.inputData !== null;
  const hasOutput = step.outputData !== undefined && step.outputData !== null;
  const empty = !step.errorMessage && step.status !== 'skipped' && !hasInput && !hasOutput;
  return (
    <div>
      {step.errorMessage ? (
        <div class="pane-part">
          <h4>Error</h4>
          <div class="rec-danger-why">{step.errorMessage}</div>
        </div>
      ) : null}
      {step.status === 'skipped' ? (
        <div class="pane-part">
          <h4>Skipped</h4>
          <div class="jx-meta">This step was not reached — the run took another path.</div>
        </div>
      ) : null}
      {hasInput ? part('Input', step.inputData) : null}
      {hasOutput ? part('Output', step.outputData) : null}
      {empty ? <div class="jx-meta">This step recorded no data.</div> : null}
    </div>
  );
}
