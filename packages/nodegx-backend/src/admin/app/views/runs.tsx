/**
 * Runs — every function, trigger, workflow and backup run this backend has
 * recorded. Ported as-is from the vanilla 'executions' view (BMG-001 §3.1);
 * the page is now called Runs. `#/runs/<id>` opens that record, and pressing
 * "Detail" navigates there so the URL is what opens it.
 */
import { useEffect, useRef, useState } from 'preact/hooks';

import { api, encode } from '../api';
import { EmptyState } from '../composers';
import { EXECUTION_STATUSES, ExecutionSummary, cellText, executionStatusKind, extractExecutionRows, recordSummary, stepStatusKind, when } from '../format';
import { navigate } from '../router';
import { Btn, Chip, ChipKind, Dialog, Disclosure, Field, Gap, JsonTree, Page, Row, Table, fail, openModal } from '../ui';
import type { ViewProps } from './index';

type Rec = Record<string, any>;

export function RunsView({ params }: ViewProps) {
  // 🔴 FED-007 AC2 — the filter's values are `EXECUTION_STATUSES`, the store's own vocabulary; nothing in between translates them.
  const [status, setStatus] = useState('');
  const [rows, setRows] = useState<Rec[] | null>(null);
  const wanted = params[0] || '';
  // The id whose dialog is open, so a reload while it is open does not open it twice.
  const opened = useRef<string | null>(null);

  function load() {
    const query = 'limit=100' + (status ? '&status=' + encode(status) : '');
    api('GET', '/executions?' + query)
      .then((data) => setRows(extractExecutionRows(data) as Rec[]))
      .catch(fail);
  }
  useEffect(() => {
    load();
  }, [status]);

  /**
   * 🔴 FED-007 — the record, as a record: the band, the failures first, the steps as rows,
   * and the raw JSON one click away.
   */
  function detail(id: string) {
    api<Rec>('GET', '/executions/' + encode(id))
      .then((data) => {
        openModal(
          (close) => <ExecutionDialog id={id} data={data || {}} close={close} />,
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

  return (
    <Page title="Runs" subtitle="Every function, trigger, workflow and backup run this backend has recorded.">
      <Row>
        <Field label="Status">
          <select value={status} onChange={(e) => setStatus((e.currentTarget as HTMLSelectElement).value)}>
            {EXECUTION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'any status'}
              </option>
            ))}
          </select>
        </Field>
        <Btn onClick={load}>Refresh</Btn>
      </Row>
      <Gap />
      {rows ? (
        <Table
          columns={['Started', 'Workflow / function', 'Trigger', 'Status', 'Duration', '']}
          rows={rows}
          empty={
            status ? (
              <EmptyState>No runs match.</EmptyState>
            ) : (
              <EmptyState icon="▶" action={{ label: 'Open Workflows', onClick: () => navigate('workflows'), write: false }}>
                No runs recorded yet. Fire a trigger or run a workflow and it appears here.
              </EmptyState>
            )
          }
          renderRow={(x, i) => (
            <tr key={x.id || i}>
              <td>{when(x.startedAt)}</td>
              <td>{cellText(x.workflowId || x.functionName)}</td>
              <td>{cellText(x.triggerType)}</td>
              <td>
                <Chip kind={executionStatusKind(x.status) as ChipKind}>{cellText(x.status)}</Chip>
              </td>
              <td>{x.durationMs !== undefined && x.durationMs !== null ? x.durationMs + ' ms' : '—'}</td>
              <td class="actions">
                <Btn tiny onClick={() => navigate('runs', x.id)}>
                  Detail
                </Btn>
              </td>
            </tr>
          )}
        />
      ) : null}
    </Page>
  );
}

// ------------------------------------------------------------ the record --

/**
 * A record is a table of 34 rows, not a confirmation dialog: wide, so an error
 * message is not wrapped mid-word.
 */
function ExecutionDialog({ id, data, close }: { id: string; data: Rec; close: () => void }) {
  const summary = recordSummary(data);
  return (
    <Dialog title={'Execution ' + id} wide autoFocus={false} actions={<Btn onClick={close}>Close</Btn>}>
      <Band summary={summary} />
      <FailureBand summary={summary} />
      <StepTable steps={(data.steps || []) as Rec[]} />
      <Disclosure label="Raw JSON">
        <textarea value={JSON.stringify(data, null, 2)} readOnly style="min-height:320px" />
      </Disclosure>
    </Dialog>
  );
}

/** Fact, fact, fact — and the cost line on its own row. */
function Band({ summary }: { summary: ExecutionSummary }) {
  const fact = (label: string, value: unknown) =>
    value === '' || value === null || value === undefined ? null : (
      <span class="rec-fact">
        {label + ' '}
        <b>{String(value)}</b>
      </span>
    );
  return (
    <div class="rec-band">
      <Chip kind={executionStatusKind(summary.status) as ChipKind}>{summary.status || 'unknown'}</Chip>
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
