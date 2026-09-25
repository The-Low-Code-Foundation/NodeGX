/**
 * Activity — who changed what, when, and from where (BAK-009's trail,
 * BMG-011 §3.6). The target is a link to the thing (*Pets · schema*,
 * *editors · role*), the actor a person's name or *API key: deploy*, the
 * detail a tree with the raw JSON one click away. The filter is `FilterRows
 * flat` over action · who · outcome · when — what `GET /admin/audit` answers.
 */
import { useEffect, useState } from 'preact/hooks';

import { ActivityEntry, actionWords, activityFields, activityQuery, actorWords, targetWords } from '../activity';
import { api } from '../api';
import { EmptyState, FilterRows } from '../composers';
import { describe, Group } from '../filters';
import { when } from '../format';
import { ActionCell, Btn, Chip, Dialog, Disclosure, Gap, Hint, JsonTree, Page, Row, Sub, Table, fail, openModal } from '../ui';
import type { ViewProps } from './index';

interface AuditData {
  enabled?: boolean;
  retentionDays?: number;
  count: number;
  actions?: string[];
  entries?: ActivityEntry[];
}

const PAGE = 100;

export function AuditView(_props: ViewProps) {
  const [group, setGroup] = useState<Group>({ kind: 'group', conj: 'and', items: [] });
  const [actions, setActions] = useState<string[] | null>(null);
  const [data, setData] = useState<AuditData | null>(null);
  const [offset, setOffset] = useState(0);
  const [problem, setProblem] = useState<string | null>(null);
  const [people, setPeople] = useState<Record<string, string>>({});

  const fields = activityFields(actions || []);
  let q: Record<string, string> = {};
  try {
    q = activityQuery(group);
    if (problem) setProblem(null);
  } catch (e) {
    if (!problem) setProblem((e as Error).message);
  }
  const qs = Object.keys(q)
    .map((k) => k + '=' + encodeURIComponent(q[k]))
    .join('&');

  function load() {
    api<AuditData>('GET', '/admin/audit?limit=' + PAGE + '&offset=' + offset + (qs ? '&' + qs : ''))
      .then((d) => {
        setActions((known) => (known === null ? d.actions || [] : known));
        setData(d);
        // The ids of the people who acted, named once each (BMG-014: an admin
        // can be a person). A lookup that fails leaves the id — never a guess.
        const ids = new Set<string>();
        for (const e of d.entries || []) {
          if ((e.actorKind === 'admin' || e.actorKind === 'admin:readonly' || e.actorKind === 'user') && e.actor && !people[e.actor]) ids.add(e.actor);
        }
        ids.forEach((id) => {
          api<{ user?: { email?: string | null; username?: string | null } }>('GET', '/admin/users/' + encodeURIComponent(id))
            .then((r) => {
              const u = r.user || {};
              const name = u.email || u.username;
              if (name) setPeople((p) => ({ ...p, [id]: name }));
            })
            .catch(() => undefined);
        });
      })
      .catch(fail);
  }
  useEffect(load, [qs, offset]);

  function detail(entry: ActivityEntry) {
    const target = targetWords(entry);
    openModal((close) => (
      <Dialog title={actionWords(entry.action || '')} autoFocus={false} wide actions={<Btn onClick={close}>Close</Btn>}>
        <Row>
          <Chip kind={entry.outcome === 'success' ? 'ok' : 'bad'}>{entry.outcome === 'success' ? 'succeeded' : 'failed'}</Chip>
          <span class="hint">{when(entry.at)}</span>
          <span class="hint">{'by ' + actorWords(entry, (id) => people[id] || null)}</span>
          {target.href ? <a href={target.href} onClick={close}>{target.text}</a> : <span>{target.text}</span>}
        </Row>
        <Gap h={8} />
        {entry.detail && Object.keys(entry.detail).length ? (
          <div class="jx">
            <JsonTree value={entry.detail} name="what changed" openTo={2} />
          </div>
        ) : (
          <div class="hint">Nothing more was recorded.</div>
        )}
        <Gap h={8} />
        <div class="hint">
          {[entry.ip ? 'from ' + entry.ip : '', entry.requestId ? 'request ' + entry.requestId : '', entry.status ? 'HTTP ' + entry.status : ''].filter(Boolean).join(' · ')}
        </div>
        <Disclosure label="Raw entry">
          <textarea readOnly value={JSON.stringify(entry, null, 2)} style="min-height:240px;width:100%" />
        </Disclosure>
      </Dialog>
    ));
  }

  const filtered = group.items.length > 0;
  const total = data ? data.count : 0;
  const from = total ? offset + 1 : 0;
  const to = Math.min(offset + PAGE, total);

  return (
    <Page title="Activity" subtitle="Who changed what, when, and from where — permissions, roles, keys, schema, backups, settings and sign-ins.">
      <div id="activity-filter">
        <FilterRows group={group} fields={fields} flat onChange={(g) => { setGroup(g); setOffset(0); }} />
      </div>
      {problem ? <Hint>{problem}</Hint> : null}
      <Gap />
      <Row>
        {data ? (
          <>
            {data.enabled ? <Chip kind="ok">recording</Chip> : <Chip kind="warn">turned off on the Server page</Chip>}
            <Chip>{data.retentionDays ? 'kept ' + data.retentionDays + ' days' : 'kept forever'}</Chip>
            <span class="hint" id="activity-count">
              {total ? 'Showing ' + from + '–' + to + ' of ' + total : 'No entries'}
              {filtered && qs ? ' where ' + describe(group, fields) : ''}
            </span>
          </>
        ) : null}
        <Btn tiny disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>
          ‹ Newer
        </Btn>
        <Btn tiny disabled={to >= total} onClick={() => setOffset(offset + PAGE)}>
          Older ›
        </Btn>
        <Btn tiny onClick={load}>
          Refresh
        </Btn>
      </Row>
      <Gap />
      {data ? (
        <>
          <Table
            columns={['When', 'What', 'Who', 'On', 'Outcome', '']}
            rows={data.entries || []}
            renderRow={(x, i) => {
              const target = targetWords(x);
              return (
                <tr key={x.objectId || i}>
                  <td>{when(x.at)}</td>
                  <td>{actionWords(x.action || '')}</td>
                  <td>{actorWords(x, (id) => people[id] || null)}</td>
                  <td>{target.href ? <a href={target.href}>{target.text}</a> : target.text}</td>
                  <td>
                    <Chip kind={x.outcome === 'success' ? 'ok' : 'bad'}>{x.outcome === 'success' ? 'succeeded' : 'failed'}</Chip>
                  </td>
                  <ActionCell>
                    <Btn tiny onClick={() => detail(x)}>
                      Detail
                    </Btn>
                  </ActionCell>
                </tr>
              );
            }}
            empty={
              filtered ? (
                <EmptyState>Nothing matches.</EmptyState>
              ) : (
                <EmptyState action={{ label: 'Refresh', onClick: load, write: false }}>
                  Nothing recorded yet. Changes to permissions, roles, keys, schema, backups and settings land here.
                </EmptyState>
              )
            }
          />
          <Sub style="margin-top:10px">
            The trail is a table in this backend’s own database: whoever can reach the file can edit it. Ship the logs off the machine if you need a copy nobody here can rewrite — every entry has a matching log line with the same request id.
          </Sub>
        </>
      ) : null}
    </Page>
  );
}
