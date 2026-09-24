/**
 * Permissions — collection-level permissions (BAK-003), one card per
 * collection, plus the read-only backend defaults. Ported as-is from the
 * vanilla page (BMG-001 §3.1).
 */
import { useEffect, useState } from 'preact/hooks';

import { api, encode, useSession } from '../api';
import { EmptyState } from '../composers';
import { cellText } from '../format';
import { navigate } from '../router';
import { Card, Check, Chip, Field, Hi, Notice, Page, Row, Spacer, Sub, WriteBtn, fail, toast } from '../ui';
import type { ViewProps } from './index';

const OPS = ['find', 'get', 'create', 'update', 'delete'];

type Rule = string | string[] | undefined;

interface CollectionEntry {
  permissions?: Record<string, Rule>;
  creatorOwns?: boolean;
}

interface PermissionsConfig {
  devOpen?: boolean;
  defaults?: Record<string, unknown>;
  collections?: Record<string, CollectionEntry>;
}

export function PermissionsView(_props: ViewProps) {
  const { readonly } = useSession();
  const [config, setConfig] = useState<PermissionsConfig | null>(null);
  const [tables, setTables] = useState<string[]>([]);

  function load() {
    Promise.all([api<{ config: PermissionsConfig }>('GET', '/admin/permissions'), api<{ tables?: Array<{ name: string }> }>('GET', '/admin/schema')])
      .then(([data, schema]) => {
        setConfig(data.config || {});
        setTables((schema.tables || []).map((t) => t.name));
      })
      .catch(fail);
  }
  useEffect(() => {
    load();
  }, []);

  return (
    <Page title="Permissions" subtitle='Collection-level permissions (BAK-003). Rules are "public", "authenticated", "nobody" or "role:<name>".'>
      {config ? (
        <>
          {config.devOpen ? (
            <Notice kind="warn">
              DEV-OPEN is on: every permission below is bypassed and this backend enforces nothing. It is only ever active on a loopback bind — the
              service refuses to start dev-open on a public bind.
            </Notice>
          ) : (
            <Notice>Enforcement is ACTIVE. Rules below are applied to every request.</Notice>
          )}
          <h2>Defaults</h2>
          <DefaultsCard config={config} />
          <h2>Collections</h2>
          {tables.length ? (
            tables.map((name) => (
              <CollectionCard key={name} name={name} entry={(config.collections || {})[name] || {}} readonly={readonly} reload={load} />
            ))
          ) : (
            <EmptyState action={{ label: 'Create a collection in Schema', onClick: () => navigate('schema'), write: false }}>
              No collections to set permissions on yet.
            </EmptyState>
          )}
        </>
      ) : null}
    </Page>
  );
}

function DefaultsCard({ config }: { config: PermissionsConfig }) {
  return (
    <Card>
      <Row>
        <Hi>Backend defaults</Hi>
      </Row>
      <div class="grid2" style="margin-top:8px">
        {OPS.map((op) => (
          <Field key={op} label={'default ' + op}>
            <input type="text" value={cellText((config.defaults || {})[op])} disabled />
          </Field>
        ))}
      </div>
      <Sub style="margin:10px 0 0">
        Defaults, signup, file and function rules are edited through the whole-config route (PUT /admin/permissions) or MCP; this dashboard edits
        per-collection rules, which is where day-to-day operation lives.
      </Sub>
    </Card>
  );
}

function ruleText(value: Rule): string {
  return Array.isArray(value) ? value.join(',') : cellText(value);
}

function inputsFrom(entry: CollectionEntry): Record<string, string> {
  const out: Record<string, string> = {};
  OPS.forEach((op) => {
    out[op] = ruleText((entry.permissions || {})[op]);
  });
  return out;
}

function CollectionCard({ name, entry, readonly, reload }: { name: string; entry: CollectionEntry; readonly: boolean; reload: () => void }) {
  const [inputs, setInputs] = useState<Record<string, string>>(() => inputsFrom(entry));
  const [owns, setOwns] = useState(!!entry.creatorOwns);
  // The old page rebuilt every card on load; a fresh entry resets the fields the same way.
  useEffect(() => {
    setInputs(inputsFrom(entry));
    setOwns(!!entry.creatorOwns);
  }, [entry]);

  function save() {
    const permissions: Record<string, string | string[]> = {};
    OPS.forEach((op) => {
      const raw = (inputs[op] || '').trim();
      if (!raw) return;
      permissions[op] = raw.indexOf(',') === -1 ? raw : raw.split(',').map((s) => s.trim());
    });
    api('PUT', '/admin/permissions/collections/' + encode(name), { permissions, creatorOwns: owns })
      .then(() => {
        toast('Permissions saved for ' + name + '.', 'ok');
        reload();
      })
      .catch(fail);
  }

  function reset() {
    api('DELETE', '/admin/permissions/collections/' + encode(name))
      .then(() => {
        toast(name + ' reverted to defaults.', 'ok');
        reload();
      })
      .catch(fail);
  }

  const overridden = !!entry.permissions || entry.creatorOwns !== undefined;

  return (
    <Card>
      <Row>
        <Hi>{name}</Hi>
        {overridden ? <Chip kind="accent">overridden</Chip> : <Chip>defaults</Chip>}
        <Spacer />
        <WriteBtn tiny kind="primary" onClick={save}>
          Save
        </WriteBtn>
        <WriteBtn tiny onClick={reset}>
          Reset to defaults
        </WriteBtn>
      </Row>
      <div class="grid2" style="margin-top:8px">
        {OPS.map((op) => (
          <Field key={op} label={op}>
            <input
              type="text"
              value={inputs[op] || ''}
              placeholder="(default)"
              disabled={readonly}
              onInput={(e) => {
                const value = (e.currentTarget as HTMLInputElement).value;
                setInputs((prev) => ({ ...prev, [op]: value }));
              }}
            />
          </Field>
        ))}
      </div>
      <Check checked={owns} onChange={setOwns} disabled={readonly} style="margin-top:10px">
        creator-owns (stamp owner + a private ACL on create)
      </Check>
    </Card>
  );
}
