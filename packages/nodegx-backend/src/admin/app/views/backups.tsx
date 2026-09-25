/**
 * Backups — when they happen, how many are kept, the archives, and a restore
 * (BMG-011 §3.2, R4: restore is a button in the browser, behind typing the
 * backend's name, with *back up first* ticked by default).
 *
 * The schedule is the `ScheduleBuilder` (no cron text, AC9). An archive is
 * downloaded through `GET /admin/backups/archive?file=` with the credential
 * (an `<a href>` cannot send one). While a restore runs, every control on the
 * page is blocked: the server swaps the database it is serving (§5).
 *
 * BMG-015: *Where archives go* — this machine (a folder), or the bucket the
 * Storage page is connected to. The bucket tile is only live once a bucket is
 * connected there (the list answers `bucket`), because the two share one set
 * of details; there is nothing to type here.
 */
import { useEffect, useState } from 'preact/hooks';

import { api, credentialHeaders, encode, session, useSession } from '../api';
import { EmptyState, ScheduleBuilder, SchedulePreview } from '../composers';
import { bytes, cellText, when } from '../format';
import { ActionCell, Btn, Card, Check, Chip, Dialog, Field, Gap, Notice, Page, Row, Spacer, Sub, Switch, Table, WriteBtn, fail, openModal, toast } from '../ui';
import type { ViewProps } from './index';

interface BackupResult {
  ok?: boolean;
  at?: string;
  archive?: string;
  bytes?: number;
  error?: string;
}

interface BackupStatus {
  lastRunAt?: string | null;
  lastResult?: BackupResult | null;
  nextRunAt?: string | null;
  lastSuccessAt?: string | null;
}

export interface Archive {
  file: string;
  path: string;
  bytes: number;
  createdAt: string | null;
  where?: 'local' | 's3';
}

interface BackupsConfig {
  schedule?: { enabled?: boolean; cron?: string; missedFirePolicy?: string } | null;
  retention?: { keepLast?: number; keepDaily?: number; keepWeekly?: number };
  destination?: { type?: string; path?: string; prefix?: string };
  includeSecrets?: boolean;
  status?: BackupStatus;
}

export interface BucketState {
  connected: boolean;
  name: string | null;
}

interface BackupsData {
  config?: BackupsConfig;
  backups?: Archive[];
  bucket?: BucketState;
  listingError?: string;
}

/** The sentence under the archives: where they live. */
export function whereWords(destination: BackupsConfig['destination'], bucket: BucketState | undefined): string {
  const d = destination || {};
  if (d.type === 's3') return 'Archives live in the bucket "' + ((bucket && bucket.name) || '?') + '" under ' + (d.prefix || 'backups/') + '.';
  return 'Archives live in ' + cellText(d.path) + '.';
}

const DEFAULT_CRON = '0 3 * * *';

const previewCron = (cron: string): Promise<SchedulePreview> => api<SchedulePreview>('POST', '/admin/triggers/preview', { cron, count: 5 });

/** The sentence under *Keep* for a retention policy. */
export function keepWords(r: { keepLast?: number; keepDaily?: number; keepWeekly?: number }): string {
  const parts: string[] = [];
  const last = r.keepLast || 0;
  const daily = r.keepDaily || 0;
  const weekly = r.keepWeekly || 0;
  if (last) parts.push('the last ' + last);
  if (daily) parts.push('one a day for ' + daily + ' day' + (daily === 1 ? '' : 's'));
  if (weekly) parts.push('one a week for ' + weekly + ' week' + (weekly === 1 ? '' : 's'));
  if (!parts.length) return 'Nothing is kept: every backup is deleted by the next one.';
  return 'Keeps ' + parts.join(', and ') + '.';
}

export function BackupsView(_props: ViewProps) {
  const { readonly, whoami } = useSession();
  const [data, setData] = useState<BackupsData | null>(null);
  const [generation, setGeneration] = useState(0);
  const [restoring, setRestoring] = useState<string | null>(null);
  const backendName = (whoami && whoami.backend && whoami.backend.name) || '';

  function load() {
    api<BackupsData>('GET', '/admin/backups')
      .then((d) => {
        setData(d);
        setGeneration((g) => g + 1);
      })
      .catch(fail);
  }
  useEffect(() => {
    load();
  }, []);

  function backUpNow() {
    toast('Backing up…');
    api<{ archive?: string; bytes?: number }>('POST', '/admin/backups', {})
      .then((result) => {
        toast('Backup written' + (result.bytes ? ' (' + bytes(result.bytes) + ')' : '') + '.', 'ok');
        load();
      })
      .catch(fail);
  }

  function download(a: Archive) {
    fetch('/admin/backups/archive?file=' + encode(a.file), { headers: credentialHeaders(session.get().credential) })
      .then(async (res) => {
        if (!res.ok) {
          const json = await res.json().catch(() => null);
          throw new Error((json && json.error) || 'HTTP ' + res.status);
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = a.file;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
      })
      .catch(fail);
  }

  function restore(a: Archive, backUpFirst: boolean) {
    setRestoring(a.file);
    api<{ ok: boolean; safetyArchive?: string | null; reconnected?: boolean }>('POST', '/admin/backups/restore', { archive: a.file, safetySnapshot: backUpFirst })
      .then((r) => {
        toast('Restored ' + a.file + (r.safetyArchive ? ' — the data from before is in ' + r.safetyArchive.split('/').pop() + '.' : '.'), 'ok');
      })
      .catch(fail)
      .then(() => {
        setRestoring(null);
        load();
      });
  }

  function askRestore(a: Archive) {
    openModal((close) => <RestoreDialog archive={a} backendName={backendName} close={close} onConfirm={(backUpFirst) => restore(a, backUpFirst)} />);
  }

  const config = (data && data.config) || {};
  const status: BackupStatus = config.status || {};
  const archives = (data && data.backups) || [];
  const bucket = data ? data.bucket : undefined;
  const blocked = !!restoring;

  return (
    <Page title="Backups" subtitle="When backups happen, how many are kept, and a restore when you must.">
      {restoring ? (
        <Notice kind="warn">
          <b>Restoring {restoring}…</b> The backend is swapping its database. Nothing on this page works until it answers.
        </Notice>
      ) : null}
      {data ? (
        <div class={blocked ? 'blocked' : ''} aria-busy={blocked ? 'true' : 'false'}>
          <Card>
            <Row>
              {config.schedule && config.schedule.enabled ? <Chip kind="ok">scheduled</Chip> : <Chip kind="warn">not scheduled</Chip>}
              {status.lastSuccessAt ? <Chip kind="ok">{'last backup ' + when(status.lastSuccessAt)}</Chip> : <Chip kind="warn">never backed up</Chip>}
              {status.lastResult && status.lastResult.ok === false ? (
                <Chip kind="bad" title={cellText(status.lastResult.error)}>
                  {'last attempt failed ' + when(status.lastResult.at)}
                </Chip>
              ) : null}
              {status.nextRunAt ? <Chip>{'next ' + when(status.nextRunAt)}</Chip> : null}
              <Spacer />
              <WriteBtn tiny kind="primary" id="backup-now" disabled={blocked} onClick={backUpNow}>
                Back up now
              </WriteBtn>
            </Row>
          </Card>
          <h2>When</h2>
          <ScheduleCard key={'when' + generation} config={config} reload={load} blocked={blocked} />
          <h2>Keep</h2>
          <KeepCard key={'keep' + generation} config={config} reload={load} blocked={blocked} />
          <h2>Where archives go</h2>
          <WhereCard key={'where' + generation} config={config} bucket={bucket} reload={load} blocked={blocked} />
          <h2>Archives</h2>
          {data && data.listingError ? (
            <Notice kind="bad">
              <b>The archives could not be listed.</b> {data.listingError}
            </Notice>
          ) : null}
          <Table
            columns={['Archive', 'Taken', 'Size', '']}
            rows={archives}
            renderRow={(a) => (
              <tr key={a.file} data-archive={a.file}>
                <td>
                  <b>{a.file}</b>
                  {a.where === 's3' ? <Chip>in the bucket</Chip> : null}
                </td>
                <td>{when(a.createdAt)}</td>
                <td>{bytes(a.bytes)}</td>
                <ActionCell>
                  <Btn tiny disabled={blocked} onClick={() => download(a)}>
                    Download
                  </Btn>
                  <WriteBtn tiny kind="danger" disabled={blocked || readonly} onClick={() => askRestore(a)}>
                    Restore…
                  </WriteBtn>
                </ActionCell>
              </tr>
            )}
            empty={<EmptyState action={{ label: 'Back up now', onClick: backUpNow }}>No backups yet.</EmptyState>}
          />
          <Sub style="margin-top:10px">
            {whereWords(config.destination, bucket) + ' A restore replaces everything in the backend with the archive; with '}
            <i>Back up first</i>
            {' ticked, what is there now is archived before it goes.'}
          </Sub>
        </div>
      ) : null}
    </Page>
  );
}

// ------------------------------------------------------------------ when --

function ScheduleCard({ config, reload, blocked }: { config: BackupsConfig; reload: () => void; blocked: boolean }) {
  const { readonly } = useSession();
  const s = config.schedule || null;
  const [enabled, setEnabled] = useState(!!(s && s.enabled));
  const [cron, setCron] = useState((s && s.cron) || DEFAULT_CRON);
  const [missed, setMissed] = useState<'skip' | 'run-once-on-start'>(s && s.missedFirePolicy === 'run-once-on-start' ? 'run-once-on-start' : 'skip');
  const off = readonly || blocked;

  function save() {
    api('PUT', '/admin/backups/config', { schedule: enabled ? { enabled: true, cron: cron.trim(), missedFirePolicy: missed } : null })
      .then(() => {
        toast(enabled ? 'Backup schedule saved.' : 'Backups are no longer scheduled.', 'ok');
        reload();
      })
      .catch(fail);
  }

  return (
    <Card>
      <Switch id="backup-enabled" checked={enabled} onChange={setEnabled} disabled={off}>
        Back up on a schedule
      </Switch>
      {enabled ? (
        <div class="when-body" id="backup-schedule">
          <ScheduleBuilder id="backup-cron" value={cron} onChange={setCron} preview={previewCron} disabled={off} />
          <Gap h={10} />
          <div class="scope-group">
            <div class="field-head">
              <b>If a backup is missed while the backend is off</b>
            </div>
            <label class="check">
              <input type="radio" name="backup-missed" checked={missed === 'skip'} disabled={off} onChange={() => setMissed('skip')} /> Skip it — carry on from the next time
            </label>
            <label class="check">
              <input type="radio" name="backup-missed" checked={missed === 'run-once-on-start'} disabled={off} onChange={() => setMissed('run-once-on-start')} /> Run it once, as soon as the backend is back
            </label>
          </div>
        </div>
      ) : null}
      <Row style="margin-top:12px">
        <WriteBtn tiny kind="primary" id="save-schedule" disabled={blocked} onClick={save}>
          Save schedule
        </WriteBtn>
      </Row>
    </Card>
  );
}

// ------------------------------------------------------------------ keep --

function KeepCard({ config, reload, blocked }: { config: BackupsConfig; reload: () => void; blocked: boolean }) {
  const { readonly } = useSession();
  const r = config.retention || {};
  const [keepLast, setKeepLast] = useState(String(r.keepLast ?? 7));
  const [keepDaily, setKeepDaily] = useState(String(r.keepDaily ?? 0));
  const [keepWeekly, setKeepWeekly] = useState(String(r.keepWeekly ?? 0));
  const [secrets, setSecrets] = useState(!!config.includeSecrets);
  const off = readonly || blocked;
  const n = (v: string) => Math.max(0, Math.floor(Number(v) || 0));

  function save() {
    api('PUT', '/admin/backups/config', {
      retention: { keepLast: n(keepLast), keepDaily: n(keepDaily), keepWeekly: n(keepWeekly) },
      includeSecrets: secrets
    })
      .then(() => {
        toast('Backup settings saved.', 'ok');
        reload();
      })
      .catch(fail);
  }

  return (
    <Card>
      <div class="grid2">
        <Field label="Keep the last">
          <input type="number" min="0" id="keep-last" value={keepLast} disabled={off} onInput={(e) => setKeepLast((e.currentTarget as HTMLInputElement).value)} />
        </Field>
        <Field label="and one a day for (days)">
          <input type="number" min="0" id="keep-daily" value={keepDaily} disabled={off} onInput={(e) => setKeepDaily((e.currentTarget as HTMLInputElement).value)} />
        </Field>
        <Field label="and one a week for (weeks)">
          <input type="number" min="0" id="keep-weekly" value={keepWeekly} disabled={off} onInput={(e) => setKeepWeekly((e.currentTarget as HTMLInputElement).value)} />
        </Field>
      </div>
      <div class="sub" id="keep-words">{keepWords({ keepLast: n(keepLast), keepDaily: n(keepDaily), keepWeekly: n(keepWeekly) })}</div>
      <Gap />
      <Switch id="include-secrets" checked={secrets} onChange={setSecrets} disabled={off}>
        Include this machine's secrets in each archive
      </Switch>
      <Sub>Off by default: an archive with secrets in it is a credential. Turn it on only where the archives are kept as safely as the backend.</Sub>
      <Row style="margin-top:12px">
        <WriteBtn tiny kind="primary" id="save-keep" disabled={blocked} onClick={save}>
          Save
        </WriteBtn>
      </Row>
    </Card>
  );
}

// ----------------------------------------------------------------- where --

/** Where archives go: a folder on this machine, or the bucket from the Storage page (BMG-015). */
function WhereCard({ config, bucket, reload, blocked }: { config: BackupsConfig; bucket: BucketState | undefined; reload: () => void; blocked: boolean }) {
  const { readonly } = useSession();
  const d = config.destination || {};
  const [where, setWhere] = useState<'local' | 's3'>(d.type === 's3' ? 's3' : 'local');
  const [dest, setDest] = useState(cellText(d.path));
  const off = readonly || blocked;
  const connected = !!(bucket && bucket.connected);

  function save() {
    api('PUT', '/admin/backups/config', { destination: where === 's3' ? { type: 's3' } : { type: 'local', path: dest.trim() } })
      .then(() => {
        toast(where === 's3' ? 'Backups go to the bucket "' + ((bucket && bucket.name) || '') + '".' : 'Backups are written to ' + dest.trim() + '.', 'ok');
        reload();
      })
      .catch(fail);
  }

  return (
    <Card id="backup-where">
      <div class="tiles" role="radiogroup" aria-label="Where archives go">
        <label class={'tile' + (where === 'local' ? ' on' : '')}>
          <input type="radio" name="backup-where" value="local" checked={where === 'local'} disabled={off} onChange={() => setWhere('local')} />
          <b>This machine</b>
          <span class="sub">A folder beside the backend's data. An archive here is lost with the machine.</span>
        </label>
        <label class={'tile' + (where === 's3' ? ' on' : '') + (connected ? '' : ' disabled')} title={connected ? undefined : 'Connect a bucket on the Storage page first.'}>
          <input type="radio" name="backup-where" value="s3" checked={where === 's3'} disabled={off || !connected} onChange={() => setWhere('s3')} />
          <b>The bucket from the Storage page</b>
          <span class="sub">{connected ? 'Archives go to "' + bucket!.name + '" under ' + (d.prefix || 'backups/') + '. Nothing to type: the bucket is set up once, on the Storage page.' : 'Connect a bucket on the Storage page first; backups use the same one.'}</span>
        </label>
      </div>
      {where === 'local' ? (
        <Field label="Folder on the backend's machine" style="margin-top:8px">
          <input type="text" id="backup-dest" value={dest} disabled={off} onInput={(e) => setDest((e.currentTarget as HTMLInputElement).value)} />
        </Field>
      ) : null}
      <Row style="margin-top:12px">
        <WriteBtn tiny kind="primary" id="save-where" disabled={blocked} onClick={save}>
          Save
        </WriteBtn>
      </Row>
    </Card>
  );
}

// --------------------------------------------------------------- restore --

function RestoreDialog({ archive, backendName, close, onConfirm }: { archive: Archive; backendName: string; close: () => void; onConfirm: (backUpFirst: boolean) => void }) {
  const [typed, setTyped] = useState('');
  const [backUpFirst, setBackUpFirst] = useState(true);
  const expected = backendName || 'restore';
  const ready = typed === expected;
  return (
    <Dialog
      title={'Restore ' + archive.file + '?'}
      actions={
        <>
          <Btn onClick={close}>Cancel</Btn>
          <Btn
            kind="danger"
            id="restore-confirm"
            disabled={!ready}
            onClick={() => {
              if (!ready) return;
              close();
              onConfirm(backUpFirst);
            }}
          >
            Restore
          </Btn>
        </>
      }
    >
      <div class="notice bad">
        {'Everything written since ' + (archive.createdAt ? when(archive.createdAt) : 'this archive was taken') + ' — records, files, settings — is replaced by what the archive holds. Apps using this backend see the older data at once.'}
      </div>
      <Gap h={8} />
      <Check checked={backUpFirst} onChange={setBackUpFirst}>
        Back up first — archive what is there now, so this can be undone
      </Check>
      <p class="sub">{'Type "' + expected + '" to confirm.'}</p>
      <input type="text" id="restore-typed" placeholder={expected} aria-label={'Type ' + expected + ' to confirm'} style="width:100%;margin-top:8px" value={typed} onInput={(e) => setTyped((e.target as HTMLInputElement).value)} />
    </Dialog>
  );
}
