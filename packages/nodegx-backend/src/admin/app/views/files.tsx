/**
 * Files — upload limits, content-type policy, the storage driver, thumbnail
 * presets, and the orphan sweep (BAK-006). Ported as-is from the vanilla page
 * (BMG-001 §3.1); both forms re-read the server's values after every save,
 * exactly as the old page rebuilt its inputs.
 */
import { useEffect, useState } from 'preact/hooks';

import { api, useSession } from '../api';
import { cellText, when } from '../format';
import { Card, Check, Chip, Field, Page, Row, Spacer, Sub, WriteBtn, fail, toast } from '../ui';
import type { ViewProps } from './index';

interface SweepReport {
  at?: unknown;
  error?: unknown;
  orphanBlobs: unknown[];
  orphanRows: unknown[];
  deleted?: boolean;
}

interface FilesConfig {
  maxUploadBytes?: number;
  contentTypes?: { denyList?: string[] };
  signedUrlTtlSeconds?: number;
  thumbnails?: { presets?: Record<string, { width: number; height: number; fit: string }> };
  orphanSweep?: { enabled?: boolean; cron?: string };
  sweepStatus?: { lastReport?: SweepReport };
}

interface FilesData {
  driverKind?: string;
  transformsAvailable?: boolean;
  transformUnavailableReason?: string;
  config?: FilesConfig;
}

export function FilesView(_props: ViewProps) {
  const [data, setData] = useState<FilesData | null>(null);
  const [generation, setGeneration] = useState(0);

  function load() {
    api<FilesData>('GET', '/admin/files/config')
      .then((d) => {
        setData(d);
        setGeneration((g) => g + 1);
      })
      .catch(fail);
  }
  useEffect(() => {
    load();
  }, []);

  const config = (data && data.config) || {};
  const presets = (config.thumbnails && config.thumbnails.presets) || {};

  return (
    <Page title="Files" subtitle="Upload limits, content-type policy, the storage driver, thumbnail presets, and the orphan sweep (BAK-006).">
      {data ? (
        <div>
          <Row>
            <Chip kind="accent">{'driver: ' + data.driverKind}</Chip>
            {data.transformsAvailable ? (
              <Chip kind="ok">thumbnails available</Chip>
            ) : (
              <Chip kind="warn">{'thumbnails unavailable — ' + cellText(data.transformUnavailableReason)}</Chip>
            )}
          </Row>
          <LimitsCard key={'limits' + generation} config={config} reload={load} />
          <h2>Thumbnail presets</h2>
          <Card>
            <div>
              {Object.keys(presets).map((name) => {
                const p = presets[name];
                return (
                  <Row key={name}>
                    <b>{name}</b>
                    {p.width + '×' + p.height + ' (' + p.fit + ')'}
                  </Row>
                );
              })}
            </div>
            <Sub style="margin-top:8px">
              Named presets are public; arbitrary "?thumb=WxH" sizes are admin-only. Edit presets via the configure_backend_files MCP tool or the Backend Services panel.
            </Sub>
          </Card>
          <h2>Orphan sweep</h2>
          <SweepCard key={'sweep' + generation} config={config} reload={load} />
        </div>
      ) : null}
    </Page>
  );
}

/** Upload size, signed-URL TTL, and the denied content types. */
function LimitsCard({ config, reload }: { config: FilesConfig; reload: () => void }) {
  const { readonly } = useSession();
  const [maxMb, setMaxMb] = useState(String(Math.round((config.maxUploadBytes || 0) / (1024 * 1024))));
  const [denyList, setDenyList] = useState(((config.contentTypes && config.contentTypes.denyList) || []).join(', '));
  const [ttl, setTtl] = useState(String(config.signedUrlTtlSeconds || 300));

  function saveLimits() {
    api('PUT', '/admin/files/config', {
      maxUploadBytes: Math.max(1, Number(maxMb) || 1) * 1024 * 1024,
      contentTypes: {
        denyList: denyList
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      },
      signedUrlTtlSeconds: Math.max(1, Number(ttl) || 300)
    })
      .then(() => {
        toast('File limits saved.', 'ok');
        reload();
      })
      .catch(fail);
  }

  return (
    <Card style="margin-top:12px">
      <div class="grid2">
        <Field label="Max upload size (MB)">
          <input type="number" min="1" value={maxMb} disabled={readonly} onInput={(e) => setMaxMb((e.currentTarget as HTMLInputElement).value)} />
        </Field>
        <Field label="Signed URL TTL (seconds)">
          <input type="number" min="1" value={ttl} disabled={readonly} onInput={(e) => setTtl((e.currentTarget as HTMLInputElement).value)} />
        </Field>
        <Field label="Denied content types (comma-separated)" style="grid-column:1/-1">
          <input
            type="text"
            value={denyList}
            placeholder="application/x-msdownload, ..."
            disabled={readonly}
            onInput={(e) => setDenyList((e.currentTarget as HTMLInputElement).value)}
          />
        </Field>
      </div>
      <Row style="margin-top:12px">
        <WriteBtn tiny kind="primary" onClick={saveLimits}>
          Save limits
        </WriteBtn>
      </Row>
    </Card>
  );
}

/** The orphan sweep: its last report, run it now, and the schedule. */
function SweepCard({ config, reload }: { config: FilesConfig; reload: () => void }) {
  const { readonly } = useSession();
  const sweep = config.orphanSweep || { enabled: false, cron: '0 3 * * *' };
  const [sweepEnabled, setSweepEnabled] = useState(!!sweep.enabled);
  const [sweepCron, setSweepCron] = useState(cellText(sweep.cron));
  const status = config.sweepStatus || {};
  const lastReport = status.lastReport;

  function saveSweepSchedule() {
    api('PUT', '/admin/files/config', { orphanSweep: { enabled: sweepEnabled, cron: sweepCron.trim() } })
      .then(() => {
        toast('Orphan-sweep schedule saved.', 'ok');
        reload();
      })
      .catch(fail);
  }

  function runSweep(deleteOrphans: boolean) {
    toast('Running the orphan sweep…');
    api<{ report: SweepReport }>('POST', '/admin/files/sweep', { deleteOrphans })
      .then((result) => {
        const r = result.report;
        toast(
          'Sweep done: ' + r.orphanBlobs.length + ' orphan blob(s), ' + r.orphanRows.length + ' orphan row(s)' + (r.deleted ? ' (orphan blobs deleted).' : ' (report only).'),
          'ok'
        );
        reload();
      })
      .catch(fail);
  }

  return (
    <Card>
      <Row>
        {lastReport ? (
          <Chip kind={lastReport.error ? 'bad' : lastReport.orphanBlobs.length || lastReport.orphanRows.length ? 'warn' : 'ok'}>
            {'last swept ' + when(lastReport.at) + ' — ' + lastReport.orphanBlobs.length + ' orphan blob(s), ' + lastReport.orphanRows.length + ' orphan row(s)'}
          </Chip>
        ) : (
          <Chip>never run</Chip>
        )}
        <Spacer />
        <WriteBtn tiny onClick={() => runSweep(false)}>
          Run now (report only)
        </WriteBtn>
        <WriteBtn tiny kind="danger" onClick={() => runSweep(true)}>
          Run now + delete orphan blobs
        </WriteBtn>
      </Row>
      <Row style="margin-top:10px">
        <Check checked={sweepEnabled} onChange={setSweepEnabled} disabled={readonly}>
          Scheduled
        </Check>
        <Field label="Cron">
          <input type="text" value={sweepCron} disabled={readonly} onInput={(e) => setSweepCron((e.currentTarget as HTMLInputElement).value)} />
        </Field>
        <WriteBtn tiny onClick={saveSweepSchedule}>
          Save schedule
        </WriteBtn>
      </Row>
      <Sub style="margin-top:8px">
        Report-only by default: the schedule finds and reports orphans, it never auto-deletes. Orphan METADATA ROWS (a row whose blob went missing) are never auto-deleted either way — that is a data-integrity signal for a human.
      </Sub>
    </Card>
  );
}
