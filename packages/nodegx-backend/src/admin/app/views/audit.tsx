/**
 * Audit trail — who changed what, when, and from where (BAK-009). Ported
 * as-is from the vanilla page (BMG-001 §3.1). The action filter's options are
 * populated once, from the server's declared list, rather than from whatever
 * happens to be in the visible rows.
 */
import { useEffect, useState } from 'preact/hooks';

import { api, encode } from '../api';
import { EmptyState } from '../composers';
import { cellText, when } from '../format';
import { ActionCell, Btn, Chip, Dialog, Field, Gap, Page, Row, Sub, Table, fail, openModal } from '../ui';
import type { ViewProps } from './index';

interface AuditEntry {
  at?: unknown;
  action?: string;
  actorKind?: string;
  actor?: string;
  target?: unknown;
  outcome?: string;
  [key: string]: unknown;
}

interface AuditData {
  enabled?: boolean;
  retentionDays?: number;
  count: number;
  actions?: string[];
  entries?: AuditEntry[];
}

export function AuditView(_props: ViewProps) {
  const [action, setAction] = useState('');
  const [outcome, setOutcome] = useState('');
  const [actions, setActions] = useState<string[] | null>(null);
  const [data, setData] = useState<AuditData | null>(null);

  function load() {
    let query = 'limit=200';
    if (action) query += '&action=' + encode(action);
    if (outcome) query += '&outcome=' + encode(outcome);
    api<AuditData>('GET', '/admin/audit?' + query)
      .then((d) => {
        setActions((known) => (known === null ? d.actions || [] : known));
        setData(d);
      })
      .catch(fail);
  }
  useEffect(() => {
    load();
  }, [action, outcome]);

  function detail(entry: AuditEntry) {
    openModal((close) => (
      <Dialog title="Audit entry" autoFocus={false} actions={<Btn onClick={close}>Close</Btn>}>
        <textarea readOnly value={JSON.stringify(entry, null, 2)} style="min-height:320px" />
      </Dialog>
    ));
  }

  const filtered = !!(action || outcome);

  return (
    <Page title="Audit trail" subtitle="Who changed what, when, and from where — permissions, roles, keys, schema, backups, config, and admin logins (BAK-009).">
      <Row>
        <Field label="Action">
          <select value={action} onChange={(e) => setAction((e.currentTarget as HTMLSelectElement).value)}>
            {actions !== null ? <option value="">any action</option> : null}
            {(actions || []).map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Outcome">
          <select value={outcome} onChange={(e) => setOutcome((e.currentTarget as HTMLSelectElement).value)}>
            {['', 'success', 'failure'].map((o) => (
              <option key={o} value={o}>
                {o || 'any outcome'}
              </option>
            ))}
          </select>
        </Field>
        <Btn onClick={load}>Refresh</Btn>
      </Row>
      <Row>
        {data ? (
          <>
            {data.enabled ? <Chip kind="ok">recording</Chip> : <Chip kind="warn">disabled in ops.json</Chip>}
            <Chip>{data.retentionDays ? 'kept ' + data.retentionDays + ' days' : 'kept forever'}</Chip>
            <Chip>{data.count + ' entr' + (data.count === 1 ? 'y' : 'ies')}</Chip>
          </>
        ) : null}
      </Row>
      <Gap />
      <div>
        {data ? (
          <>
            <Table
              columns={['When', 'Action', 'Actor', 'Target', 'Outcome', '']}
              rows={data.entries || []}
              renderRow={(x, i) => (
                <tr key={i}>
                  <td>{when(x.at)}</td>
                  <td>{cellText(x.action)}</td>
                  <td>{cellText(x.actor ? x.actorKind + ' ' + x.actor : x.actorKind)}</td>
                  <td>{x.target ? JSON.stringify(x.target) : '—'}</td>
                  <td>
                    <Chip kind={x.outcome === 'success' ? 'ok' : 'bad'}>{cellText(x.outcome)}</Chip>
                  </td>
                  <ActionCell>
                    <Btn tiny onClick={() => detail(x)}>
                      Detail
                    </Btn>
                  </ActionCell>
                </tr>
              )}
              empty={
                filtered ? (
                  <EmptyState>No entries match.</EmptyState>
                ) : (
                  <EmptyState action={{ label: 'Refresh', onClick: load, write: false }}>
                    Nothing recorded yet. Changes to permissions, roles, keys, schema, backups and config land here.
                  </EmptyState>
                )
              }
            />
            <Sub style="margin-top:10px">
              The trail is a plain table in this backend’s database: whoever can reach the file can edit it. Ship the structured logs off-box if you need a copy an attacker on this machine cannot rewrite — every entry here has a matching log line with the same request id.
            </Sub>
          </>
        ) : null}
      </div>
    </Page>
  );
}
