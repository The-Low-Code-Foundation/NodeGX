/**
 * Triggers — schedules, webhooks and db-change hooks (WF-005), ported as-is
 * from the vanilla page (BMG-001 §3.1). `#/triggers/<id>` marks that row and
 * scrolls to it once after load.
 */
import { useEffect, useRef, useState } from 'preact/hooks';

import { api, encode } from '../api';
import { EmptyState } from '../composers';
import { when } from '../format';
import { Btn, Chip, Gap, Page, Row, Table, WriteBtn, fail, toast } from '../ui';
import type { ViewProps } from './index';

interface TriggerStatus {
  lastFiredAt?: unknown;
  lastResult?: unknown;
  lastSkip?: { at?: unknown; yieldedTo?: string } | null;
  skipCount?: number;
}

interface Trigger extends TriggerStatus {
  id: string;
  name?: string;
  type?: string;
  target?: { kind?: string; name?: string } | null;
  enabled?: boolean;
  effectiveOverlapPolicy?: string;
  status?: TriggerStatus;
}

export function TriggersView({ params }: ViewProps) {
  const [triggers, setTriggers] = useState<Trigger[] | null>(null);
  const wanted = params[0] || '';
  const scrolled = useRef(false);

  function load() {
    api<{ triggers?: Trigger[] }>('GET', '/admin/triggers')
      .then((d) => setTriggers((d && d.triggers) || []))
      .catch(fail);
  }
  useEffect(() => {
    load();
  }, []);

  // The linked row, scrolled to once the list is there — and only once, so a refresh does not yank the page.
  useEffect(() => {
    if (!triggers || !wanted || scrolled.current) return;
    const row = document.getElementById('trigger-' + wanted);
    if (!row) return;
    scrolled.current = true;
    row.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [triggers, wanted]);

  function setEnabled(t: Trigger) {
    api('POST', '/admin/triggers/' + encode(t.id) + '/enabled', { enabled: !t.enabled })
      .then(() => {
        toast('Trigger ' + (t.enabled ? 'disabled' : 'enabled') + '.', 'ok');
        load();
      })
      .catch(fail);
  }

  function fire(t: Trigger) {
    api('POST', '/admin/triggers/' + encode(t.id) + '/fire', {})
      .then(() => {
        toast('Trigger fired — see Runs for the record.', 'ok');
        load();
      })
      .catch(fail);
  }

  return (
    <Page title="Triggers" subtitle="Schedules, webhooks and db-change hooks (WF-005). Authoring the functions they call is the editor’s job.">
      <Row>
        <Btn onClick={load}>Refresh</Btn>
      </Row>
      <Gap />
      {triggers ? (
        <Table
          columns={['Name', 'Type', 'Target', 'Enabled', 'Overlap', 'Last fired', 'Last result', '']}
          rows={triggers}
          empty={
            <EmptyState icon="⏱" action={{ label: 'Refresh', onClick: load, write: false }}>
              No triggers yet. A trigger runs a function on a schedule, on a webhook, or when data changes.
            </EmptyState>
          }
          renderRow={(t) => {
            const last: TriggerStatus = t.status || t;
            return (
              <tr key={t.id} id={'trigger-' + t.id} class={t.id === wanted ? 'hit' : undefined}>
                <td>{t.name || t.id}</td>
                <td>{t.type}</td>
                <td>{(t.target && t.target.kind + ':' + t.target.name) || ''}</td>
                <td>{t.enabled ? <Chip kind="ok">on</Chip> : <Chip>off</Chip>}</td>
                <td>
                  <OverlapCell t={t} />
                </td>
                <td>{when(last.lastFiredAt)}</td>
                <td>
                  <LastResultChip result={last.lastResult} />
                </td>
                <td class="actions">
                  <WriteBtn tiny onClick={() => setEnabled(t)}>
                    {t.enabled ? 'Disable' : 'Enable'}
                  </WriteBtn>
                  <WriteBtn tiny onClick={() => fire(t)}>
                    Fire now
                  </WriteBtn>
                </td>
              </tr>
            );
          }}
        />
      ) : null}
    </Page>
  );
}

function LastResultChip({ result }: { result: unknown }) {
  if (!result) return <Chip>—</Chip>;
  const r = result as { ok?: boolean; error?: string };
  if (result === 'ok' || r.ok === true) return <Chip kind="ok">ok</Chip>;
  return <Chip kind="bad">{typeof result === 'string' ? result : r.error || 'failed'}</Chip>;
}

/**
 * FED-004 AC7 — the policy in force, and the last fire it refused.
 *
 * The policy comes from `effectiveOverlapPolicy`, which the route computes:
 * `schedule.overlapPolicy` is absent on disk when nobody authored one, and a
 * second copy of "absent means skip" living in this file is a second copy
 * that can drift from the scheduler's.
 *
 * A skip is NOT coloured red. It is the policy working, and an operator who
 * learns this column goes red when things are fine is an operator who stops
 * reading it. `warn` is the honest colour: nothing is broken, and something
 * did not run.
 */
export function OverlapCell({ t }: { t: Trigger }) {
  if (t.type !== 'schedule') return <span class="sub">—</span>;
  const policy = t.effectiveOverlapPolicy || 'skip';
  const status = t.status || {};
  const skip = status.lastSkip;
  const count = status.skipCount || 1;
  const yielded = skip && skip.yieldedTo ? ' → ' + skip.yieldedTo : '';
  return (
    <div>
      <Chip kind={policy === 'allow' ? '' : 'ok'}>{policy}</Chip>
      {skip ? (
        <div class="sub" title="The most recent fire that did not run, and the execution it yielded to.">
          {'skipped ' + count + '× · last ' + when(skip.at) + yielded}
        </div>
      ) : null}
    </div>
  );
}
