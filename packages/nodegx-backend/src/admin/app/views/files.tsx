/**
 * Storage — the files an app has stored, which kinds are allowed, how they
 * are thumbnailed, and the clean-up (BMG-011 §3.1).
 *
 * The browser reads `GET /admin/files` (never `/api/_Files`); *used by* is
 * one `GET /admin/files/uses` for the rows shown. A delete refuses by name
 * while a record points at the file, and offers to clear those fields.
 * Refused kinds are categories in the SNIFFER's vocabulary (`fileKinds.ts`)
 * plus custom chips; the clean-up schedule is the `ScheduleBuilder`. No
 * comma list and no cron text on this page (AC9).
 *
 * BMG-015: *Where files are stored* — two tiles, this machine or an
 * S3-compatible bucket. The bucket's details are typed once here (the backups
 * share them); **Test connection** asks `POST /admin/files/config/test` with
 * the unsaved draft and *Save* stays disabled until the draft has tested OK
 * (the server probes again on save and refuses with the endpoint's sentence,
 * so the page cannot be the only guard). The key is write-only: the page
 * shows *configured* / *not configured* from a boolean, never the value.
 */
import { useEffect, useRef, useState } from 'preact/hooks';

import { ApiError, api, credentialHeaders, encode, session, useSession } from '../api';
import { Chips, EmptyState, ListEditor, ScheduleBuilder, SchedulePreview } from '../composers';
import { FILE_KINDS, RefusedKinds, denyListFrom, kindsFrom, mimeProblem, sniffable } from '../fileKinds';
import { bytes, cellText, fileLabel, when } from '../format';
import { href } from '../router';
import { ActionCell, Btn, Card, Chip, Dialog, Field, Gap, Hint, Page, Row, Spacer, Sub, Switch, Table, WriteBtn, confirmSimple, fail, openModal, toast } from '../ui';
import type { ViewProps } from './index';

interface SweepReport {
  at?: unknown;
  error?: unknown;
  orphanBlobs: unknown[];
  orphanRows: unknown[];
  /** BMG-017: files with no record yet that are younger than the grace window — never judged. */
  tooNew?: unknown[];
  graceMinutes?: number;
  deleted?: boolean;
}

function plural(n: number, one: string, many: string): string {
  return n + ' ' + (n === 1 ? one : many);
}

/**
 * What *Check now* found, in one sentence. BMG-017: a file younger than the
 * grace window may be an upload or a move still writing its record, so it is
 * counted apart and never deleted — the sentence says so rather than letting
 * a person wonder why a file they saw was left.
 */
export function sweepWords(r: SweepReport): string {
  const tooNew = (r.tooNew || []).length;
  return (
    'Done: ' +
    plural(r.orphanBlobs.length, 'file', 'files') +
    ' no record knows about, ' +
    plural(r.orphanRows.length, 'record', 'records') +
    ' whose file is missing' +
    (r.deleted && r.orphanBlobs.length ? ' — the unknown files were deleted' : '') +
    (tooNew ? '; ' + plural(tooNew, 'file is', 'files are') + ' too new to judge — under ' + (r.graceMinutes || 5) + ' minutes old and perhaps still arriving — so ' + (tooNew === 1 ? 'it was' : 'they were') + ' left alone' : '') +
    '.'
  );
}

interface Preset {
  width: number;
  height: number;
  fit: string;
}

interface DriverConfig {
  type?: string;
  endpoint?: string;
  region?: string;
  bucket?: string;
  forcePathStyle?: boolean;
}

interface FilesConfig {
  maxUploadBytes?: number;
  driver?: DriverConfig;
  contentTypes?: { denyList?: string[]; allowList?: string[] | null };
  signedUrlTtlSeconds?: number;
  thumbnails?: { presets?: Record<string, Preset> };
  orphanSweep?: { enabled?: boolean; cron?: string };
  sweepStatus?: { lastReport?: SweepReport | null; nextRunAt?: string | null };
}

interface FilesData {
  driverKind?: string;
  s3CredentialsConfigured?: boolean;
  transformsAvailable?: boolean;
  transformUnavailableReason?: string;
  config?: FilesConfig;
}

export interface FileRow {
  name: string;
  originalName: string;
  size: number;
  contentType: string;
  createdAt: string;
  owner: string | null;
  private: boolean;
  objectId: string;
}

export interface FileUse {
  collection: string;
  objectId: string;
  field: string;
}

const PAGE = 50;

/** The path and query of a URL the backend wrote on its own loopback address. */
function samePath(url: string): string {
  try {
    const u = new URL(url, location.href);
    return u.pathname + u.search;
  } catch {
    return url;
  }
}

export function isImage(contentType: string): boolean {
  return /^image\//.test(contentType);
}

const previewCron = (cron: string): Promise<SchedulePreview> => api<SchedulePreview>('POST', '/admin/triggers/preview', { cron, count: 5 });

export function FilesView(_props: ViewProps) {
  const [data, setData] = useState<FilesData | null>(null);
  const [generation, setGeneration] = useState(0);

  function loadConfig() {
    api<FilesData>('GET', '/admin/files/config')
      .then((d) => {
        setData(d);
        setGeneration((g) => g + 1);
      })
      .catch(fail);
  }
  useEffect(() => {
    loadConfig();
  }, []);

  const config = (data && data.config) || {};
  const presets = (config.thumbnails && config.thumbnails.presets) || {};

  return (
    <Page title="Storage" subtitle="The files your app has stored, which kinds are allowed, how they are thumbnailed, and the clean-up.">
      {data ? (
        <div>
          <Row>
            <Chip kind="accent">{'stored ' + (data.driverKind === 's3' ? 'in S3' : 'on this machine')}</Chip>
            {data.transformsAvailable ? (
              <Chip kind="ok">thumbnails available</Chip>
            ) : (
              <Chip kind="warn" title={cellText(data.transformUnavailableReason)}>
                thumbnails unavailable on this backend
              </Chip>
            )}
          </Row>
          <Gap />
          <Browser presets={presets} transforms={!!data.transformsAvailable} />
          <h2>Where files are stored</h2>
          <WhereCard key={'where' + generation} config={config} credentialsConfigured={!!data.s3CredentialsConfigured} reload={loadConfig} />
          {data.driverKind === 's3' ? <MoveCard key={'move' + generation} /> : null}
          <h2>Settings</h2>
          <LimitsCard key={'limits' + generation} config={config} reload={loadConfig} />
          <h2>Thumbnail presets</h2>
          <PresetsCard key={'presets' + generation} presets={presets} reload={loadConfig} />
          <h2>Clean-up</h2>
          <SweepCard key={'sweep' + generation} config={config} reload={loadConfig} />
        </div>
      ) : null}
    </Page>
  );
}

// ----------------------------------------------------------- the browser --

function Browser({ presets, transforms }: { presets: Record<string, Preset>; transforms: boolean }) {
  const { readonly } = useSession();
  const [rows, setRows] = useState<FileRow[] | null>(null);
  const [count, setCount] = useState(0);
  const [offset, setOffset] = useState(0);
  const [q, setQ] = useState('');
  const [uses, setUses] = useState<Record<string, FileUse[]>>({});
  const [signed, setSigned] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const thumbPreset = presets.sm ? 'sm' : Object.keys(presets)[0] || '';

  function load() {
    api<{ files: FileRow[]; count: number }>('GET', '/admin/files?limit=' + PAGE + '&offset=' + offset + (q ? '&q=' + encode(q) : ''))
      .then((d) => {
        setRows(d.files);
        setCount(d.count);
        const names = d.files.map((f) => f.name);
        if (names.length) {
          api<{ uses: Record<string, FileUse[]> }>('GET', '/admin/files/uses?names=' + encode(names.join(',')))
            .then((u) => setUses((prev) => ({ ...prev, ...u.uses })))
            .catch(fail);
        }
        // An <img> cannot send the credential: a short-lived signed URL per image row.
        for (const f of d.files) {
          if (!isImage(f.contentType) || signed[f.name]) continue;
          api<{ url: string }>('GET', '/files/' + encode(f.name) + '/sign')
            .then((s) => setSigned((prev) => ({ ...prev, [f.name]: samePath(s.url) })))
            .catch(() => undefined);
        }
      })
      .catch(fail);
  }
  useEffect(load, [offset, q]);

  const upload = async (file: File) => {
    setBusy(true);
    setProblem(null);
    try {
      const headers: Record<string, string> = { ...credentialHeaders(session.get().credential), 'content-type': file.type || 'application/octet-stream' };
      const res = await fetch('/files/' + encode(file.name), { method: 'POST', headers, body: file });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error((json && (json.error || json.message)) || 'HTTP ' + res.status);
      toast('Uploaded ' + file.name + '.', 'ok');
      setOffset(0);
      load();
    } catch (e) {
      setProblem((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const pick = (files: FileList | null) => {
    if (!files) return;
    for (let i = 0; i < files.length; i++) upload(files[i]);
  };

  function remove(f: FileRow, clear: boolean) {
    api('DELETE', '/admin/files/' + encode(f.name) + (clear ? '?clear=1' : ''))
      .then(() => {
        toast('Deleted ' + f.originalName + (clear ? ' and cleared its fields.' : '.'), 'ok');
        load();
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 409) {
          const used = uses[f.name] || [];
          openModal((close) => (
            <Dialog
              title={'"' + f.originalName + '" is in use'}
              autoFocus={false}
              actions={
                <>
                  <Btn onClick={close}>Keep it</Btn>
                  <WriteBtn
                    kind="danger"
                    onClick={() => {
                      close();
                      remove(f, true);
                    }}
                  >
                    {'Delete anyway and clear ' + used.length + ' field' + (used.length === 1 ? '' : 's')}
                  </WriteBtn>
                </>
              }
            >
              <div class="notice warn">{e.message}</div>
              <ul class="uses-list">
                {used.map((u) => (
                  <li key={u.collection + u.objectId + u.field}>
                    <a href={href('collections', u.collection, u.objectId)}>{u.collection + ' · ' + u.objectId}</a>
                    <span class="hint">{' in ' + u.field}</span>
                  </li>
                ))}
              </ul>
            </Dialog>
          ));
          return;
        }
        fail(e);
      });
  }

  const from = count ? offset + 1 : 0;
  const to = Math.min(offset + PAGE, count);

  return (
    <Card>
      <div
        id="file-dropzone"
        class={'dropzone' + (over ? ' over' : '')}
        role="button"
        tabIndex={0}
        aria-label="Upload files"
        onClick={() => !readonly && input.current && input.current.click()}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && input.current) {
            e.preventDefault();
            input.current.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          if (!readonly) pick(e.dataTransfer ? e.dataTransfer.files : null);
        }}
      >
        <input ref={input} type="file" multiple hidden disabled={readonly} onChange={(e) => pick((e.currentTarget as HTMLInputElement).files)} />
        {busy ? 'Uploading…' : readonly ? 'Uploads need full backend access.' : 'Drop files here, or click to choose'}
        {problem ? <span class="chips-problem">{problem}</span> : null}
      </div>
      <Gap />
      <Row>
        <input type="search" id="files-search" placeholder="Find by name" value={q} onInput={(e) => { setQ((e.currentTarget as HTMLInputElement).value); setOffset(0); }} style="flex:1 1 200px" />
        <span class="hint" id="files-count">
          {count ? 'Showing ' + from + '–' + to + ' of ' + count : rows ? 'No files' : ''}
        </span>
        <Btn tiny disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>
          ‹ Newer
        </Btn>
        <Btn tiny disabled={to >= count} onClick={() => setOffset(offset + PAGE)}>
          Older ›
        </Btn>
      </Row>
      <Gap />
      {rows ? (
        <Table
          class="files"
          columns={['', 'File', 'Size', 'Kind', 'Uploaded', 'Used by', '']}
          rows={rows}
          renderRow={(f) => {
            const used = uses[f.name];
            const url = signed[f.name];
            return (
              <tr key={f.name} data-file={f.name}>
                <td class="thumb-cell">
                  {isImage(f.contentType) && url && transforms && thumbPreset ? (
                    <img class="file-thumb" src={url + '&thumb=' + encode(thumbPreset)} alt="" onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')} />
                  ) : (
                    <span class="file-icon" aria-hidden="true">
                      ▤
                    </span>
                  )}
                </td>
                <td>
                  <b>{f.originalName || fileLabel(f.name)}</b>
                  {f.private ? <Chip kind="warn">private</Chip> : null}
                </td>
                <td>{bytes(f.size)}</td>
                <td>
                  <span class="chip type">{f.contentType}</span>
                </td>
                <td>{when(f.createdAt)}</td>
                <td class="uses-cell">
                  {used === undefined ? (
                    <span class="hint">…</span>
                  ) : used.length === 0 ? (
                    <span class="hint">nothing</span>
                  ) : (
                    used.slice(0, 3).map((u, i) => (
                      <span key={i}>
                        {i ? ', ' : ''}
                        <a href={href('collections', u.collection, u.objectId)} title={u.field}>
                          {u.collection + ' · ' + u.objectId.slice(0, 8)}
                        </a>
                      </span>
                    ))
                  )}
                  {used && used.length > 3 ? <span class="hint">{' +' + (used.length - 3) + ' more'}</span> : null}
                </td>
                <ActionCell>
                  <a class="btn tiny" href={url || '/files/' + encode(f.name)} download={f.originalName || fileLabel(f.name)} target="_blank" rel="noopener" onClick={(e) => {
                    if (url) return;
                    e.preventDefault();
                    api<{ url: string }>('GET', '/files/' + encode(f.name) + '/sign')
                      .then((s) => {
                        const a = document.createElement('a');
                        a.href = samePath(s.url);
                        a.download = f.originalName || fileLabel(f.name);
                        a.rel = 'noopener';
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                      })
                      .catch(fail);
                  }}>
                    Download
                  </a>
                  <WriteBtn tiny kind="danger" onClick={() => confirmSimple('Delete ' + (f.originalName || fileLabel(f.name)) + '?', used && used.length ? 'It is used by ' + used.length + ' record' + (used.length === 1 ? '' : 's') + '; the delete will ask before clearing them.' : 'No record points at it. The file is gone for good.', () => remove(f, false))}>
                    Delete
                  </WriteBtn>
                </ActionCell>
              </tr>
            );
          }}
          empty={q ? <EmptyState>No file is called that.</EmptyState> : <EmptyState>Nothing stored yet. Drop a file above, or let your app upload one.</EmptyState>}
        />
      ) : null}
    </Card>
  );
}

// ----------------------------------------------------------------- where --

/** The draft of the bucket card, as the page holds it. */
export interface WhereDraft {
  where: 'local' | 's3';
  endpoint: string;
  region: string;
  bucket: string;
  pathStyle: boolean;
  accessKeyId: string;
  secretAccessKey: string;
}

export function whereDraftFrom(config: FilesConfig): WhereDraft {
  const d = config.driver || {};
  return {
    where: d.type === 's3' ? 's3' : 'local',
    endpoint: d.endpoint || '',
    region: d.region || 'us-east-1',
    bucket: d.bucket || '',
    pathStyle: d.forcePathStyle !== false,
    accessKeyId: '',
    secretAccessKey: ''
  };
}

/** A sentence when the bucket draft cannot be tested or saved; null when it can. */
export function whereProblem(d: WhereDraft, credentialsConfigured: boolean): string | null {
  if (d.where !== 's3') return null;
  if (!d.endpoint.trim()) return 'The bucket needs an endpoint (the address of the S3-compatible service).';
  if (!/^https?:\/\//.test(d.endpoint.trim())) return 'The endpoint starts with https:// (or http:// for a service on this network).';
  if (!d.bucket.trim()) return 'The bucket needs a name.';
  const typedOne = !!d.accessKeyId || !!d.secretAccessKey;
  if (typedOne && (!d.accessKeyId || !d.secretAccessKey)) return 'Type both the access key id and the secret access key.';
  if (!typedOne && !credentialsConfigured) return 'The bucket needs an access key id and a secret access key.';
  return null;
}

/** What the page sends for a draft, to test and to save. Blank credentials mean "keep the stored ones". */
export function wherePayload(d: WhereDraft): Record<string, unknown> {
  if (d.where !== 's3') return { driver: { type: 'local' } };
  const body: Record<string, unknown> = {
    driver: { type: 's3', endpoint: d.endpoint.trim(), region: d.region.trim() || 'us-east-1', bucket: d.bucket.trim(), forcePathStyle: d.pathStyle }
  };
  if (d.accessKeyId && d.secretAccessKey) body.s3Credentials = { accessKeyId: d.accessKeyId, secretAccessKey: d.secretAccessKey };
  return body;
}

/** Where files are stored: this machine, or an S3-compatible bucket (BMG-015). */
function WhereCard({ config, credentialsConfigured, reload }: { config: FilesConfig; credentialsConfigured: boolean; reload: () => void }) {
  const { readonly } = useSession();
  const [draft, setDraft] = useState<WhereDraft>(whereDraftFrom(config));
  const [tested, setTested] = useState<{ ok: boolean; words: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const problem = whereProblem(draft, credentialsConfigured);
  const set = (patch: Partial<WhereDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setTested(null);
  };
  const canSave = draft.where === 'local' || (!!tested && tested.ok);

  function test() {
    if (problem) {
      fail(new Error(problem));
      return;
    }
    setTesting(true);
    api<{ ok: boolean; words: string }>('POST', '/admin/files/config/test', wherePayload(draft))
      .then((r) => setTested({ ok: !!r.ok, words: r.words }))
      .catch((e) => setTested({ ok: false, words: (e as Error).message }))
      .then(() => setTesting(false));
  }

  function save() {
    if (problem) {
      fail(new Error(problem));
      return;
    }
    api('PUT', '/admin/files/config', wherePayload(draft))
      .then(() => {
        toast(draft.where === 's3' ? 'New uploads go to the bucket "' + draft.bucket.trim() + '".' : 'New uploads are stored on this machine.', 'ok');
        reload();
      })
      .catch(fail);
  }

  const tile = (id: 'local' | 's3', label: string, line: string) => (
    <label class={'tile' + (draft.where === id ? ' on' : '')}>
      <input type="radio" name="where" value={id} checked={draft.where === id} disabled={readonly} onChange={() => set({ where: id })} />
      <b>{label}</b>
      <span class="sub">{line}</span>
    </label>
  );

  return (
    <Card id="where-card">
      <div class="tiles" role="radiogroup" aria-label="Where files are stored">
        {tile('local', 'This machine', "A folder beside the backend's data. Fine on a laptop; it fills a small server's disk.")}
        {tile('s3', 'An S3-compatible bucket', 'AWS S3, MinIO, Backblaze, Cloudflare R2, Hetzner… Uploads and backup archives go there instead of the disk.')}
      </div>
      {draft.where === 's3' ? (
        <div id="bucket-form">
          <Gap h={8} />
          <div class="grid2">
            <Field label="Endpoint">
              <input type="url" id="s3-endpoint" placeholder="https://s3.example.com" value={draft.endpoint} disabled={readonly} onInput={(e) => set({ endpoint: (e.currentTarget as HTMLInputElement).value })} />
            </Field>
            <Field label="Region">
              <input type="text" id="s3-region" placeholder="us-east-1" value={draft.region} disabled={readonly} onInput={(e) => set({ region: (e.currentTarget as HTMLInputElement).value })} />
            </Field>
            <Field label="Bucket">
              <input type="text" id="s3-bucket" placeholder="my-app-files" value={draft.bucket} disabled={readonly} onInput={(e) => set({ bucket: (e.currentTarget as HTMLInputElement).value })} />
            </Field>
          </div>
          <Switch id="s3-path-style" checked={draft.pathStyle} onChange={(on) => set({ pathStyle: on })} disabled={readonly}>
            Path-style addressing
          </Switch>
          <Sub>On for MinIO and most self-hosted services (the bucket is in the path). Off for AWS S3's own style (the bucket is in the hostname).</Sub>
          <Gap h={8} />
          <div class="field-head">
            <b>Key</b>
            {credentialsConfigured ? <Chip kind="ok">key: configured</Chip> : <Chip kind="warn">key: not configured</Chip>}
            <span class="hint">{credentialsConfigured ? 'Leave both blank to keep the stored key. It is never shown.' : 'From your storage provider. Stored on this backend, never shown again.'}</span>
          </div>
          <div class="grid2">
            <Field label="Access key id">
              <input type="text" id="s3-access-key-id" autocomplete="off" value={draft.accessKeyId} disabled={readonly} onInput={(e) => set({ accessKeyId: (e.currentTarget as HTMLInputElement).value })} />
            </Field>
            <Field label="Secret access key">
              <input type="password" id="s3-secret" autocomplete="new-password" value={draft.secretAccessKey} disabled={readonly} onInput={(e) => set({ secretAccessKey: (e.currentTarget as HTMLInputElement).value })} />
            </Field>
          </div>
          {tested ? (
            <div id="s3-test-result" class={'notice ' + (tested.ok ? 'ok' : 'bad')}>
              {tested.words}
            </div>
          ) : null}
        </div>
      ) : null}
      <Sub>Files already stored on this machine stay there until you move them; the backend keeps serving them from here. Switching changes where NEW uploads and backups go.</Sub>
      <Row style="margin-top:12px">
        {draft.where === 's3' ? (
          <WriteBtn tiny id="s3-test" disabled={testing || !!problem} title={problem || undefined} onClick={test}>
            {testing ? 'Testing…' : 'Test connection'}
          </WriteBtn>
        ) : null}
        <WriteBtn tiny kind="primary" id="save-where" disabled={!canSave || !!problem} title={!canSave ? 'Test the connection first.' : problem || undefined} onClick={save}>
          Save
        </WriteBtn>
      </Row>
    </Card>
  );
}

/** `GET /admin/files/move` (BMG-015 §7). */
export interface MoveStatus {
  onThisMachine: number;
  bucketConnected: boolean;
  progress: {
    state: 'idle' | 'running' | 'done';
    total: number;
    moved: number;
    bytes: number;
    failed: Array<{ name: string; error: string }>;
  };
}

/** What the move card says, from the route's answer alone. */
export function moveWords(s: MoveStatus): string {
  const p = s.progress;
  const files = (n: number) => (n === 1 ? '1 file' : n + ' files');
  if (p.state === 'running') return 'Moving ' + (p.moved + p.failed.length + 1 > p.total ? p.total : p.moved + p.failed.length + 1) + ' of ' + p.total + '… ' + bytes(p.bytes) + ' so far. The app keeps working while they move.';
  const done = p.state === 'done' ? files(p.moved) + ' moved to the bucket' + (p.failed.length ? ', ' + files(p.failed.length) + ' left where ' + (p.failed.length === 1 ? 'it was' : 'they were') : '') + '. ' : '';
  if (!s.onThisMachine) return done + 'Every file is in the bucket.';
  return done + (s.onThisMachine === 1 ? '1 file is' : s.onThisMachine + ' files are') + ' still on this machine. They keep serving from here; new uploads go to the bucket.';
}

/** *Move files to the bucket* (BMG-015 §7): the files uploaded before the bucket, moved in the background with progress. */
function MoveCard() {
  const [status, setStatus] = useState<MoveStatus | null>(null);
  const timer = useRef<number | null>(null);

  function load() {
    api<MoveStatus>('GET', '/admin/files/move')
      .then((s) => {
        setStatus(s);
        if (s.progress.state === 'running') timer.current = window.setTimeout(load, 1000);
        else if (timer.current !== null) timer.current = null;
      })
      .catch(fail);
  }
  useEffect(() => {
    load();
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  function start() {
    api<MoveStatus>('POST', '/admin/files/move', {})
      .then((s) => {
        setStatus(s);
        timer.current = window.setTimeout(load, 1000);
      })
      .catch(fail);
  }

  if (!status) return null;
  const p = status.progress;
  const running = p.state === 'running';
  const n = status.onThisMachine;
  return (
    <Card id="move-card">
      <div id="move-words">{moveWords(status)}</div>
      {running ? <progress id="move-progress" style="width:100%" max={p.total || 1} value={p.moved + p.failed.length} /> : null}
      {p.failed.length ? (
        <ul id="move-failed" class="sub">
          {p.failed.map((f) => (
            <li key={f.name}>
              {f.name ? <b>{f.name}</b> : null} {f.error}
            </li>
          ))}
        </ul>
      ) : null}
      {n > 0 && !running ? (
        <Row style="margin-top:12px">
          <WriteBtn
            tiny
            kind="primary"
            id="move-start"
            onClick={() =>
              confirmSimple(
                'Move ' + (n === 1 ? '1 file' : n + ' files') + ' to the bucket?',
                'Each file is copied into the bucket, checked, and only then removed from this machine — a file that cannot be moved stays where it is and keeps working.',
                start,
                'Move'
              )
            }
          >
            Move them to the bucket
          </WriteBtn>
        </Row>
      ) : null}
    </Card>
  );
}

// ---------------------------------------------------------------- limits --

/** Upload size, signed-URL life, and the kinds this backend refuses. */
function LimitsCard({ config, reload }: { config: FilesConfig; reload: () => void }) {
  const { readonly } = useSession();
  const [maxMb, setMaxMb] = useState(String(Math.round((config.maxUploadBytes || 0) / (1024 * 1024))));
  const [ttl, setTtl] = useState(String(config.signedUrlTtlSeconds || 300));
  const [kinds, setKinds] = useState<RefusedKinds>(kindsFrom((config.contentTypes && config.contentTypes.denyList) || []));

  const toggle = (id: string, on: boolean) =>
    setKinds((k) => ({ ...k, categories: on ? k.categories.concat(k.categories.indexOf(id) === -1 ? [id] : []) : k.categories.filter((c) => c !== id) }));

  function save() {
    api('PUT', '/admin/files/config', {
      maxUploadBytes: Math.max(1, Number(maxMb) || 1) * 1024 * 1024,
      contentTypes: { denyList: denyListFrom(kinds) },
      signedUrlTtlSeconds: Math.max(1, Number(ttl) || 300)
    })
      .then(() => {
        toast('Storage settings saved.', 'ok');
        reload();
      })
      .catch(fail);
  }

  return (
    <Card>
      <div class="grid2">
        <Field label="Largest upload (MB)">
          <input type="number" min="1" id="max-mb" value={maxMb} disabled={readonly} onInput={(e) => setMaxMb((e.currentTarget as HTMLInputElement).value)} />
        </Field>
        <Field label="A private file's link stays open for (seconds)">
          <input type="number" min="1" id="signed-ttl" value={ttl} disabled={readonly} onInput={(e) => setTtl((e.currentTarget as HTMLInputElement).value)} />
        </Field>
      </div>
      <Gap />
      <div class="field-head">
        <b>Refuse these kinds</b>
        <span class="hint">An upload is judged by its bytes, never by the name or the type the app claims.</span>
      </div>
      <div class="kind-boxes" id="kind-boxes">
        {FILE_KINDS.map((k) => (
          <label class="check kind-box" key={k.id}>
            <input type="checkbox" value={k.id} checked={kinds.categories.indexOf(k.id) !== -1} disabled={readonly} onChange={(e) => toggle(k.id, (e.currentTarget as HTMLInputElement).checked)} />
            <span>
              <b>{k.label}</b>
              <span class="sub">{k.line}</span>
            </span>
          </label>
        ))}
      </div>
      <Gap h={8} />
      <div class="field-head">
        <b>Also refuse these types</b>
        <span class="hint">One the backend can identify is refused; one it cannot is listed here and matches nothing.</span>
      </div>
      <div id="custom-types">
        <Chips
          items={kinds.custom}
          onChange={(custom) => setKinds((k) => ({ ...k, custom }))}
          validate={mimeProblem}
          normalise={(t) => t.trim().toLowerCase()}
          label={(t) => (sniffable(t) ? t : t + ' (never identified)')}
          placeholder="application/x-msdownload"
          addLabel="Add type"
          disabled={readonly}
        />
      </div>
      <Row style="margin-top:12px">
        <WriteBtn tiny kind="primary" id="save-limits" onClick={save}>
          Save settings
        </WriteBtn>
      </Row>
    </Card>
  );
}

// --------------------------------------------------------------- presets --

interface PresetRow {
  name: string;
  width: string;
  height: string;
  fit: string;
}

export function presetRows(presets: Record<string, Preset>): PresetRow[] {
  return Object.keys(presets).map((name) => ({ name, width: String(presets[name].width), height: String(presets[name].height), fit: presets[name].fit || 'cover' }));
}

/** A sentence when the rows cannot be saved; null when they can. */
export function presetsProblem(rows: PresetRow[]): string | null {
  const seen = new Set<string>();
  for (const r of rows) {
    const name = r.name.trim();
    if (!name) return 'Every preset needs a name.';
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) return 'A preset name is letters, digits, "_" or "-" (it goes in a URL: ?thumb=' + name + ').';
    if (seen.has(name)) return 'Two presets are called "' + name + '".';
    seen.add(name);
    const w = Number(r.width);
    const h = Number(r.height);
    if (!(w > 0) || !(h > 0) || !Number.isInteger(w) || !Number.isInteger(h)) return '"' + name + '" needs a whole width and height in pixels.';
  }
  return null;
}

export function presetsFrom(rows: PresetRow[]): Record<string, Preset> {
  const out: Record<string, Preset> = {};
  for (const r of rows) out[r.name.trim()] = { width: Number(r.width), height: Number(r.height), fit: r.fit === 'contain' ? 'contain' : 'cover' };
  return out;
}

function PresetsCard({ presets, reload }: { presets: Record<string, Preset>; reload: () => void }) {
  const { readonly } = useSession();
  const [rows, setRows] = useState<PresetRow[]>(presetRows(presets));
  const problem = presetsProblem(rows);

  function save() {
    if (problem) {
      fail(new Error(problem));
      return;
    }
    api('PUT', '/admin/files/config', { thumbnails: { presets: presetsFrom(rows) } })
      .then(() => {
        toast('Thumbnail presets saved.', 'ok');
        reload();
      })
      .catch(fail);
  }

  return (
    <Card>
      <Sub>A named preset is public: any app may ask for ?thumb=name. Sizes that are not a preset are admin-only.</Sub>
      <Gap h={8} />
      <ListEditor
        id="presets"
        rows={rows}
        onChange={setRows}
        blank={() => ({ name: '', width: '128', height: '128', fit: 'cover' })}
        addLabel="Add preset"
        disabled={readonly}
        head={
          <div class="list-row list-head">
            <span style="flex:1 1 140px">Name</span>
            <span style="width:80px">Width</span>
            <span style="width:80px">Height</span>
            <span style="width:110px">Fit</span>
          </div>
        }
        renderRow={(r, update) => (
          <>
            <input type="text" value={r.name} placeholder="name" aria-label="Preset name" disabled={readonly} onInput={(e) => update({ ...r, name: (e.currentTarget as HTMLInputElement).value })} />
            <input type="number" min="1" style="width:80px" value={r.width} aria-label="Width" disabled={readonly} onInput={(e) => update({ ...r, width: (e.currentTarget as HTMLInputElement).value })} />
            <input type="number" min="1" style="width:80px" value={r.height} aria-label="Height" disabled={readonly} onInput={(e) => update({ ...r, height: (e.currentTarget as HTMLInputElement).value })} />
            <select style="width:110px" value={r.fit} aria-label="Fit" disabled={readonly} onChange={(e) => update({ ...r, fit: (e.currentTarget as HTMLSelectElement).value })}>
              <option value="cover">crop to fill</option>
              <option value="contain">fit inside</option>
            </select>
          </>
        )}
      />
      {problem ? <Hint>{problem}</Hint> : null}
      <Row style="margin-top:12px">
        <WriteBtn tiny kind="primary" id="save-presets" disabled={!!problem} onClick={save}>
          Save presets
        </WriteBtn>
      </Row>
    </Card>
  );
}

// -------------------------------------------------------------- clean-up --

/** The orphan sweep: its last report, run it now, and when it runs on its own. */
function SweepCard({ config, reload }: { config: FilesConfig; reload: () => void }) {
  const { readonly } = useSession();
  const sweep = config.orphanSweep || { enabled: false, cron: '0 3 * * *' };
  const [enabled, setEnabled] = useState(!!sweep.enabled);
  const [cron, setCron] = useState(cellText(sweep.cron) || '0 3 * * *');
  const status = config.sweepStatus || {};
  const lastReport = status.lastReport;

  function saveSchedule() {
    api('PUT', '/admin/files/config', { orphanSweep: { enabled, cron: cron.trim() } })
      .then(() => {
        toast(enabled ? 'Clean-up scheduled.' : 'Clean-up schedule turned off.', 'ok');
        reload();
      })
      .catch(fail);
  }

  function runSweep(deleteOrphans: boolean) {
    toast('Looking for orphans…');
    api<{ report: SweepReport }>('POST', '/admin/files/sweep', { deleteOrphans })
      .then((result) => {
        const r = result.report;
        toast(sweepWords(r), 'ok');
        reload();
      })
      .catch(fail);
  }

  return (
    <Card>
      <Row>
        {lastReport ? (
          <Chip kind={lastReport.error ? 'bad' : lastReport.orphanBlobs.length || lastReport.orphanRows.length ? 'warn' : 'ok'}>
            {'last checked ' + when(lastReport.at) + ' — ' + plural(lastReport.orphanBlobs.length, 'unknown file', 'unknown files') + ', ' + lastReport.orphanRows.length + ' missing' + ((lastReport.tooNew || []).length ? ', ' + (lastReport.tooNew || []).length + ' too new to judge' : '')}
          </Chip>
        ) : (
          <Chip>never run</Chip>
        )}
        <Spacer />
        <WriteBtn tiny onClick={() => runSweep(false)}>
          Check now
        </WriteBtn>
        <WriteBtn tiny kind="danger" onClick={() => confirmSimple('Delete unknown files?', 'Files no record points at are deleted for good. Records whose file is missing are only reported.', () => runSweep(true), 'Check and delete')}>
          Check now and delete unknown files
        </WriteBtn>
      </Row>
      <Gap />
      <Switch id="sweep-enabled" checked={enabled} onChange={setEnabled} disabled={readonly}>
        Check on a schedule
      </Switch>
      <Sub>A scheduled check only reports — it never deletes. Records whose file went missing are a data problem for a person, never cleaned up on their own.</Sub>
      {enabled ? (
        <div class="when-body" id="sweep-schedule">
          <ScheduleBuilder id="sweep-cron" value={cron} onChange={setCron} preview={previewCron} disabled={readonly} />
        </div>
      ) : null}
      <Row style="margin-top:12px">
        <WriteBtn tiny kind="primary" id="save-sweep" onClick={saveSchedule}>
          Save schedule
        </WriteBtn>
      </Row>
    </Card>
  );
}
