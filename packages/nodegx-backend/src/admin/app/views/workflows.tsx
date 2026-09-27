/**
 * Workflows — WF-001 step DAGs. Run them here; author them in the editor's
 * canvas (that is a canvas, not a panel — R2 leaves it).
 *
 * BMG-009: the list says what each one is (name, steps, its last run as a
 * chip and a time, linked to the record), and *Run* opens a drawer at
 * `#/workflows/<id>` where what the run starts with is typed rows, never
 * JSON. A definition declares no inputs (`workflow/types.ts` has no such
 * field), so the drawer reads what the steps ASK FOR — every `$path` into
 * `body.<name>` — and offers those names as rows first (`inferInputs`); a
 * workflow that reads nothing by name gets an empty key/value editor. *Run*
 * asks the route not to wait (`wait: false`, a 202 with the record id) and
 * lands on `#/runs/<id>` while the run is still going.
 *
 * No *Open in the editor*: the editor registers the `nodegx` URL scheme but
 * its handler opens `noodl:import/http…` only (`noodl-editor/src/editor/index.ts`),
 * so a link would open nothing. Omitted rather than inert (BMG-009 §3).
 */
import { useEffect, useState } from 'preact/hooks';

import { api, encode } from '../api';
import { Drawer, EmptyState, KeyValueEditor, KvRow, objectFromRows } from '../composers';
import { cellText, executionStatusKind, when } from '../format';
import { href, hrefWith, navigate } from '../router';
import { Btn, Chip, ChipKind, Gap, Hint, Notice, Page, Row, Sub, Table, WriteBtn, fail, toast } from '../ui';
import type { ViewProps } from './index';

export interface Workflow {
  id: string;
  name?: unknown;
  entry?: unknown;
  steps?: unknown[];
}

export interface LastRun {
  id: string;
  status: string;
  startedAt: number;
  durationMs?: number;
  engineStatus?: string;
}

// ------------------------------------------------------------- the model --

/**
 * The names a workflow's steps read off the run's `body` — `{ "$path":
 * "body.customerId" }` anywhere in a step's params, conditions or routes —
 * in the order they are first met, each once. The value language has no
 * other way to read the caller's data by name (`steps/values.ts`), so this
 * is the whole answer; a `$path` into `previous`, `trigger` or `headers` is
 * not an input. Legacy top-level reads (`$path: "customerId"`) are left out:
 * that spelling is deprecated and ambiguous with a step's own output.
 */
export function inferInputs(def: Workflow | null | undefined): string[] {
  const names: string[] = [];
  const seen: Record<string, boolean> = {};
  const walk = (v: unknown, depth: number) => {
    if (depth > 40 || v === null || typeof v !== 'object') return;
    if (Array.isArray(v)) {
      v.forEach((x) => walk(x, depth + 1));
      return;
    }
    const o = v as Record<string, unknown>;
    if (typeof o.$path === 'string') {
      const m = /^body\.([^.[\]]+)/.exec(o.$path);
      if (m && !seen[m[1]]) {
        seen[m[1]] = true;
        names.push(m[1]);
      }
      return;
    }
    if ('$literal' in o) return;
    for (const k of Object.keys(o)) walk(o[k], depth + 1);
  };
  ((def && def.steps) || []).forEach((step) => walk(step, 0));
  return names;
}

/** The rows a run drawer opens with: one text row per name the steps read, or none. */
export function startingRows(names: string[]): KvRow[] {
  return names.map((key) => ({ key, type: 'text', raw: '' }));
}

/** The word the last-run chip wears: the engine's disposition when it has one, else the store's status. */
export function lastRunWord(last: LastRun | undefined): string {
  if (!last) return '';
  if (last.engineStatus === 'cancelled') return 'cancelled';
  return last.status;
}

export function workflowName(w: Workflow): string {
  return typeof w.name === 'string' && w.name ? w.name : w.id;
}

// -------------------------------------------------------------- the page --

export function WorkflowsView({ params }: ViewProps) {
  const [list, setList] = useState<Workflow[] | null>(null);
  const [lastRuns, setLastRuns] = useState<Record<string, LastRun>>({});
  const opened = params[0] || '';

  function load() {
    api<{ workflows?: Workflow[]; definitions?: Workflow[]; lastRuns?: Record<string, LastRun> }>('GET', '/admin/workflow-defs')
      .then((d) => {
        setList((d && (d.workflows || d.definitions)) || []);
        setLastRuns((d && d.lastRuns) || {});
      })
      .catch(fail);
  }
  useEffect(() => {
    load();
  }, []);

  const editing = opened && list ? list.find((w) => w.id === opened) || null : null;

  return (
    <Page title="Workflows" subtitle="Step-by-step jobs this backend runs. Run one here; author them in the editor.">
      <Row>
        <Btn onClick={load}>Refresh</Btn>
      </Row>
      <Gap />
      {list ? (
        <Table
          columns={['Name', 'Steps', 'Last run', '']}
          rows={list}
          empty={
            <EmptyState icon="⇶" action={{ label: 'Refresh', onClick: load, write: false }}>
              No workflows yet. Workflows are authored in the editor.
            </EmptyState>
          }
          renderRow={(w) => {
            const last = lastRuns[w.id];
            const word = lastRunWord(last);
            return (
              <tr key={w.id} id={'workflow-' + w.id} class={w.id === opened ? 'hit' : ''}>
                <td>{workflowName(w)}</td>
                <td>{String((w.steps || []).length)}</td>
                <td>
                  {last ? (
                    <a href={href('runs', last.id)} title="Open the record">
                      <Chip kind={executionStatusKind(word) as ChipKind}>{word}</Chip>
                      <span class="hint">{' ' + when(last.startedAt)}</span>
                    </a>
                  ) : (
                    <span class="hint">never</span>
                  )}
                </td>
                <td class="actions">
                  <Btn tiny onClick={() => (location.hash = hrefWith('runs', [], { workflow: w.id }))} title="Every run of this workflow">
                    Runs
                  </Btn>
                  <WriteBtn tiny kind="primary" onClick={() => navigate('workflows', w.id)}>
                    Run
                  </WriteBtn>
                </td>
              </tr>
            );
          }}
        />
      ) : null}
      {opened && list && !editing ? <Notice kind="warn">There is no workflow called “{opened}”.</Notice> : null}
      {editing ? <RunDrawer key={editing.id} workflow={editing} onClose={() => navigate('workflows')} /> : null}
    </Page>
  );
}

// ------------------------------------------------------------ the drawer --

function RunDrawer({ workflow, onClose }: { workflow: Workflow; onClose: () => void }) {
  const names = inferInputs(workflow);
  const [rows, setRows] = useState<KvRow[]>(() => startingRows(names));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function go() {
    let payload: Record<string, unknown>;
    try {
      payload = objectFromRows(rows);
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    setError(null);
    setBusy(true);
    api<{ started?: boolean; executionId?: string; run?: { status?: string; executionId?: string } }>('POST', '/admin/workflow-defs/' + encode(workflow.id) + '/run', { payload, wait: false })
      .then((result) => {
        setBusy(false);
        const id = (result && result.executionId) || (result && result.run && result.run.executionId) || '';
        if (id) {
          navigate('runs', id);
          return;
        }
        // The history is off: the route waited, and there is no record to open.
        toast('Run finished: ' + ((result && result.run && result.run.status) || 'see Runs') + '.', 'ok');
        onClose();
      })
      .catch((e) => {
        setBusy(false);
        setError((e as Error).message);
      });
  }

  return (
    <Drawer
      title={'Run ' + workflowName(workflow)}
      subtitle={((workflow.steps || []).length === 1 ? '1 step' : (workflow.steps || []).length + ' steps') + ', starting at ' + cellText(workflow.entry)}
      onClose={onClose}
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <WriteBtn kind="primary" disabled={busy} onClick={go}>
            Run
          </WriteBtn>
        </>
      }
    >
      <div id="run-inputs">
        {names.length ? (
          <>
            <Sub>What this workflow reads</Sub>
            <Hint>Its steps ask for {names.map((n) => '“' + n + '”').join(', ')} by name. Fill those in; add anything else the steps should also start with.</Hint>
          </>
        ) : (
          <>
            <Sub>What each step starts with</Sub>
            <Hint>This workflow reads nothing by name. Anything you add here reaches every step as its starting data.</Hint>
          </>
        )}
        <Gap h={8} />
        <KeyValueEditor id="run-payload" rows={rows} onChange={setRows} keyPlaceholder="name" />
      </div>
      {error ? <Notice kind="bad" style="margin-top:12px">{error}</Notice> : null}
    </Drawer>
  );
}
