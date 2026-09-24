/**
 * Sign-in — identity providers and the passwordless policy (BAK-004), ported
 * as-is from the vanilla page (BMG-001 §3.1).
 *
 * The single most valuable thing this view does is DISPLAY THE CALLBACK URL:
 * the redirect-URI mismatch is the most expensive mistake in setting up an
 * OAuth client, and it is entirely avoidable by never asking the operator to
 * assemble that string themselves.
 */
import { useEffect, useState } from 'preact/hooks';

import { api, encode, useSession } from '../api';
import { EmptyState } from '../composers';
import { Btn, Card, Check, Chip, Dialog, Field, Gap, Notice, Page, Row, Sub, Table, WriteBtn, confirmDestructive, fail, openModal, toast } from '../ui';
import type { ViewProps } from './index';

interface Provider {
  id: string;
  kind?: string;
  displayName?: string;
  enabled?: boolean;
  ready?: boolean;
  callbackUrl?: string;
  notReadyReason?: string;
  issuer?: string;
  clientId?: string;
  hasClientSecret?: boolean;
  scopes?: string[];
  allowSignup?: boolean;
}

interface Preset {
  note?: string;
  displayName?: string;
  issuer?: string;
  scopes?: string[];
}

interface AuthConfig {
  providers?: Provider[];
  magicLink?: { enabled?: boolean; ttlMinutes?: number; allowSignup?: boolean };
  linking?: { autoLinkVerifiedEmail?: boolean };
  redirectAllowList?: string[];
}

interface AuthData {
  config?: AuthConfig;
  presets?: Record<string, Preset>;
  baseUrl?: { usedFallback?: boolean; warning?: string };
  magicLinkReady?: boolean;
  magicLinkNotReadyReason?: string;
}

export function SignInView(_props: ViewProps) {
  const { readonly } = useSession();
  const [data, setData] = useState<AuthData | null>(null);
  // Bumped on every load so the policy form re-initialises from the fresh config, as the old page rebuilt it.
  const [generation, setGeneration] = useState(0);

  function load() {
    api<AuthData>('GET', '/admin/auth')
      .then((d) => {
        setData(d || {});
        setGeneration((g) => g + 1);
      })
      .catch(fail);
  }
  useEffect(() => {
    load();
  }, []);

  function copy(text: string) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        () => toast('Callback URL copied.', 'ok'),
        () => toast('Could not copy — select the URL in the table instead.', 'bad')
      );
      return;
    }
    toast('Copying is unavailable here — select the URL in the table instead.', 'bad');
  }

  function editProvider(existing: Provider | null) {
    const presets = (data && data.presets) || {};
    openModal((close) => <ProviderDialog existing={existing} presets={presets} close={close} onSaved={load} />);
  }

  function removeProvider(p: Provider) {
    confirmDestructive(
      'Remove provider',
      'Users with no password and no other provider will not be able to sign in. Their linked ' +
        'identities are kept, so re-adding "' + p.id + '" restores access.',
      p.id,
      () => {
        api('DELETE', '/admin/auth/providers/' + encode(p.id))
          .then(() => {
            toast('Provider removed.', 'ok');
            load();
          })
          .catch(fail);
      }
    );
  }

  const config = (data && data.config) || {};

  return (
    <Page title="Sign-in" subtitle="How end users of your app sign in: identity providers and passwordless email links.">
      {data ? (
        <div>
          {data.baseUrl && data.baseUrl.usedFallback ? <Notice kind="warn">{data.baseUrl.warning}</Notice> : null}
          <Row>
            <WriteBtn kind="primary" onClick={() => editProvider(null)}>
              Add provider
            </WriteBtn>
            <Btn onClick={load}>Refresh</Btn>
          </Row>
          <Gap />
          <Table
            columns={['Provider', 'Kind', 'Status', 'Callback URL to register', '']}
            rows={config.providers || []}
            empty={
              <EmptyState icon="⚿" action={{ label: 'Add provider', onClick: () => editProvider(null) }}>
                No sign-in providers yet. Add Google, GitHub or any OpenID Connect provider.
              </EmptyState>
            }
            renderRow={(p) => (
              <tr key={p.id}>
                <td>
                  <b>{p.displayName || p.id}</b>
                  <div class="sub">{p.id}</div>
                </td>
                <td>{p.kind === 'github' ? 'GitHub' : 'OpenID Connect'}</td>
                <td>
                  {p.enabled ? <Chip kind="ok">enabled</Chip> : <Chip>disabled</Chip>}
                  {p.ready ? <Chip kind="ok">ready</Chip> : <Chip kind="warn">incomplete</Chip>}
                </td>
                <td>
                  <code style="word-break:break-all">{p.callbackUrl}</code>
                  {p.notReadyReason ? <div class="sub">{p.notReadyReason}</div> : null}
                </td>
                <td class="actions">
                  <Btn tiny onClick={() => copy(p.callbackUrl || '')}>
                    Copy URL
                  </Btn>
                  <WriteBtn tiny onClick={() => editProvider(p)}>
                    Edit
                  </WriteBtn>
                  <WriteBtn tiny kind="danger" onClick={() => removeProvider(p)}>
                    Remove
                  </WriteBtn>
                </td>
              </tr>
            )}
          />
          <PolicyForm key={generation} data={data} readonly={readonly} onSaved={load} />
        </div>
      ) : null}
    </Page>
  );
}

/** Magic links, the redirect allow-list and account linking: one form, initialised from the loaded config. */
function PolicyForm({ data, readonly, onSaved }: { data: AuthData; readonly: boolean; onSaved: () => void }) {
  const config = data.config || {};
  const magic = config.magicLink || {};
  const [magicEnabled, setMagicEnabled] = useState(!!magic.enabled);
  const [magicTtl, setMagicTtl] = useState(String(magic.ttlMinutes === undefined ? 15 : magic.ttlMinutes));
  const [magicSignup, setMagicSignup] = useState(magic.allowSignup !== false);
  const [autoLink, setAutoLink] = useState((config.linking || {}).autoLinkVerifiedEmail !== false);
  const [allowList, setAllowList] = useState((config.redirectAllowList || []).join('\n'));

  function savePolicy() {
    api('PUT', '/admin/auth', {
      magicLink: {
        enabled: magicEnabled,
        ttlMinutes: Number(magicTtl) || 15,
        allowSignup: magicSignup
      },
      redirectAllowList: allowList
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      linking: { autoLinkVerifiedEmail: autoLink }
    })
      .then(() => {
        toast('Sign-in policy saved.', 'ok');
        onSaved();
      })
      .catch(fail);
  }

  return (
    <div>
      <h2>Magic links</h2>
      <Card>
        {!data.magicLinkReady && data.magicLinkNotReadyReason ? <Notice kind="warn">{data.magicLinkNotReadyReason}</Notice> : null}
        <Check checked={magicEnabled} disabled={readonly} onChange={setMagicEnabled}>
          Magic-link sign-in enabled
        </Check>
        <div class="grid2" style="margin-top:10px">
          <Field label="Link lifetime (minutes)">
            <input type="number" value={magicTtl} disabled={readonly} onInput={(e) => setMagicTtl((e.currentTarget as HTMLInputElement).value)} />
          </Field>
        </div>
        <Row style="margin-top:10px">
          <Check checked={magicSignup} disabled={readonly} onChange={setMagicSignup}>
            An unknown address may create an account
          </Check>
        </Row>
      </Card>

      <h2>Redirect allow-list</h2>
      <Card>
        <Sub style="margin:0 0 8px">
          One app origin per line. A completed sign-in may only be redirected to this backend’s own origin or to one of these — which is what stops
          the callback being used as an open redirect. If your app is served from a different origin than this backend, add it here or every sign-in
          is refused before it starts.
        </Sub>
        <textarea placeholder="https://app.example.com" value={allowList} disabled={readonly} onInput={(e) => setAllowList((e.currentTarget as HTMLTextAreaElement).value)} />
      </Card>

      <h2>Account linking</h2>
      <Card>
        <Check checked={autoLink} disabled={readonly} onChange={setAutoLink}>
          Link a provider sign-in to an existing account with the same VERIFIED address
        </Check>
        <Sub style="margin:8px 0 0">
          Only a provider-verified address ever matches, and if the local account had never verified its own address, its password and sessions are
          revoked at the moment of linking — that is what stops someone registering your address before you do and keeping access afterwards. Every
          such event is in the audit trail as auth.link.credentials-revoked. Turning this off means such a sign-in is refused rather than linked.
        </Sub>
      </Card>

      <Row style="margin-top:12px">
        <WriteBtn kind="primary" onClick={savePolicy}>
          Save policy
        </WriteBtn>
      </Row>
    </div>
  );
}

interface ProviderForm {
  id: string;
  preset: string;
  displayName: string;
  issuer: string;
  clientId: string;
  clientSecret: string;
  scopes: string;
  enabled: boolean;
  allowSignup: boolean;
}

/**
 * Fill the form from the preset so the operator sees what will be saved rather
 * than discovering it afterwards. Only a new provider is filled; an existing
 * one keeps its settings and the preset only travels with the save.
 */
function applyPreset(form: ProviderForm, presets: Record<string, Preset>, isNew: boolean): ProviderForm {
  const preset = presets[form.preset];
  if (!preset || !isNew) return form;
  return {
    ...form,
    id: form.id || (form.preset === 'oidc' ? '' : form.preset),
    displayName: preset.displayName || '',
    issuer: preset.issuer || '',
    scopes: (preset.scopes || []).join(' ')
  };
}

function ProviderDialog({ existing, presets, close, onSaved }: { existing: Provider | null; presets: Record<string, Preset>; close: () => void; onSaved: () => void }) {
  const isNew = !existing;
  const [form, setForm] = useState<ProviderForm>(() =>
    applyPreset(
      {
        id: existing ? existing.id : '',
        preset: isNew ? 'google' : '',
        displayName: existing ? existing.displayName || '' : '',
        issuer: existing ? existing.issuer || '' : '',
        clientId: existing ? existing.clientId || '' : '',
        clientSecret: '',
        scopes: existing ? (existing.scopes || []).join(' ') : '',
        enabled: existing ? !!existing.enabled : true,
        allowSignup: existing ? existing.allowSignup !== false : true
      },
      presets,
      isNew
    )
  );
  const preset = presets[form.preset];
  const hint = preset ? preset.note || '' : '';

  function save() {
    const providerId = (isNew ? form.id : existing!.id).trim();
    if (!providerId) {
      toast('A provider id is required.', 'bad');
      return;
    }
    const payload: Record<string, unknown> = {
      displayName: form.displayName.trim(),
      issuer: form.issuer.trim(),
      clientId: form.clientId.trim(),
      scopes: form.scopes.split(/\s+/).filter(Boolean),
      enabled: form.enabled,
      allowSignup: form.allowSignup
    };
    if (form.preset) payload.preset = form.preset;
    if (form.clientSecret) payload.clientSecret = form.clientSecret;
    api<{ provider?: Provider }>('PUT', '/admin/auth/providers/' + encode(providerId), payload)
      .then((result) => {
        close();
        const ready = !!(result && result.provider && result.provider.ready);
        toast(
          ready
            ? 'Provider saved. Register this callback URL with the provider: ' + result.provider!.callbackUrl
            : 'Provider saved, but not usable yet: ' + (result && result.provider && result.provider.notReadyReason),
          ready ? 'ok' : 'bad'
        );
        onSaved();
      })
      .catch(fail);
  }

  const text = (key: keyof ProviderForm) => (e: Event) => setForm({ ...form, [key]: (e.currentTarget as HTMLInputElement).value });

  return (
    <Dialog
      title={isNew ? 'Add sign-in provider' : 'Edit ' + (existing!.displayName || existing!.id)}
      actions={
        <>
          <Btn onClick={close}>Cancel</Btn>
          <Btn kind="primary" onClick={save}>
            Save
          </Btn>
        </>
      }
    >
      <div class="grid2">
        <Field label="Preset">
          <select value={form.preset} onChange={(e) => setForm(applyPreset({ ...form, preset: (e.currentTarget as HTMLSelectElement).value }, presets, isNew))}>
            {['', 'google', 'github', 'oidc'].map((name) => (
              <option key={name} value={name}>
                {name || '(keep current settings)'}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Provider id (appears in the callback URL)">
          <input type="text" placeholder="google" value={form.id} disabled={!isNew} onInput={text('id')} />
        </Field>
        <Field label="Button label">
          <input type="text" value={form.displayName} onInput={text('displayName')} />
        </Field>
        <Field label="Issuer URL (OIDC only)">
          <input type="text" placeholder="https://accounts.google.com" value={form.issuer} onInput={text('issuer')} />
        </Field>
        <Field label="Client id">
          <input type="text" value={form.clientId} onInput={text('clientId')} />
        </Field>
        <Field label="Client secret">
          <input type="password" placeholder={existing && existing.hasClientSecret ? '(unchanged)' : '(not set)'} value={form.clientSecret} onInput={text('clientSecret')} />
        </Field>
        <Field label="Scopes (space separated)">
          <input type="text" value={form.scopes} onInput={text('scopes')} />
        </Field>
      </div>
      <Row style="margin-top:10px">
        <Check checked={form.enabled} onChange={(v) => setForm({ ...form, enabled: v })}>
          Enabled
        </Check>
        <Check checked={form.allowSignup} onChange={(v) => setForm({ ...form, allowSignup: v })}>
          May create new accounts
        </Check>
      </Row>
      <Sub>{hint}</Sub>
      {existing ? <Sub>{'Callback URL: ' + existing.callbackUrl}</Sub> : null}
    </Dialog>
  );
}
