/**
 * Sign-in — BMG-010 §3.2. Identity providers and the passwordless policy.
 *
 * The single most valuable thing this page does is DISPLAY THE CALLBACK URL:
 * the redirect-URI mismatch is the most expensive mistake in setting up an
 * OAuth client. So *Add provider* is a three-step wizard in a drawer
 * (`#/signin/new`, `#/signin/<id>`): WHICH (tiles), REGISTER WITH THEM (the
 * callback URL first, big, with Copy, and the steps in that provider's own
 * words — after the base-URL warning, §5), PASTE BACK (client id, secret, and
 * *What we may read* as boxes from the preset's scope list). Nobody types a
 * scope. The redirect allow-list is *Where your app lives*: origins as chips,
 * refused inline without a scheme.
 *
 * 🔴 AC7: no space- or line-separated text field on this page.
 */
import { useEffect, useState } from 'preact/hooks';

import { api, encode, useSession } from '../api';
import { Chips, Drawer, EmptyState } from '../composers';
import {
  Preset,
  SavedProvider,
  TILES,
  Tile,
  WizardDraft,
  draftFor,
  draftFrom,
  draftId,
  draftProblem,
  idProblem,
  normaliseOrigin,
  originProblem,
  registerSteps,
  scopeBoxes,
  scopeListFor,
  stepMissing,
  wizardPayload
} from '../providerWizard';
import { navigate } from '../router';
import { Btn, Card, Check, Chip, Disclosure, Field, Gap, Hint, Notice, Page, Row, Spacer, Sub, Switch, Table, WriteBtn, confirmDestructive, copyText, fail, toast } from '../ui';
import type { ViewProps } from './index';

interface AuthConfig {
  providers?: SavedProvider[];
  magicLink?: { enabled?: boolean; ttlMinutes?: number; allowSignup?: boolean };
  linking?: { autoLinkVerifiedEmail?: boolean };
  redirectAllowList?: string[];
}

interface AuthData {
  config?: AuthConfig;
  presets?: Record<string, Preset>;
  /** `…/oauth/{id}/callback` — the URL a provider not yet saved will have (BMG-010). */
  callbackUrlTemplate?: string;
  baseUrl?: { url?: string; usedFallback?: boolean; warning?: string };
  magicLinkReady?: boolean;
  magicLinkNotReadyReason?: string;
}

/** The callback URL for an id, from the server's template. */
export function callbackFor(template: string | undefined, id: string): string {
  if (!template) return '';
  return template.replace('{id}', encodeURIComponent(id || '…'));
}

export function SignInView({ params }: ViewProps) {
  const { readonly } = useSession();
  const [data, setData] = useState<AuthData | null>(null);
  // Bumped on every load so the policy form re-initialises from the fresh config, as the old page rebuilt it.
  const [generation, setGeneration] = useState(0);
  const openId = params[0] || null;

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
    copyText(text).then((ok) => toast(ok ? 'Callback URL copied.' : 'Could not copy — select the URL in the table instead.', ok ? 'ok' : 'bad'));
  }

  function removeProvider(p: SavedProvider) {
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
  const providers = config.providers || [];
  const existing = openId && openId !== 'new' ? providers.find((p) => p.id === openId) || null : null;
  const drawerOpen = !!data && (openId === 'new' || !!existing);

  return (
    <Page title="Sign-in" subtitle="How the people using your app sign in: Google, GitHub or any OpenID Connect provider, and links by email.">
      {data ? (
        <div>
          {data.baseUrl && data.baseUrl.usedFallback ? <Notice kind="warn">{data.baseUrl.warning}</Notice> : null}
          <Row>
            <WriteBtn kind="primary" onClick={() => navigate('signin', 'new')}>
              Add provider
            </WriteBtn>
            <Btn onClick={load}>Refresh</Btn>
          </Row>
          <Gap />
          <Table
            columns={['Provider', 'Kind', 'Status', 'Callback URL to register', '']}
            rows={providers}
            empty={
              <EmptyState icon="⚿" action={{ label: 'Add provider', onClick: () => navigate('signin', 'new') }}>
                No sign-in providers yet. Add Google, GitHub or any OpenID Connect provider — three steps, starting with the URL they will ask you for.
              </EmptyState>
            }
            renderRow={(p) => {
              const missing = stepMissing(p);
              return (
                <tr key={p.id}>
                  <td>
                    <b>{p.displayName || p.id}</b>
                    <div class="sub">{p.id}</div>
                  </td>
                  <td>{p.kind === 'github' ? 'GitHub' : 'OpenID Connect'}</td>
                  <td>
                    {p.enabled ? <Chip kind="ok">enabled</Chip> : <Chip>disabled</Chip>}
                    {p.ready ? (
                      <Chip kind="ok">ready</Chip>
                    ) : (
                      <Chip kind="warn" title={p.notReadyReason || undefined}>
                        not ready
                      </Chip>
                    )}
                    {missing ? <div class="sub step-missing">{'Missing — ' + missing}</div> : null}
                  </td>
                  <td>
                    <code style="word-break:break-all">{p.callbackUrl}</code>
                  </td>
                  <td class="actions">
                    <Btn tiny onClick={() => copy(p.callbackUrl || '')}>
                      Copy URL
                    </Btn>
                    <WriteBtn tiny onClick={() => navigate('signin', p.id)}>
                      Edit
                    </WriteBtn>
                    <WriteBtn tiny kind="danger" onClick={() => removeProvider(p)}>
                      Remove
                    </WriteBtn>
                  </td>
                </tr>
              );
            }}
          />
          <PolicyForm key={generation} data={data} readonly={readonly} onSaved={load} />
          {drawerOpen ? (
            <ProviderWizard
              key={openId || 'new'}
              existing={existing}
              presets={data.presets || {}}
              callbackUrlTemplate={data.callbackUrlTemplate}
              baseUrlWarning={data.baseUrl && data.baseUrl.usedFallback ? data.baseUrl.warning || null : null}
              taken={providers.map((p) => p.id)}
              onClose={() => navigate('signin')}
              onSaved={() => {
                load();
                navigate('signin');
              }}
            />
          ) : null}
        </div>
      ) : null}
    </Page>
  );
}

// ------------------------------------------------------------------ policy --

/** Magic links, where the app lives, and account linking: one form, initialised from the loaded config. */
function PolicyForm({ data, readonly, onSaved }: { data: AuthData; readonly: boolean; onSaved: () => void }) {
  const config = data.config || {};
  const magic = config.magicLink || {};
  const [magicEnabled, setMagicEnabled] = useState(!!magic.enabled);
  const [magicTtl, setMagicTtl] = useState(String(magic.ttlMinutes === undefined ? 15 : magic.ttlMinutes));
  const [magicSignup, setMagicSignup] = useState(magic.allowSignup !== false);
  const [autoLink, setAutoLink] = useState((config.linking || {}).autoLinkVerifiedEmail !== false);
  const [origins, setOrigins] = useState<string[]>(config.redirectAllowList || []);

  function savePolicy() {
    api('PUT', '/admin/auth', {
      magicLink: {
        enabled: magicEnabled,
        ttlMinutes: Number(magicTtl) || 15,
        allowSignup: magicSignup
      },
      redirectAllowList: origins,
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
        <Switch checked={magicEnabled} disabled={readonly} onChange={setMagicEnabled}>
          People may sign in with a link sent to their email
        </Switch>
        <div class="grid2" style="margin-top:10px">
          <Field label="A link works for (minutes)">
            <input type="number" min={1} max={1440} value={magicTtl} disabled={readonly} onInput={(e) => setMagicTtl((e.currentTarget as HTMLInputElement).value)} />
          </Field>
        </div>
        <Row style="margin-top:10px">
          <Switch checked={magicSignup} disabled={readonly} onChange={setMagicSignup}>
            An address nobody has used yet may create an account
          </Switch>
        </Row>
      </Card>

      <h2>Where your app lives</h2>
      <Card id="app-origins">
        <Sub style="margin:0 0 8px">
          The web addresses your app is served from, e.g. https://app.example.com. After signing in, a person is only ever sent back to one of these or to this
          backend itself — that is what stops the sign-in callback being used to send people (and their fresh session) somewhere else. If your app is on another
          address than this backend and it is not listed here, every sign-in is refused before it starts.
        </Sub>
        <Chips items={origins} onChange={setOrigins} disabled={readonly} validate={originProblem} normalise={normaliseOrigin} placeholder="https://app.example.com" addLabel="Add address" />
      </Card>

      <h2>Account linking</h2>
      <Card>
        <Switch checked={autoLink} disabled={readonly} onChange={setAutoLink}>
          A provider sign-in joins an existing account with the same verified email address
        </Switch>
        <Sub style="margin:8px 0 0">
          Only a provider-verified address ever matches, and if the local account had never verified its own address, its password and sessions are
          revoked at the moment of linking — that is what stops someone registering your address before you do and keeping access afterwards. Every
          such event is in the audit trail as auth.link.credentials-revoked. Off means such a sign-in is refused rather than linked.
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

// ------------------------------------------------------------------ wizard --

type Step = 1 | 2 | 3;

const STEP_WORDS: Array<{ n: Step; label: string }> = [
  { n: 1, label: 'Which' },
  { n: 2, label: 'Register with them' },
  { n: 3, label: 'Paste back' }
];

interface WizardProps {
  existing: SavedProvider | null;
  presets: Record<string, Preset>;
  callbackUrlTemplate?: string;
  /** The base-URL fallback warning, shown BEFORE the callback URL (§5) — or null. */
  baseUrlWarning: string | null;
  taken: string[];
  onClose: () => void;
  onSaved: () => void;
}

export function ProviderWizard({ existing, presets, callbackUrlTemplate, baseUrlWarning, taken, onClose, onSaved }: WizardProps) {
  const [step, setStep] = useState<Step>(existing ? 3 : 1);
  const [draft, setDraft] = useState<WizardDraft>(() => (existing ? draftFrom(existing, presets) : draftFor('google', presets.google)));
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const preset = presets[draft.tile];
  const id = existing ? existing.id : draftId(draft);
  const callbackUrl = existing && existing.callbackUrl ? existing.callbackUrl : callbackFor(callbackUrlTemplate, id);
  const set = (patch: Partial<WizardDraft>) => setDraft({ ...draft, ...patch });
  const othersTaken = taken.filter((t) => !existing || t !== existing.id);

  function pickTile(tile: Tile) {
    if (existing) return;
    const fresh = draftFor(tile, presets[tile]);
    setDraft({ ...fresh, enabled: draft.enabled, allowSignup: draft.allowSignup });
  }

  /** Why step 1 cannot go on: a label, and for OIDC an issuer. */
  const step1Problem = (() => {
    if (!draft.displayName.trim()) return 'Give the sign-in button a label — what it says to your users.';
    if (draft.tile === 'oidc') {
      const issuer = draft.issuer.trim();
      if (!issuer) return 'The issuer URL is where this provider publishes its OpenID settings — it is on their developer page.';
      if (!/^https?:\/\/[^\s/]+/.test(issuer)) return 'The issuer is an https:// URL, e.g. https://login.example.com.';
    }
    return null;
  })();
  const idTrouble = existing ? null : idProblem(id, othersTaken);
  const problem = draftProblem(draft, existing, othersTaken);

  function save() {
    if (problem) {
      toast(problem, 'bad');
      return;
    }
    setSaving(true);
    api<{ provider?: SavedProvider }>('PUT', '/admin/auth/providers/' + encode(id), wizardPayload(draft, preset, existing))
      .then((result) => {
        const p = result && result.provider;
        const ready = !!(p && p.ready);
        toast(ready ? (p!.displayName || id) + ' is ready. Its callback URL is registered? Then people can sign in with it.' : 'Saved, but not usable yet: ' + ((p && p.notReadyReason) || 'something is missing.'), ready ? 'ok' : 'bad');
        onSaved();
      })
      .catch((e) => {
        setSaving(false);
        fail(e);
      });
  }

  function copy() {
    copyText(callbackUrl).then((ok) => {
      if (ok) {
        setCopied(true);
        toast('Callback URL copied.', 'ok');
        setTimeout(() => setCopied(false), 2500);
      } else {
        toast('The browser refused the clipboard. Select the URL and copy it by hand.', 'bad');
      }
    });
  }

  const scopes = scopeListFor(draft, preset, existing);
  const boxes = scopeBoxes(scopes);
  const tileDef = TILES.find((t) => t.id === draft.tile) || TILES[0];
  const text = (key: 'displayName' | 'issuer' | 'clientId' | 'clientSecret') => (e: Event) => set({ [key]: (e.currentTarget as HTMLInputElement).value } as Partial<WizardDraft>);

  const footer = (
    <Row>
      {step > 1 ? <Btn onClick={() => setStep((step - 1) as Step)}>Back</Btn> : null}
      <Spacer />
      {step < 3 ? (
        <Btn kind="primary" onClick={() => setStep((step + 1) as Step)} disabled={step === 1 ? !!step1Problem : !!idTrouble} title={step === 1 ? step1Problem || undefined : idTrouble || undefined}>
          Next
        </Btn>
      ) : (
        <WriteBtn kind="primary" onClick={save} disabled={saving || !!problem} title={problem || undefined}>
          {existing ? 'Save' : 'Add ' + (draft.displayName.trim() || 'provider')}
        </WriteBtn>
      )}
      <Btn onClick={onClose}>Cancel</Btn>
    </Row>
  );

  return (
    <Drawer title={existing ? 'Edit ' + (existing.displayName || existing.id) : 'Add a way to sign in'} onClose={onClose} wide footer={footer}>
      <ol class="wizard-steps" aria-label="Steps">
        {STEP_WORDS.map((s) => (
          <li key={s.n} class={s.n === step ? 'current' : s.n < step || existing ? 'done' : ''}>
            <button type="button" disabled={s.n > step && !existing} onClick={() => setStep(s.n)} aria-current={s.n === step ? 'step' : undefined}>
              <span class="num" aria-hidden="true">
                {s.n}
              </span>
              <span>{s.label}</span>
            </button>
          </li>
        ))}
      </ol>

      {step === 1 ? (
        <div class="wizard-step" id="step-which">
          <div class="tiles providers" role="radiogroup" aria-label="Which provider">
            {TILES.map((t) => (
              <label class={'tile' + (draft.tile === t.id ? ' on' : '')} key={t.id}>
                <input type="radio" name="provider-tile" value={t.id} checked={draft.tile === t.id} disabled={!!existing} aria-label={t.label} onChange={() => pickTile(t.id)} />
                <b>{t.label}</b>
                <span class="sub">{t.line}</span>
              </label>
            ))}
          </div>
          <div class="when-body">
            <Field label="What the sign-in button says">
              <input type="text" id="wiz-label" placeholder={draft.tile === 'oidc' ? 'e.g. Okta, Company SSO' : ''} value={draft.displayName} onInput={text('displayName')} />
            </Field>
            {draft.tile === 'oidc' ? (
              <Field label="Issuer URL">
                <input type="text" id="wiz-issuer" placeholder="https://login.example.com" value={draft.issuer} onInput={text('issuer')} />
              </Field>
            ) : null}
            {draft.tile === 'oidc' ? <Hint>{(preset && preset.note) || 'Any OpenID Connect issuer works by configuration alone.'}</Hint> : null}
            {step1Problem && (draft.displayName || draft.issuer) ? <Hint>{step1Problem}</Hint> : null}
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div class="wizard-step" id="step-register">
          {baseUrlWarning ? <Notice kind="warn">{baseUrlWarning}</Notice> : null}
          <div class="field">
            <span class="field-head">
              <b>{tileDef.label + ' will ask for a redirect URL. It is this one:'}</b>
            </span>
            <div class="secret-box mono callback-url" id="wiz-callback" data-callback={callbackUrl}>
              {callbackUrl}
            </div>
            <Row style="margin-top:8px">
              <Btn kind="primary" onClick={copy}>
                {copied ? 'Copied ✓' : 'Copy'}
              </Btn>
              {preset && preset.consoleUrl ? (
                <a class="btn" href={preset.consoleUrl} target="_blank" rel="noreferrer">
                  {'Open ' + tileDef.label + '’s console ↗'}
                </a>
              ) : null}
            </Row>
          </div>
          <div class="field">
            <span class="field-head">
              <b>Then, with them</b>
            </span>
            <ol class="wizard-list" id="wiz-register-steps">
              {registerSteps(draft.tile).map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ol>
          </div>
          {!existing ? (
            <Disclosure label="Advanced: the id in the URL">
              <Field label="Provider id">
                <input type="text" id="wiz-id" value={id} onInput={(e) => set({ id: (e.currentTarget as HTMLInputElement).value, idEdited: true })} />
              </Field>
              <Hint>{idTrouble || 'It names this provider in the callback URL and in your app. Changing it later means registering a new URL.'}</Hint>
            </Disclosure>
          ) : null}
        </div>
      ) : null}

      {step === 3 ? (
        <div class="wizard-step" id="step-paste">
          <div class="grid2">
            <Field label="Client id">
              <input type="text" id="wiz-client-id" value={draft.clientId} onInput={text('clientId')} />
            </Field>
            <Field label="Client secret">
              <input type="password" id="wiz-client-secret" placeholder={existing && existing.hasClientSecret ? '(unchanged)' : '(not set)'} value={draft.clientSecret} onInput={text('clientSecret')} />
            </Field>
          </div>
          <div class="field">
            <span class="field-head">
              <b>What we may read</b>
              <Hint>The ones sign-in needs are on and cannot be turned off.</Hint>
            </span>
            <div class="scope-boxes" id="wiz-scopes">
              {boxes.map((b) => (
                <Check key={b.id} checked={b.locked || draft.ticked.includes(b.id)} disabled={b.locked} onChange={(on) => set({ ticked: on ? [...draft.ticked, b.id] : draft.ticked.filter((x) => x !== b.id) })}>
                  <span data-scopes={b.scopes.join(' ')}>{b.label}</span>
                </Check>
              ))}
              {!boxes.length ? <Hint>This provider asks for nothing beyond signing in.</Hint> : null}
            </div>
          </div>
          <div class="when-body">
            <Switch checked={draft.allowSignup} onChange={(v) => set({ allowSignup: v })}>
              Someone new may create an account by signing in this way
            </Switch>
            <Switch checked={draft.enabled} onChange={(v) => set({ enabled: v })}>
              Shown on the sign-in page
            </Switch>
          </div>
          {problem && draft.clientId ? <Hint>{problem}</Hint> : null}
        </div>
      ) : null}
    </Drawer>
  );
}
