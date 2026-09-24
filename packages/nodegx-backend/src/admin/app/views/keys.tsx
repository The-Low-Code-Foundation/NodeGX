/**
 * API keys — scoped, revocable credentials for server-to-server callers.
 * Secrets are shown once. Ported as-is from the vanilla page (BMG-001 §3.1).
 */
import { useEffect, useState } from 'preact/hooks';

import { api, encode } from '../api';
import { EmptyState } from '../composers';
import { when } from '../format';
import { ActionCell, Btn, Chip, Dialog, Gap, Notice, Page, Row, Table, WriteBtn, confirmDestructive, fail, openModal, toast } from '../ui';
import type { ViewProps } from './index';

interface ApiKey {
  objectId: string;
  name: string;
  scopes?: string[];
  revoked?: boolean;
  createdAt?: unknown;
  lastUsedAt?: unknown;
}

export function KeysView(_props: ViewProps) {
  const [keys, setKeys] = useState<ApiKey[] | null>(null);

  function load() {
    api<{ keys?: ApiKey[] }>('GET', '/admin/keys')
      .then((data) => setKeys(data.keys || []))
      .catch(fail);
  }
  useEffect(() => {
    load();
  }, []);

  function createKey() {
    openModal((close) => <NewKeyDialog close={close} onCreated={load} />);
  }

  function revoke(k: ApiKey) {
    confirmDestructive('Revoke key', 'Anything using "' + k.name + '" stops working immediately.', k.name, () => {
      api('DELETE', '/admin/keys/' + encode(k.objectId))
        .then(() => {
          toast('Key revoked.', 'ok');
          load();
        })
        .catch(fail);
    });
  }

  return (
    <Page title="API keys" subtitle="Scoped, revocable credentials for server-to-server callers. Secrets are shown once.">
      <Row>
        <WriteBtn kind="primary" onClick={createKey}>
          New key
        </WriteBtn>
        <Btn onClick={load}>Refresh</Btn>
      </Row>
      <Gap />
      {keys ? (
        <Table
          columns={['Name', 'Scopes', 'Status', 'Created', 'Last used', '']}
          rows={keys}
          empty={
            <EmptyState action={{ label: 'New key', onClick: createKey }}>No API keys yet. A key lets a server or script call this backend.</EmptyState>
          }
          renderRow={(k) => (
            <tr key={k.objectId}>
              <td>{k.name}</td>
              <td>{(k.scopes || []).join(', ')}</td>
              <td>{k.revoked ? <Chip kind="bad">revoked</Chip> : <Chip kind="ok">active</Chip>}</td>
              <td>{when(k.createdAt)}</td>
              <td>{when(k.lastUsedAt)}</td>
              <ActionCell>
                {k.revoked ? null : (
                  <WriteBtn tiny kind="danger" onClick={() => revoke(k)}>
                    Revoke
                  </WriteBtn>
                )}
              </ActionCell>
            </tr>
          )}
        />
      ) : null}
    </Page>
  );
}

function NewKeyDialog({ close, onCreated }: { close: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState('classes:read');
  function create() {
    api<{ secret: string }>('POST', '/admin/keys', {
      name: name.trim(),
      scopes: scopes
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    })
      .then((result) => {
        close();
        openModal((closeSecret) => <SecretDialog secret={result.secret} close={closeSecret} />, onCreated);
      })
      .catch(fail);
  }
  return (
    <Dialog
      title="New API key"
      actions={
        <>
          <Btn onClick={close}>Cancel</Btn>
          <Btn kind="primary" onClick={create}>
            Create
          </Btn>
        </>
      }
    >
      <div class="grid2">
        <label class="field">
          Name
          <input type="text" placeholder="Label for this key" value={name} onInput={(e) => setName((e.currentTarget as HTMLInputElement).value)} />
        </label>
        <label class="field">
          Scopes (comma separated)
          <input type="text" placeholder="classes:read, functions:*" value={scopes} onInput={(e) => setScopes((e.currentTarget as HTMLInputElement).value)} />
        </label>
      </div>
    </Dialog>
  );
}

function SecretDialog({ secret, close }: { secret: string; close: () => void }) {
  return (
    <Dialog
      title="Copy this secret now"
      actions={
        <Btn kind="primary" onClick={close}>
          Done
        </Btn>
      }
    >
      <Notice kind="warn">This is the only time the secret is shown. It is stored hashed and cannot be recovered.</Notice>
      <textarea value={secret} readOnly />
    </Dialog>
  );
}
