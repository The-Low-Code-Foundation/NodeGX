/**
 * Server — the few knobs of how the backend behaves (BMG-011 §3.5), over
 * `GET/PUT /admin/ops`. Each card saves its own section. Every section is
 * read live by the process (`ops/model.ts` readers take the config by
 * getter, logging is reconfigured on save), so nothing here needs a restart —
 * the page says so once rather than beside each card.
 */
import { useEffect, useState } from 'preact/hooks';

import { api, useSession } from '../api';
import { Chips } from '../composers';
import { normaliseOrigin, originProblem } from '../providerWizard';
import { Card, Field, Gap, Hint, Notice, Page, Row, Sub, Switch, WriteBtn, confirmSimple, fail, toast } from '../ui';
import type { ViewProps } from './index';

export const ROUTE_CLASSES: Array<{ id: string; label: string; line: string }> = [
  { id: 'auth', label: 'Signing in', line: 'login, signup, password and magic-link requests' },
  { id: 'data', label: 'Records', line: 'reading and writing collections' },
  { id: 'files', label: 'Files', line: 'uploads and downloads' },
  { id: 'functions', label: 'Cloud functions', line: 'calls to deployed functions' },
  { id: 'hooks', label: 'Webhooks', line: 'triggers fired from outside' },
  { id: 'admin', label: 'This manager', line: 'admin routes and agents' },
  { id: 'public', label: 'Everything else', line: 'health, docs and public pages' }
];

export const LOG_LEVELS: Array<{ id: string; label: string }> = [
  { id: 'debug', label: 'Everything (debug)' },
  { id: 'info', label: 'Normal (info)' },
  { id: 'warn', label: 'Warnings and errors' },
  { id: 'error', label: 'Errors only' },
  { id: 'silent', label: 'Nothing' }
];

interface Policy {
  ratePerMinute: number;
  burst: number;
}

interface OpsConfig {
  logging: { level: string; format: string; requests: boolean };
  rateLimit: { enabled: boolean; trustedProxies: string[]; policies: Record<string, Policy>; realtimeMaxConnections: number; functionRunQueries: number };
  cors: { origins: string[]; credentials: boolean };
  audit: { enabled: boolean; retentionDays: number };
  executions: { retentionDays: number; idempotencyTtlHours: number; maxCount: number; maxValueBytes: number; maxRunBytes: number };
  metrics: { enabled: boolean; allowLoopback: boolean };
}

/** A proxy entry is `loopback`, `*`, or an address; the sentence says so. */
export function proxyProblem(text: string): string | null {
  const t = text.trim();
  if (!t) return 'Type an address.';
  if (t === 'loopback' || t === '*') return null;
  if (/^[0-9a-fA-F:.]+$/.test(t)) return null;
  return 'A proxy is an IP address, "loopback" (the same machine) or "*" (any).';
}

export function ServerView(_props: ViewProps) {
  const [config, setConfig] = useState<OpsConfig | null>(null);
  const [generation, setGeneration] = useState(0);

  function load() {
    api<{ config: OpsConfig }>('GET', '/admin/ops')
      .then((d) => {
        setConfig(d.config);
        setGeneration((g) => g + 1);
      })
      .catch(fail);
  }
  useEffect(() => {
    load();
  }, []);

  const save = (section: keyof OpsConfig, value: unknown, said: string) =>
    api('PUT', '/admin/ops', { [section]: value })
      .then(() => {
        toast(said, 'ok');
        load();
      })
      .catch(fail);

  return (
    <Page title="Server" subtitle="Who may call from a browser, how many requests are allowed, what is logged and kept. Each card saves on its own and applies at once.">
      {config ? (
        <div>
          <h2>Who may call from a browser</h2>
          <CorsCard key={'cors' + generation} cors={config.cors} save={(v) => save('cors', v, 'Browser access saved.')} />
          <h2>Rate limits</h2>
          <RateCard key={'rate' + generation} rl={config.rateLimit} save={(v) => save('rateLimit', v, 'Rate limits saved.')} />
          <h2>Logging</h2>
          <LoggingCard key={'log' + generation} logging={config.logging} save={(v) => save('logging', v, 'Logging saved.')} />
          <h2>Activity trail</h2>
          <AuditCard key={'audit' + generation} audit={config.audit} save={(v) => save('audit', v, 'Activity trail settings saved.')} />
          <h2>Run history</h2>
          <RunsCard key={'runs' + generation} executions={config.executions} save={(v) => save('executions', v, 'Run history settings saved.')} />
          <h2>Metrics</h2>
          <MetricsCard key={'metrics' + generation} metrics={config.metrics} save={(v) => save('metrics', v, 'Metrics settings saved.')} />
        </div>
      ) : null}
    </Page>
  );
}

function CorsCard({ cors, save }: { cors: OpsConfig['cors']; save: (v: OpsConfig['cors']) => void }) {
  const { readonly } = useSession();
  const any = cors.origins.indexOf('*') !== -1;
  const [anySite, setAnySite] = useState(any);
  const [origins, setOrigins] = useState<string[]>(cors.origins.filter((o) => o !== '*'));
  const [credentials, setCredentials] = useState(!!cors.credentials);
  const problem = !anySite && !origins.length ? 'List at least one site, or allow any.' : anySite && credentials ? 'Cookies cannot be sent to any site — browsers refuse that pair. Name the sites, or turn cookies off.' : null;

  return (
    <Card>
      <Switch id="cors-any" checked={anySite} onChange={setAnySite} disabled={readonly}>
        Any site may call this backend
      </Switch>
      <Sub>Fine while you build; a live backend should name its sites.</Sub>
      {!anySite ? (
        <div id="cors-origins" style="margin-top:8px">
          <div class="field-head">
            <b>These sites</b>
            <span class="hint">the address a browser shows for your app</span>
          </div>
          <Chips items={origins} onChange={setOrigins} validate={originProblem} normalise={normaliseOrigin} placeholder="https://app.example.com" addLabel="Add site" disabled={readonly} />
        </div>
      ) : null}
      <Gap h={8} />
      <Switch id="cors-credentials" checked={credentials} onChange={setCredentials} disabled={readonly}>
        Let those sites send cookies
      </Switch>
      {problem ? <Hint>{problem}</Hint> : null}
      <Row style="margin-top:12px">
        <WriteBtn tiny kind="primary" id="save-cors" disabled={!!problem} onClick={() => save({ origins: anySite ? ['*'] : origins, credentials })}>
          Save
        </WriteBtn>
      </Row>
    </Card>
  );
}

function RateCard({ rl, save }: { rl: OpsConfig['rateLimit']; save: (v: OpsConfig['rateLimit']) => void }) {
  const { readonly } = useSession();
  const [enabled, setEnabled] = useState(!!rl.enabled);
  const [policies, setPolicies] = useState<Record<string, { rate: string; burst: string }>>(() => {
    const out: Record<string, { rate: string; burst: string }> = {};
    for (const c of ROUTE_CLASSES) out[c.id] = { rate: String((rl.policies[c.id] || { ratePerMinute: 0 }).ratePerMinute), burst: String((rl.policies[c.id] || { burst: 0 }).burst) };
    return out;
  });
  const [proxies, setProxies] = useState<string[]>(rl.trustedProxies || []);
  const [streams, setStreams] = useState(String(rl.realtimeMaxConnections));
  const [perRun, setPerRun] = useState(String(rl.functionRunQueries));
  const n = (v: string) => Math.max(0, Math.floor(Number(v) || 0));

  function submit() {
    const next: Record<string, Policy> = { ...rl.policies };
    for (const c of ROUTE_CLASSES) next[c.id] = { ratePerMinute: n(policies[c.id].rate), burst: n(policies[c.id].burst) };
    save({ enabled, trustedProxies: proxies, policies: next, realtimeMaxConnections: n(streams), functionRunQueries: n(perRun) });
  }

  return (
    <Card>
      <Switch id="rate-enabled" checked={enabled} onChange={setEnabled} disabled={readonly}>
        Limit how fast one client may call
      </Switch>
      <Sub>Each client gets an allowance per minute for each kind of request, and a burst it may spend at once. 0 in the burst means no limit for that kind.</Sub>
      {enabled ? (
        <div class="rate-table" id="rate-table">
          <div class="list-row list-head">
            <span style="flex:1 1 160px">Kind of request</span>
            <span style="width:110px">Per minute</span>
            <span style="width:90px">Burst</span>
          </div>
          {ROUTE_CLASSES.map((c) => (
            <div class="list-row" key={c.id} data-class={c.id}>
              <span style="flex:1 1 160px">
                <b>{c.label}</b>
                <span class="sub">{c.line}</span>
              </span>
              <input type="number" min="0" style="width:110px" aria-label={c.label + ' per minute'} value={policies[c.id].rate} disabled={readonly} onInput={(e) => setPolicies({ ...policies, [c.id]: { ...policies[c.id], rate: (e.currentTarget as HTMLInputElement).value } })} />
              <input type="number" min="0" style="width:90px" aria-label={c.label + ' burst'} value={policies[c.id].burst} disabled={readonly} onInput={(e) => setPolicies({ ...policies, [c.id]: { ...policies[c.id], burst: (e.currentTarget as HTMLInputElement).value } })} />
            </div>
          ))}
        </div>
      ) : null}
      <Gap />
      <div class="grid2">
        <Field label="Live streams open at once (0 = no limit)">
          <input type="number" min="0" id="rate-streams" value={streams} disabled={readonly} onInput={(e) => setStreams((e.currentTarget as HTMLInputElement).value)} />
        </Field>
        <Field label="Requests one function run may make (0 = no limit)">
          <input type="number" min="0" id="rate-per-run" value={perRun} disabled={readonly} onInput={(e) => setPerRun((e.currentTarget as HTMLInputElement).value)} />
        </Field>
      </div>
      <Gap h={8} />
      <div class="field-head">
        <b>Proxies to believe about who is calling</b>
        <span class="hint">a reverse proxy in front of this backend, so its clients are told apart</span>
      </div>
      <Chips items={proxies} onChange={setProxies} validate={proxyProblem} placeholder="loopback" addLabel="Add proxy" disabled={readonly} label={(p) => (p === 'loopback' ? 'the same machine' : p === '*' ? 'any (only behind a proxy that resets the header)' : p)} />
      <Row style="margin-top:12px">
        <WriteBtn tiny kind="primary" id="save-rate" onClick={submit}>
          Save
        </WriteBtn>
      </Row>
    </Card>
  );
}

function LoggingCard({ logging, save }: { logging: OpsConfig['logging']; save: (v: OpsConfig['logging']) => void }) {
  const { readonly } = useSession();
  const [level, setLevel] = useState(logging.level);
  const [format, setFormat] = useState(logging.format);
  const [requests, setRequests] = useState(!!logging.requests);
  return (
    <Card>
      <div class="grid2">
        <div class="scope-group">
          <div class="field-head">
            <b>How much to log</b>
          </div>
          {LOG_LEVELS.map((l) => (
            <label class="check" key={l.id}>
              <input type="radio" name="log-level" value={l.id} checked={level === l.id} disabled={readonly} onChange={() => setLevel(l.id)} /> {l.label}
            </label>
          ))}
        </div>
        <div class="scope-group">
          <div class="field-head">
            <b>How lines look</b>
          </div>
          <label class="check">
            <input type="radio" name="log-format" value="auto" checked={format === 'auto'} disabled={readonly} onChange={() => setFormat('auto')} /> Decide from where it runs (readable in a terminal, JSON under a supervisor)
          </label>
          <label class="check">
            <input type="radio" name="log-format" value="pretty" checked={format === 'pretty'} disabled={readonly} onChange={() => setFormat('pretty')} /> Readable
          </label>
          <label class="check">
            <input type="radio" name="log-format" value="json" checked={format === 'json'} disabled={readonly} onChange={() => setFormat('json')} /> JSON, one object per line
          </label>
        </div>
      </div>
      <Gap h={8} />
      <Switch id="log-requests" checked={requests} onChange={setRequests} disabled={readonly}>
        One line per request
      </Switch>
      <Row style="margin-top:12px">
        <WriteBtn tiny kind="primary" id="save-logging" onClick={() => save({ level, format, requests })}>
          Save
        </WriteBtn>
      </Row>
    </Card>
  );
}

function AuditCard({ audit, save }: { audit: OpsConfig['audit']; save: (v: OpsConfig['audit']) => void }) {
  const { readonly } = useSession();
  const [enabled, setEnabled] = useState(!!audit.enabled);
  const [days, setDays] = useState(String(audit.retentionDays));
  return (
    <Card>
      <Switch id="audit-enabled" checked={enabled} onChange={setEnabled} disabled={readonly}>
        Record who changed what
      </Switch>
      <Sub>What the Activity page shows. Off, and nothing is written there.</Sub>
      <Gap h={8} />
      <Field label="Keep entries for (days; 0 keeps them forever)">
        <input type="number" min="0" id="audit-days" value={days} disabled={readonly} onInput={(e) => setDays((e.currentTarget as HTMLInputElement).value)} />
      </Field>
      <Row style="margin-top:12px">
        <WriteBtn tiny kind="primary" id="save-audit" onClick={() => save({ enabled, retentionDays: Math.max(0, Math.floor(Number(days) || 0)) })}>
          Save
        </WriteBtn>
      </Row>
    </Card>
  );
}

function RunsCard({ executions, save }: { executions: OpsConfig['executions']; save: (v: OpsConfig['executions']) => void }) {
  const { readonly } = useSession();
  const [days, setDays] = useState(String(executions.retentionDays));
  const [most, setMost] = useState(String(executions.maxCount));
  const [ttl, setTtl] = useState(String(executions.idempotencyTtlHours));
  const [compacting, setCompacting] = useState(false);
  const n = (v: string) => Math.max(0, Math.floor(Number(v) || 0));

  function compact() {
    setCompacting(true);
    api<{ beforeBytes?: number; afterBytes?: number }>('POST', '/admin/executions/compact', {})
      .then((r) => {
        const before = r.beforeBytes || 0;
        const after = r.afterBytes || 0;
        toast('Run history compacted' + (before && after ? ': ' + Math.round(before / 1024) + ' KB → ' + Math.round(after / 1024) + ' KB.' : '.'), 'ok');
      })
      .catch(fail)
      .then(() => setCompacting(false));
  }

  return (
    <Card>
      <div class="grid2">
        <Field label="Keep runs for (days; 0 = forever)">
          <input type="number" min="0" id="runs-days" value={days} disabled={readonly} onInput={(e) => setDays((e.currentTarget as HTMLInputElement).value)} />
        </Field>
        <Field label="Keep at most (runs; 0 = no limit)">
          <input type="number" min="0" id="runs-most" value={most} disabled={readonly} onInput={(e) => setMost((e.currentTarget as HTMLInputElement).value)} />
        </Field>
        <Field label="Remember an answered Idempotency-Key for (hours)">
          <input type="number" min="0" id="runs-ttl" value={ttl} disabled={readonly} onInput={(e) => setTtl((e.currentTarget as HTMLInputElement).value)} />
        </Field>
      </div>
      <Sub>Whichever limit is reached first wins: a misfiring workflow can write a month of runs in an hour.</Sub>
      <Row style="margin-top:12px">
        <WriteBtn tiny kind="primary" id="save-runs" onClick={() => save({ ...executions, retentionDays: n(days), maxCount: n(most), idempotencyTtlHours: n(ttl) })}>
          Save
        </WriteBtn>
        <WriteBtn tiny id="compact-now" disabled={compacting} onClick={() => confirmSimple('Compact the run history now?', 'The history file is rewritten without the space old runs left behind. Runs are kept; this only takes a moment.', compact, 'Compact')}>
          {compacting ? 'Compacting…' : 'Compact now'}
        </WriteBtn>
      </Row>
    </Card>
  );
}

function MetricsCard({ metrics, save }: { metrics: OpsConfig['metrics']; save: (v: OpsConfig['metrics']) => void }) {
  const { readonly } = useSession();
  const [enabled, setEnabled] = useState(!!metrics.enabled);
  const [loopback, setLoopback] = useState(!!metrics.allowLoopback);
  const url = location.origin + '/metrics';
  return (
    <Card>
      <Switch id="metrics-enabled" checked={enabled} onChange={setEnabled} disabled={readonly}>
        Serve metrics for Prometheus
      </Switch>
      {enabled ? (
        <Notice>
          {'Scrape '}
          <code id="metrics-url">{url}</code>
          {' with the admin credential' + (loopback ? ', or from this machine without one.' : '.')}
        </Notice>
      ) : null}
      <Gap h={8} />
      <Switch id="metrics-loopback" checked={loopback} onChange={setLoopback} disabled={readonly || !enabled}>
        A scraper on this machine needs no credential
      </Switch>
      <Row style="margin-top:12px">
        <WriteBtn tiny kind="primary" id="save-metrics" onClick={() => save({ enabled, allowLoopback: loopback })}>
          Save
        </WriteBtn>
      </Row>
    </Card>
  );
}
