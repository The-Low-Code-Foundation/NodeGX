/**
 * Backups — archive status, the schedule, and a backup you can run right now
 * (BAK-007). Ported as-is from the vanilla page (BMG-001 §3.1).
 */
import { useEffect, useState } from 'preact/hooks';

import { api } from '../api';
import { EmptyState } from '../composers';
import { cellText, when } from '../format';
import { Card, Chip, Page, Row, Spacer, Sub, Table, WriteBtn, fail, toast } from '../ui';
import type { ViewProps } from './index';

interface BackupStatus {
  lastSuccessAt?: unknown;
  lastFailureAt?: unknown;
}

interface Archive {
  path?: string;
  name?: string;
  createdAt?: unknown;
  mtime?: unknown;
  bytes?: number;
  size?: number;
}

interface BackupsData {
  config?: {
    schedule?: { enabled?: boolean; cron?: string } | null;
    status?: BackupStatus;
    destination?: { path?: string };
  };
  status?: BackupStatus;
  backups?: Archive[];
}

export function BackupsView(_props: ViewProps) {
  const [data, setData] = useState<BackupsData | null>(null);

  function load() {
    api<BackupsData>('GET', '/admin/backups')
      .then((d) => setData(d))
      .catch(fail);
  }
  useEffect(() => {
    load();
  }, []);

  function backUpNow() {
    toast('Backup started…');
    api<{ archive?: string; bytes?: number }>('POST', '/admin/backups', {})
      .then((result) => {
        toast('Backup written: ' + result.archive + ' (' + result.bytes + ' bytes).', 'ok');
        load();
      })
      .catch(fail);
  }

  const config = (data && data.config) || {};
  const schedule = config.schedule || null;
  const status: BackupStatus = config.status || (data && data.status) || {};

  return (
    <Page title="Backups" subtitle="Archive status, schedule, and a backup you can run right now (BAK-007).">
      {data ? (
        <div>
          <Card>
            <Row>
              {schedule && schedule.enabled ? <Chip kind="ok">{'scheduled: ' + schedule.cron}</Chip> : <Chip kind="warn">no schedule</Chip>}
              {status.lastSuccessAt ? <Chip kind="ok">{'last ok ' + when(status.lastSuccessAt)}</Chip> : <Chip kind="warn">never succeeded</Chip>}
              {status.lastFailureAt ? <Chip kind="bad">{'last failure ' + when(status.lastFailureAt)}</Chip> : null}
              <Spacer />
              <WriteBtn tiny kind="primary" onClick={backUpNow}>
                Back up now
              </WriteBtn>
            </Row>
            <Sub style="margin:10px 0 0">{'Destination: ' + cellText((config.destination || {}).path)}</Sub>
          </Card>
          <h2>Archives</h2>
          <Table
            columns={['Archive', 'Created', 'Bytes']}
            rows={data.backups || []}
            renderRow={(b, i) => (
              <tr key={b.path || b.name || i}>
                <td>{cellText(b.path || b.name)}</td>
                <td>{when(b.createdAt || b.mtime)}</td>
                <td>{cellText(b.bytes || b.size)}</td>
              </tr>
            )}
            empty={<EmptyState action={{ label: 'Back up now', onClick: backUpNow }}>No backups yet.</EmptyState>}
          />
          <Sub style="margin-top:10px">
            Restoring is deliberately not a dashboard button: the blessed path is the `nodegx-backend restore` CLI with the service stopped.
          </Sub>
        </div>
      ) : null}
    </Page>
  );
}
