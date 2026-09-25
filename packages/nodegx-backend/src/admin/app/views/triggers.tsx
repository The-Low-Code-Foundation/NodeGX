/**
 * Triggers — BMG-008. Something that runs on its own: on a schedule, when
 * called from outside (a webhook), or when data changes. Authored HERE, in a
 * drawer the URL opens (`#/triggers/new`, `#/triggers/<id>`), with the schedule
 * as radios and controls (`ScheduleBuilder`), the webhook's URL shown and
 * copyable, the collection and its actions as boxes, and the payload as rows.
 *
 * 🔴 AC8: the only cron text field is the builder's *Custom* mode, and there
 * is no JSON textarea on the page. The list never parses a cron: the route
 * decorates each schedule with its words (`scheduleWords`) and the drawer asks
 * `POST /admin/triggers/preview` for an unsaved expression.
 *
 * What the drawer must not pretend to know: a webhook's secret. It is shown
 * once on create and once on *Rotate*, from the response that minted it.
 */
import { useEffect, useState } from 'preact/hooks';

import { api, encode, useSession } from '../api';
import { DangerAction, DangerZone, Drawer, EmptyState, KeyValueEditor, KvRow, Picker, ScheduleBuilder, SchedulePreview, objectFromRows, rowsFromObject } from '../composers';
import { ago, when } from '../format';
import { navigate } from '../router';
import { Btn, Chip, Field, Gap, Hint, Notice, Page, Row, Spacer, Switch, Table, WriteBtn, confirmSimple, copyText, fail, toast } from '../ui';
import type { ViewProps } from './index';

// ------------------------------------------------------------------ types --

type TriggerType = 'schedule' | 'webhook' | 'db-change';
type MissedFirePolicy = 'skip' | 'run-once-on-start';
type OverlapPolicy = 'skip' | 'queue-one' | 'allow';
type WebhookScheme = 'hmac-sha256' | 'token';
type ChangeAction = 'create' | 'update' | 'delete';
type TargetKind = 'function' | 'workflow';

interface TriggerStatus {
  lastFiredAt?: unknown;
  nextFireAt?: unknown;
  lastResult?: unknown;
  lastSkip?: { at?: unknown; policy?: string; yieldedTo?: string | null } | null;
  skipCount?: number;
  fireCount?: number;
}

interface Trigger extends TriggerStatus {
  id: string;
  name?: string;
  type?: TriggerType;
  target?: { kind?: TargetKind; name?: string } | null;
  enabled?: boolean;
  responseMode?: 'sync' | 'async';
  responseTimeoutMs?: number;
  schedule?: { cron?: string; missedFirePolicy?: MissedFirePolicy; overlapPolicy?: OverlapPolicy; payload?: unknown };
  webhook?: { slug?: string; scheme?: WebhookScheme; maxBodyBytes?: number };
  dbChange?: { collection?: string; actions?: ChangeAction[] };
  effectiveOverlapPolicy?: OverlapPolicy;
  /** The cron in words, from the route (`cronWords`); null for a shape it does not read. */
  scheduleWords?: string | null;
  status?: TriggerStatus;
  updatedAt?: string;
}

interface FunctionRow {
  name: string;
  deployed?: boolean;
}

interface WorkflowRow {
  id: string;
  name?: unknown;
}

// ------------------------------------------------------------ vocabulary --

/** The server's rule for a webhook slug (`registry.ts` SLUG_RE), and its words. */
export const SLUG_RULE = /^[a-z0-9][a-z0-9-]{0,63}$/;

export const ACTION_WORDS: Array<{ id: ChangeAction; label: string }> = [
  { id: 'create', label: 'created' },
  { id: 'update', label: 'changed' },
  { id: 'delete', label: 'deleted' }
];

export const BODY_SIZES: Array<{ bytes: number; label: string }> = [
  { bytes: 64 * 1024, label: '64 KB' },
  { bytes: 256 * 1024, label: '256 KB' },
  { bytes: 1024 * 1024, label: '1 MB' },
  { bytes: 5 * 1024 * 1024, label: '5 MB' },
  { bytes: 10 * 1024 * 1024, label: '10 MB' }
];

/** The most a sync answer may wait, in seconds (`registry.ts` MAX_RESPONSE_TIMEOUT_MS). */
const MAX_WAIT_S = 300;
const DEFAULT_WAIT_S = 30;
const DEFAULT_BODY_BYTES = 1024 * 1024;

export function sizeWords(bytes: number): string {
  const known = BODY_SIZES.find((s) => s.bytes === bytes);
  if (known) return known.label;
  if (bytes >= 1024 * 1024) return Math.round((bytes / (1024 * 1024)) * 10) / 10 + ' MB';
  if (bytes >= 1024) return Math.round(bytes / 1024) + ' KB';
  return bytes + ' bytes';
}

/** A name, as a slug: "Stripe payments" → "stripe-payments". */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

/** The list's *When* column: the sentence, the hook's path, or the collection and its actions. */
export function whenWords(t: Trigger): string {
  if (t.type === 'schedule') return t.scheduleWords || (t.schedule && t.schedule.cron) || '';
  if (t.type === 'webhook') return 'webhook · /' + ((t.webhook && t.webhook.slug) || '');
  if (t.type === 'db-change') {
    const d = t.dbChange || {};
    const acts = (d.actions || []).map((a) => (ACTION_WORDS.find((w) => w.id === a) || { label: a }).label);
    return (d.collection || '') + ': ' + acts.join(', ');
  }
  return '';
}

/** The hook's full URL, as a sender must paste it. */
export function webhookUrl(origin: string, backendId: string, slug: string): string {
  return origin + '/hooks/' + encodeURIComponent(backendId) + '/' + slug;
}

/** An example call, signed the way the scheme expects. Shell only — nothing here runs it. */
export function webhookExample(url: string, scheme: WebhookScheme, secret: string): string {
  if (scheme === 'token') {
    return "curl -X POST -H 'Content-Type: application/json' -H 'X-Webhook-Token: " + secret + "' -d '{\"hello\":\"world\"}' " + url;
  }
  return (
    "BODY='{\"hello\":\"world\"}'\n" +
    "SIG=$(printf '%s' \"$BODY\" | openssl dgst -sha256 -hmac '" +
    secret +
    "' | sed 's/^.* //')\n" +
    "curl -X POST -H 'Content-Type: application/json' -H \"X-Hub-Signature-256: sha256=$SIG\" -d \"$BODY\" " +
    url
  );
}

// ------------------------------------------------------------- the list --

export function TriggersView({ params }: ViewProps) {
  const [triggers, setTriggers] = useState<Trigger[] | null>(null);
  const [overlapDefault, setOverlapDefault] = useState<OverlapPolicy | null>(null);
  const [functions, setFunctions] = useState<FunctionRow[] | null>(null);
  const [workflows, setWorkflows] = useState<WorkflowRow[] | null>(null);
  const [collections, setCollections] = useState<string[] | null>(null);
  const opened = params[0] || '';

  function load() {
    api<{ triggers?: Trigger[]; overlapDefault?: OverlapPolicy }>('GET', '/admin/triggers')
      .then((d) => {
        setTriggers((d && d.triggers) || []);
        if (d && d.overlapDefault) setOverlapDefault(d.overlapDefault);
      })
      .catch(fail);
  }
  useEffect(() => {
    load();
    api<{ functions?: FunctionRow[] }>('GET', '/admin/permissions/functions')
      .then((d) => setFunctions(d.functions || []))
      .catch(() => setFunctions([]));
    api<{ workflows?: WorkflowRow[]; definitions?: WorkflowRow[] }>('GET', '/admin/workflow-defs')
      .then((d) => setWorkflows((d && (d.workflows || d.definitions)) || []))
      .catch(() => setWorkflows([]));
    api<{ tables?: Array<{ name: string }> }>('GET', '/admin/schema')
      .then((d) => setCollections((d.tables || []).map((t) => t.name).filter((n) => n.charAt(0) !== '_')))
      .catch(() => setCollections([]));
  }, []);

  function setEnabled(t: Trigger, enabled: boolean) {
    api('POST', '/admin/triggers/' + encode(t.id) + '/enabled', { enabled })
      .then(() => {
        toast((t.name || t.id) + (enabled ? ' is on.' : ' is off.'), 'ok');
        load();
      })
      .catch(fail);
  }

  const workflowName = (id: string) => {
    const w = (workflows || []).find((x) => x.id === id);
    return w && w.name ? String(w.name) : id;
  };

  const editing = opened && opened !== 'new' && triggers ? triggers.find((t) => t.id === opened) || null : null;

  return (
    <Page title="Triggers" subtitle="Something that runs on its own: on a schedule, when called from outside, or when data changes.">
      <Row>
        <WriteBtn kind="primary" onClick={() => navigate('triggers', 'new')}>
          New trigger
        </WriteBtn>
        <Btn onClick={load}>Refresh</Btn>
      </Row>
      <Gap />
      {triggers ? (
        <Table
          columns={['Name', 'When', 'Runs', 'Next run', 'Last run', 'Overlap', 'Enabled']}
          rows={triggers}
          empty={
            <EmptyState icon="⏱" action={{ label: 'Schedule a function', onClick: () => navigate('triggers', 'new') }}>
              Nothing runs on its own yet.
            </EmptyState>
          }
          renderRow={(t) => {
            const last: TriggerStatus = t.status || t;
            return (
              <tr key={t.id} id={'trigger-' + t.id} class={'clickable' + (t.id === opened ? ' hit' : '')} onClick={() => navigate('triggers', t.id)}>
                <td>{t.name || t.id}</td>
                <td>{whenWords(t)}</td>
                <td>
                  {t.target && t.target.kind === 'workflow' ? (
                    <>
                      <span class="hint">workflow </span>
                      {workflowName(t.target.name || '')}
                    </>
                  ) : (
                    <>
                      <span class="hint">function </span>
                      <span class="mono">{(t.target && t.target.name) || ''}</span>
                    </>
                  )}
                </td>
                <td>{t.type === 'schedule' ? (t.enabled ? when(last.nextFireAt) : <span class="hint">off</span>) : <span class="hint">—</span>}</td>
                <td>
                  <LastRunCell status={last} />
                </td>
                <td>
                  <OverlapCell t={t} />
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                  <Switch checked={!!t.enabled} label={'Enabled: ' + (t.name || t.id)} onChange={(on) => setEnabled(t, on)} />
                </td>
              </tr>
            );
          }}
        />
      ) : null}
      {(opened === 'new' || editing) && overlapDefault ? (
        <TriggerDrawer
          key={opened}
          existing={editing}
          overlapDefault={overlapDefault}
          functions={functions}
          workflows={workflows}
          collections={collections}
          onClose={() => navigate('triggers')}
          onChanged={load}
        />
      ) : null}
    </Page>
  );
}

/** The last thing that happened: a run's result, or the skip that came after it. */
function LastRunCell({ status }: { status: TriggerStatus }) {
  const skip = status.lastSkip;
  const firedAt = status.lastFiredAt ? new Date(String(status.lastFiredAt)).getTime() : 0;
  const skippedAt = skip && skip.at ? new Date(String(skip.at)).getTime() : 0;
  if (skip && skippedAt >= firedAt) {
    return (
      <span title={'Skipped at ' + when(skip.at) + ': the previous run was still going' + (skip.yieldedTo ? ' (' + skip.yieldedTo + ')' : '') + '.'}>
        <Chip kind="warn">skipped</Chip> <span class="sub">{ago(skip.at)} · still running</span>
      </span>
    );
  }
  if (!status.lastFiredAt) return <span class="hint">never</span>;
  return (
    <span title={when(status.lastFiredAt)}>
      <LastResultChip result={status.lastResult} /> <span class="sub">{ago(status.lastFiredAt)}</span>
    </span>
  );
}

function LastResultChip({ result }: { result: unknown }) {
  if (!result) return <Chip>ran</Chip>;
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

// ------------------------------------------------------------ the drawer --

interface Draft {
  name: string;
  targetKind: TargetKind;
  targetName: string;
  type: TriggerType | null;
  cron: string;
  missed: MissedFirePolicy;
  overlap: OverlapPolicy;
  payload: KvRow[];
  slug: string;
  slugTouched: boolean;
  scheme: WebhookScheme;
  maxBodyBytes: number;
  collection: string;
  actions: ChangeAction[];
  sync: boolean;
  waitS: number;
  enabled: boolean;
}

export function draftFrom(existing: Trigger | null, overlapDefault: OverlapPolicy): Draft {
  const s = (existing && existing.schedule) || {};
  const w = (existing && existing.webhook) || {};
  const d = (existing && existing.dbChange) || {};
  return {
    name: (existing && existing.name) || '',
    targetKind: (existing && existing.target && existing.target.kind) || 'function',
    targetName: (existing && existing.target && existing.target.name) || '',
    type: existing ? existing.type || null : null,
    cron: s.cron || '',
    missed: s.missedFirePolicy || 'skip',
    overlap: (existing && existing.effectiveOverlapPolicy) || overlapDefault,
    payload: rowsFromObject(s.payload),
    slug: w.slug || '',
    slugTouched: !!existing,
    scheme: w.scheme || 'hmac-sha256',
    maxBodyBytes: w.maxBodyBytes || DEFAULT_BODY_BYTES,
    collection: d.collection || '',
    actions: (d.actions || []).slice(),
    sync: !!(existing && existing.responseMode === 'sync'),
    waitS: existing && existing.responseTimeoutMs ? Math.round(existing.responseTimeoutMs / 1000) : DEFAULT_WAIT_S,
    enabled: existing ? existing.enabled !== false : true
  };
}

/** Why the draft cannot be saved yet, in words, or null. */
export function draftProblem(d: Draft): string | null {
  if (!d.type) return 'Pick when it runs.';
  if (!d.targetName.trim()) return d.targetKind === 'workflow' ? 'Pick the workflow it runs.' : 'Pick the function it runs.';
  if (d.type === 'schedule' && !d.cron) return 'Finish the schedule.';
  if (d.type === 'webhook') {
    if (!d.slug) return 'Give the hook a path.';
    if (!SLUG_RULE.test(d.slug)) return 'A hook path is lowercase letters, digits and hyphens, starting with a letter or digit, up to 64 long.';
  }
  if (d.type === 'db-change') {
    if (!d.collection) return 'Pick the collection to watch.';
    if (!d.actions.length) return 'Tick at least one of created, changed, deleted.';
  }
  if (d.targetKind === 'workflow' && d.sync && !(Number.isInteger(d.waitS) && d.waitS >= 1 && d.waitS <= MAX_WAIT_S)) {
    return 'Wait between 1 and ' + MAX_WAIT_S + ' seconds.';
  }
  return null;
}

/** The body `POST /admin/triggers` and `PUT /admin/triggers/:id` take. Throws a sentence for a bad payload row. */
export function toInput(d: Draft): Record<string, unknown> {
  const input: Record<string, unknown> = {
    type: d.type,
    name: d.name.trim() || undefined,
    enabled: d.enabled,
    target: { kind: d.targetKind, name: d.targetName.trim() }
  };
  if (d.targetKind === 'workflow' && d.sync) {
    input.responseMode = 'sync';
    input.responseTimeoutMs = d.waitS * 1000;
  }
  if (d.type === 'schedule') {
    const payload = objectFromRows(d.payload);
    input.schedule = {
      cron: d.cron,
      missedFirePolicy: d.missed,
      overlapPolicy: d.overlap,
      ...(Object.keys(payload).length ? { payload } : {})
    };
  } else if (d.type === 'webhook') {
    input.webhook = { slug: d.slug, scheme: d.scheme, maxBodyBytes: d.maxBodyBytes };
  } else if (d.type === 'db-change') {
    input.dbChange = { collection: d.collection, actions: d.actions };
  }
  return input;
}

interface DrawerProps {
  existing: Trigger | null;
  overlapDefault: OverlapPolicy;
  functions: FunctionRow[] | null;
  workflows: WorkflowRow[] | null;
  collections: string[] | null;
  onClose: () => void;
  onChanged: () => void;
}

const TYPE_TILES: Array<{ id: TriggerType; title: string; words: string }> = [
  { id: 'schedule', title: 'On a schedule', words: 'Every so often, at a time you pick.' },
  { id: 'webhook', title: 'When called from outside', words: 'Another service posts to a URL — Stripe, GitHub, a form.' },
  { id: 'db-change', title: 'When data changes', words: 'A record in a collection is created, changed or deleted.' }
];

function TriggerDrawer({ existing, overlapDefault, functions, workflows, collections, onClose, onChanged }: DrawerProps) {
  const { readonly, whoami } = useSession();
  const backendId = (whoami && whoami.backend && whoami.backend.id) || '';
  const origin = typeof location !== 'undefined' ? location.origin : '';
  const [draft, setDraft] = useState<Draft>(() => draftFrom(existing, overlapDefault));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [secret, setSecret] = useState<{ secret: string; note?: string } | null>(null);
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  const problem = draftProblem(draft);
  const ready = !busy && !readonly && !problem;
  const url = webhookUrl(origin, backendId, draft.slug);

  const previewCron = (cron: string): Promise<SchedulePreview> => api<SchedulePreview>('POST', '/admin/triggers/preview', { cron, count: 5 });

  function submit() {
    if (problem) {
      setError(problem);
      return;
    }
    let input: Record<string, unknown>;
    try {
      input = toInput(draft);
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    setError(null);
    setBusy(true);
    const request = existing ? api<{ trigger: Trigger; secret?: string; secretNote?: string }>('PUT', '/admin/triggers/' + encode(existing.id), input) : api<{ trigger: Trigger; secret?: string; secretNote?: string }>('POST', '/admin/triggers', input);
    request
      .then((result) => {
        setBusy(false);
        onChanged();
        if (result && result.secret) {
          setSecret({ secret: result.secret, note: result.secretNote });
          return;
        }
        toast(existing ? 'Saved.' : 'Trigger created.', 'ok');
        onClose();
      })
      .catch((e) => {
        setBusy(false);
        setError((e as Error).message);
      });
  }

  function runNow() {
    if (!existing) return;
    setBusy(true);
    api<{ response?: { statusCode?: number } }>('POST', '/admin/triggers/' + encode(existing.id) + '/fire', {})
      .then((r) => {
        setBusy(false);
        const code = r && r.response && r.response.statusCode;
        toast('Ran now' + (code ? ' (' + code + ')' : '') + ' — the record is in Runs.', code && code >= 400 ? 'bad' : 'ok');
        onChanged();
      })
      .catch((e) => {
        setBusy(false);
        fail(e);
      });
  }

  function rotate() {
    if (!existing) return;
    confirmSimple(
      'Rotate the secret',
      'A new secret is made and shown once. Every sender still using the current one is refused from that moment until it is given the new secret.',
      () => {
        api<{ secret: string; secretNote?: string }>('POST', '/admin/triggers/' + encode(existing.id) + '/secret', {})
          .then((r) => {
            onChanged();
            setSecret({ secret: r.secret, note: r.secretNote });
          })
          .catch(fail);
      },
      'Rotate'
    );
  }

  function remove() {
    if (!existing) return;
    api('DELETE', '/admin/triggers/' + encode(existing.id))
      .then(() => {
        toast('Trigger deleted.', 'ok');
        onChanged();
        onClose();
      })
      .catch(fail);
  }

  const done = () => {
    onChanged();
    onClose();
  };

  if (secret) {
    return (
      <Drawer
        title={existing ? 'New secret for ' + (draft.name || existing.id) : 'Your new webhook: ' + (draft.name || draft.slug)}
        onClose={done}
        footer={
          <Btn kind="primary" onClick={done}>
            Done
          </Btn>
        }
      >
        <WebhookSecretCard secret={secret.secret} note={secret.note} url={url} scheme={draft.scheme} />
      </Drawer>
    );
  }

  const title = existing ? draft.name || existing.id : 'New trigger';
  const subtitle = existing ? 'Last changed ' + when(existing.updatedAt) + '.' : undefined;

  return (
    <Drawer
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      wide
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Switch id="trigger-enabled" checked={draft.enabled} disabled={readonly} onChange={(enabled) => set({ enabled })}>
            Enabled
          </Switch>
          <Spacer />
          {existing ? (
            <WriteBtn disabled={busy} onClick={runNow} title="Fire it once, now, whatever the schedule says. The run is recorded like any other.">
              Run now
            </WriteBtn>
          ) : null}
          <WriteBtn kind="primary" disabled={!ready} onClick={submit}>
            {existing ? 'Save' : 'Create'}
          </WriteBtn>
        </>
      }
    >
      <div class="form-grid" onInput={() => setError(null)}>
        <Field label="Name">
          <input
            type="text"
            placeholder="What it does — e.g. nightly digest"
            value={draft.name}
            disabled={readonly}
            onInput={(e) => {
              const name = (e.currentTarget as HTMLInputElement).value;
              set(draft.slugTouched ? { name } : { name, slug: slugify(name) });
            }}
          />
        </Field>

        {/* 1. What runs */}
        <div class="field">
          <span class="field-head">
            <b>What runs</b>
          </span>
          <div class="scope-group">
            <div class="field-line">
              <label class="check">
                <input type="radio" name="target-kind" checked={draft.targetKind === 'function'} disabled={readonly} onChange={() => set({ targetKind: 'function', targetName: '', sync: false })} /> A function
              </label>
              <label class="check">
                <input type="radio" name="target-kind" checked={draft.targetKind === 'workflow'} disabled={readonly} onChange={() => set({ targetKind: 'workflow', targetName: '' })} /> A workflow
              </label>
            </div>
            <div class="scope-indent" id="target-picker">
              {draft.targetKind === 'function' ? <FunctionPicker functions={functions} value={draft.targetName} onChange={(name) => set({ targetName: name })} disabled={readonly} /> : <WorkflowPicker workflows={workflows} value={draft.targetName} onChange={(id) => set({ targetName: id })} disabled={readonly} />}
            </div>
          </div>
        </div>

        {/* 2. When */}
        <div class="field">
          <span class="field-head">
            <b>When</b>
          </span>
          {existing ? (
            <Hint>
              This trigger runs {draft.type === 'schedule' ? 'on a schedule' : draft.type === 'webhook' ? 'when called from outside' : 'when data changes'}. A trigger’s kind cannot change — for a different kind, make a new one and delete this.
            </Hint>
          ) : (
            <div class="tiles" role="radiogroup" aria-label="When it runs">
              {TYPE_TILES.map((tile) => (
                <label key={tile.id} class={'tile' + (draft.type === tile.id ? ' on' : '')}>
                  <input type="radio" name="trigger-type" value={tile.id} checked={draft.type === tile.id} disabled={readonly} onChange={() => set({ type: tile.id })} />
                  <b>{tile.title}</b>
                  <span class="sub">{tile.words}</span>
                </label>
              ))}
            </div>
          )}

          {draft.type === 'schedule' ? (
            <div class="when-body">
              <ScheduleBuilder id="trigger-schedule" value={draft.cron} onChange={(cron) => set({ cron })} preview={previewCron} disabled={readonly} />
              <Gap h={10} />
              <div class="grid2">
                <div class="scope-group">
                  <div class="field-head">
                    <b>If a run is missed while the backend is off</b>
                  </div>
                  <label class="check">
                    <input type="radio" name="missed" checked={draft.missed === 'skip'} disabled={readonly} onChange={() => set({ missed: 'skip' })} /> Skip it — carry on from the next time
                  </label>
                  <label class="check">
                    <input type="radio" name="missed" checked={draft.missed === 'run-once-on-start'} disabled={readonly} onChange={() => set({ missed: 'run-once-on-start' })} /> Run once when the backend starts
                  </label>
                </div>
                <div class="scope-group">
                  <div class="field-head">
                    <b>If the last run is still going</b>
                  </div>
                  <label class="check">
                    <input type="radio" name="overlap" checked={draft.overlap === 'skip'} disabled={readonly} onChange={() => set({ overlap: 'skip' })} /> Skip this run
                  </label>
                  <label class="check">
                    <input type="radio" name="overlap" checked={draft.overlap === 'queue-one'} disabled={readonly} onChange={() => set({ overlap: 'queue-one' })} /> Queue one, run it when the other finishes
                  </label>
                  <label class="check">
                    <input type="radio" name="overlap" checked={draft.overlap === 'allow'} disabled={readonly} onChange={() => set({ overlap: 'allow' })} /> Run anyway, alongside it
                  </label>
                </div>
              </div>
            </div>
          ) : null}

          {draft.type === 'webhook' ? (
            <div class="when-body">
              <Field label="Path">
                <div class="field-line">
                  <span class="mono hint">/hooks/{backendId}/</span>
                  <input type="text" class="mono" aria-label="Hook path" placeholder="stripe-payments" value={draft.slug} disabled={readonly} onInput={(e) => set({ slug: (e.currentTarget as HTMLInputElement).value.trim(), slugTouched: true })} />
                </div>
              </Field>
              <div class="field">
                <span class="field-head">
                  <b>The URL to paste into the sender</b>
                </span>
                <div class="secret-box mono" data-webhook-url>
                  {url}
                </div>
                <Row style="margin-top:6px">
                  <Btn tiny onClick={() => copyText(url).then((ok) => toast(ok ? 'URL copied.' : 'The browser refused the clipboard.', ok ? 'ok' : 'bad'))}>
                    Copy the URL
                  </Btn>
                  {existing ? (
                    <WriteBtn tiny onClick={rotate} title="Make a new secret and show it once.">
                      Rotate the secret
                    </WriteBtn>
                  ) : null}
                </Row>
              </div>
              <div class="grid2">
                <div class="scope-group">
                  <div class="field-head">
                    <b>How the sender proves it is them</b>
                  </div>
                  <label class="check">
                    <input type="radio" name="scheme" checked={draft.scheme === 'hmac-sha256'} disabled={readonly} onChange={() => set({ scheme: 'hmac-sha256' })} /> Signature (GitHub, Stripe)
                  </label>
                  <Hint>An HMAC-SHA256 of the body in X-Hub-Signature-256, X-Signature-256 or X-Webhook-Signature. The secret never crosses the wire.</Hint>
                  <label class="check">
                    <input type="radio" name="scheme" checked={draft.scheme === 'token'} disabled={readonly} onChange={() => set({ scheme: 'token' })} /> Shared token
                  </label>
                  <Hint>The secret itself, in X-Webhook-Token, as a Bearer token, or as ?token=. For senders that cannot sign.</Hint>
                </div>
                <div class="scope-group">
                  <div class="field-head">
                    <b>Largest body accepted</b>
                  </div>
                  <select aria-label="Largest body accepted" value={String(draft.maxBodyBytes)} disabled={readonly} onChange={(e) => set({ maxBodyBytes: Number((e.currentTarget as HTMLSelectElement).value) })}>
                    {(BODY_SIZES.some((s) => s.bytes === draft.maxBodyBytes) ? BODY_SIZES : [{ bytes: draft.maxBodyBytes, label: sizeWords(draft.maxBodyBytes) + ' (as saved)' }, ...BODY_SIZES]).map((s) => (
                      <option key={s.bytes} value={String(s.bytes)}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <Hint>A bigger call is refused with 413 and recorded in Runs.</Hint>
                </div>
              </div>
              {existing ? <Hint>The secret was shown when the hook was made and is not kept in a readable form. If it is lost, rotate it.</Hint> : <Hint>The secret is made when you press Create and shown once.</Hint>}
            </div>
          ) : null}

          {draft.type === 'db-change' ? (
            <div class="when-body">
              <Field label="Collection">
                <CollectionPicker collections={collections} value={draft.collection} onChange={(collection) => set({ collection })} disabled={readonly} />
              </Field>
              <div class="field">
                <span class="field-head">
                  <b>When a record is</b>
                </span>
                <div class="field-line" id="change-actions">
                  {ACTION_WORDS.map((a) => (
                    <label key={a.id} class="check">
                      <input type="checkbox" value={a.id} checked={draft.actions.indexOf(a.id) !== -1} disabled={readonly} onChange={(e) => set({ actions: (e.currentTarget as HTMLInputElement).checked ? [...draft.actions, a.id] : draft.actions.filter((x) => x !== a.id) })} />
                      {a.label}
                    </label>
                  ))}
                </div>
                <Hint>The changed record is handed to the target as its body. Writes made by the target itself do not fire it again.</Hint>
              </div>
            </div>
          ) : null}
        </div>

        {/* 3. With */}
        {draft.type === 'schedule' ? (
          <div class="field">
            <span class="field-head">
              <b>With</b> <span class="hint">what each run receives</span>
            </span>
            <KeyValueEditor id="trigger-payload" rows={draft.payload} onChange={(payload) => set({ payload })} disabled={readonly} />
          </div>
        ) : null}

        {/* 4. Answer */}
        {draft.targetKind === 'workflow' ? (
          <div class="field">
            <span class="field-head">
              <b>Answer</b> <span class="hint">what a caller gets back</span>
            </span>
            <div class="scope-group">
              <label class="check">
                <input type="radio" name="answer" checked={!draft.sync} disabled={readonly} onChange={() => set({ sync: false })} /> The run’s id, straight away
              </label>
              <label class="check">
                <input type="radio" name="answer" checked={draft.sync} disabled={readonly} onChange={() => set({ sync: true })} /> The workflow’s output — wait up to
                <input type="number" min={1} max={MAX_WAIT_S} step={1} aria-label="Seconds to wait" class="sched-minute" value={String(draft.waitS)} disabled={readonly || !draft.sync} onInput={(e) => set({ waitS: Number((e.currentTarget as HTMLInputElement).value) })} />
                seconds
              </label>
              <Hint>Only a caller can be answered: a webhook, or Run now. A schedule has nobody to answer.</Hint>
            </div>
          </div>
        ) : null}
      </div>

      {error ? <Notice kind="bad" style="margin-top:12px">{error}</Notice> : problem && draft.type ? <Hint>{problem}</Hint> : null}

      {existing ? (
        <>
          <Gap h={18} />
          <DangerZone>
            <DangerAction label="Delete" why="It stops running and its record here is gone. Past runs stay in Runs." title="Delete trigger" warning={'"' + (existing.name || existing.id) + '" will not run again.' + (existing.type === 'webhook' ? ' Its URL stops answering and its secret is discarded.' : '')} expected={existing.name || existing.id} onConfirm={remove} />
          </DangerZone>
        </>
      ) : null}
    </Drawer>
  );
}

// ------------------------------------------------------------- pickers --

function FunctionPicker({ functions, value, onChange, disabled }: { functions: FunctionRow[] | null; value: string; onChange: (name: string) => void; disabled?: boolean }) {
  const served = functions || [];
  const known = served.find((f) => f.name === value);
  const picked: FunctionRow | null = value ? known || { name: value, deployed: false } : null;
  const fetchFns = (q: string): Promise<FunctionRow[]> => {
    const needle = q.trim().toLowerCase();
    return Promise.resolve(served.filter((f) => !needle || f.name.toLowerCase().indexOf(needle) !== -1));
  };
  return (
    <>
      <Picker<FunctionRow>
        fetch={fetchFns}
        label={(f) => f.name}
        detail={(f) => (f.deployed === false ? 'not deployed' : '')}
        keyOf={(f) => f.name}
        value={picked}
        onPick={(f) => onChange(f ? f.name : '')}
        onCreate={(q) => onChange(q)}
        createLabel={(q) => 'Use the name “' + q + '” (not deployed yet)'}
        placeholder={functions === null ? 'Loading functions…' : 'Type a function name…'}
        emptyText={served.length ? 'No function by that name.' : 'No functions are deployed yet. Type a name to use one that is coming.'}
        disabled={disabled}
      />
      {picked && picked.deployed === false ? (
        <Hint>
          <Chip kind="warn">not deployed</Chip> Nothing called {picked.name} is deployed on this backend. The trigger will fail until it is.
        </Hint>
      ) : null}
    </>
  );
}

function WorkflowPicker({ workflows, value, onChange, disabled }: { workflows: WorkflowRow[] | null; value: string; onChange: (id: string) => void; disabled?: boolean }) {
  const all = workflows || [];
  const label = (w: WorkflowRow) => (w.name ? String(w.name) : w.id);
  const picked = value ? all.find((w) => w.id === value) || { id: value } : null;
  const fetchWfs = (q: string): Promise<WorkflowRow[]> => {
    const needle = q.trim().toLowerCase();
    return Promise.resolve(all.filter((w) => !needle || label(w).toLowerCase().indexOf(needle) !== -1));
  };
  return <Picker<WorkflowRow> fetch={fetchWfs} label={label} keyOf={(w) => w.id} value={picked} onPick={(w) => onChange(w ? w.id : '')} placeholder={workflows === null ? 'Loading workflows…' : 'Type a workflow name…'} emptyText={all.length ? 'No workflow by that name.' : 'No workflows yet. Author one in the editor and it appears here.'} disabled={disabled} />;
}

function CollectionPicker({ collections, value, onChange, disabled }: { collections: string[] | null; value: string; onChange: (name: string) => void; disabled?: boolean }) {
  const all = collections || [];
  const fetchCols = (q: string): Promise<string[]> => {
    const needle = q.trim().toLowerCase();
    return Promise.resolve(all.filter((c) => !needle || c.toLowerCase().indexOf(needle) !== -1));
  };
  return <Picker<string> fetch={fetchCols} label={(c) => c} keyOf={(c) => c} value={value || null} onPick={(c) => onChange(c || '')} placeholder={collections === null ? 'Loading collections…' : 'Type a collection name…'} emptyText={all.length ? 'No collection by that name.' : 'No collections yet.'} disabled={disabled} />;
}

// -------------------------------------------------------- the secret card --

export function WebhookSecretCard({ secret, note, url, scheme }: { secret: string; note?: string; url: string; scheme: WebhookScheme }) {
  const [copied, setCopied] = useState(false);
  const example = webhookExample(url, scheme, secret);
  function copy(text: string, what: string) {
    copyText(text).then((ok) => {
      if (ok) {
        setCopied(true);
        toast(what + ' copied.', 'ok');
        setTimeout(() => setCopied(false), 2500);
      } else {
        toast('The browser refused the clipboard. Select it and copy by hand.', 'bad');
      }
    });
  }
  return (
    <div class="secret-card">
      <Notice kind="warn">{note || 'Store this now — it is not recoverable.'} Paste it into the sender beside the URL.</Notice>
      <Gap h={10} />
      <div class="field">
        <span class="field-head">
          <b>URL</b>
        </span>
        <div class="secret-box mono" data-webhook-url>
          {url}
        </div>
        <Row style="margin-top:6px">
          <Btn tiny onClick={() => copy(url, 'URL')}>
            Copy the URL
          </Btn>
        </Row>
      </div>
      <Gap h={10} />
      <div class="field">
        <span class="field-head">
          <b>Secret</b>
        </span>
        <div class="secret-box mono" data-secret>
          {secret}
        </div>
        <Row style="margin-top:6px">
          <Btn kind="primary" onClick={() => copy(secret, 'Secret')}>
            {copied ? 'Copied ✓' : 'Copy secret'}
          </Btn>
          <Hint>{scheme === 'token' ? 'The sender puts it in X-Webhook-Token.' : 'The sender signs each body with it (HMAC-SHA256) and sends the signature in X-Hub-Signature-256.'}</Hint>
        </Row>
      </div>
      <Gap h={10} />
      <div class="field">
        <span class="field-head">
          <b>Try it</b>
        </span>
        <pre class="secret-box mono" data-example>
          {example}
        </pre>
        <Row style="margin-top:6px">
          <Btn tiny onClick={() => copy(example, 'Command')}>
            Copy the command
          </Btn>
        </Row>
      </div>
    </div>
  );
}
