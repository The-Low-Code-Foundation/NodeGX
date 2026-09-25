/**
 * Email — BMG-010 §3.1. A provider is picked from tiles that fill host, port
 * and TLS and say which credential it wants; the verification policy sits
 * under *When someone signs up*; each template opens a drawer
 * (`#/email/<templateId>`) with the subject, the body, a bar of placeholder
 * chips READ FROM THE BACKEND (AC3 — a chip for a name the sender does not
 * supply cannot exist here), a preview rendered by the server on every change
 * (never in the page, §5), *Send me this* through the same test-send route with
 * the draft, and *Reset to default* in a danger row. HTML stays behind
 * *Edit HTML*.
 *
 * 🔴 AC7: no space- or line-separated text field on this page.
 */
import { useEffect, useRef, useState } from 'preact/hooks';

import { api, encode, useSession } from '../api';
import { DangerZone, Drawer, EmptyState } from '../composers';
import { cellText } from '../format';
import { navigate } from '../router';
import { SES_REGIONS, SMTP_PRESETS, SmtpPreset, fillFrom, presetById, presetFor } from '../smtpPresets';
import { Btn, Card, Check, Chip, Dialog, Disclosure, Field, Hi, Hint, Notice, Page, Row, Spacer, Sub, Switch, WriteBtn, confirmSimple, fail, openModal, toast } from '../ui';
import type { ViewProps } from './index';

// ------------------------------------------------------------------ types --

interface EmailConfig {
  enabled?: boolean;
  smtp?: { host?: string; port?: number; secure?: boolean; username?: string };
  fromAddress?: string;
  fromName?: string;
  baseUrl?: string;
  verification?: { sendOnSignup?: boolean; requireForLogin?: boolean };
}

interface EmailConfigData {
  configured?: boolean;
  notConfiguredReason?: string;
  hasSmtpPassword?: boolean;
  config?: EmailConfig;
}

export interface TemplateVariable {
  name: string;
  label: string;
  sample: string;
}

export interface TemplateText {
  subject: string;
  text: string;
  html: string;
}

export interface Template {
  id: string;
  isOverridden?: boolean;
  override?: Partial<TemplateText> | null;
  default?: TemplateText;
  effective?: Partial<TemplateText>;
  variables?: TemplateVariable[];
}

// ------------------------------------------------------------------ words --

/** The three templates the backend ships, in words (`email/templates.ts` TEMPLATE_IDS). */
export const TEMPLATE_WORDS: Record<string, { title: string; line: string }> = {
  passwordReset: { title: 'Password reset', line: 'Sent when someone asks to reset their password.' },
  verifyEmail: { title: 'Verify your email', line: 'Sent on sign-up when verification is on, and when someone asks again.' },
  magicLink: { title: 'Sign-in link', line: 'Sent when someone signs in with a link instead of a password.' }
};

export function templateTitle(id: string): string {
  return (TEMPLATE_WORDS[id] || { title: id }).title;
}

/** `{{name}}` as a chip inserts it. */
export function tokenFor(name: string): string {
  return '{{' + name + '}}';
}

/** Insert a token at a caret (replacing a selection); the caret lands after it. Pure, so the spec can hold it. */
export function insertToken(value: string, start: number, end: number, token: string): { value: string; caret: number } {
  const a = Math.max(0, Math.min(start, value.length));
  const b = Math.max(a, Math.min(end, value.length));
  return { value: value.slice(0, a) + token + value.slice(b), caret: a + token.length };
}

const TEST_TO_KEY = 'nodegx.admin.email.testTo';

function rememberedAddress(): string {
  try {
    return localStorage.getItem(TEST_TO_KEY) || '';
  } catch {
    return '';
  }
}

function rememberAddress(to: string): void {
  try {
    localStorage.setItem(TEST_TO_KEY, to);
  } catch {
    /* private mode */
  }
}

// ------------------------------------------------------------------- page --

export function EmailView({ params }: ViewProps) {
  const [data, setData] = useState<EmailConfigData | null>(null);
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [templatesUnavailable, setTemplatesUnavailable] = useState(false);
  const [generation, setGeneration] = useState(0);
  const openId = params[0] || null;

  function loadTemplates() {
    setTemplatesUnavailable(false);
    return api<{ templates?: Template[] }>('GET', '/admin/email/templates')
      .then((result) => setTemplates(result.templates || []))
      .catch(() => setTemplatesUnavailable(true));
  }

  function load() {
    api<EmailConfigData>('GET', '/admin/email/config')
      .then((d) => {
        setData(d);
        setGeneration((g) => g + 1);
        loadTemplates();
      })
      .catch(fail);
  }
  useEffect(() => {
    load();
  }, []);

  const open = openId && templates ? templates.find((t) => t.id === openId) || null : null;

  return (
    <Page title="Email" subtitle="Which provider sends your mail, what happens when someone signs up, and the three messages your app sends.">
      {data ? (
        <div>
          {data.configured ? (
            <Notice>Email is configured and enabled.</Notice>
          ) : (
            <Notice kind="warn">
              {'Email is NOT configured: ' + (data.notConfiguredReason || 'unknown reason') + '. Sends fail loudly into execution records rather than queueing.'}
            </Notice>
          )}
          <SettingsCard key={generation} data={data} reload={load} />
          <h2>Templates</h2>
          <Sub style="margin:0 0 8px">Each message is plain text with names in double braces the backend fills in when it sends. Open one to change its words and see it rendered.</Sub>
          <div>
            {templatesUnavailable ? <Notice>Templates are unavailable on this backend.</Notice> : null}
            {templates && !templates.length ? <EmptyState>No templates.</EmptyState> : null}
            {(templates || []).map((t) => (
              <Card key={t.id} class="template-card">
                <Row>
                  <Hi>{templateTitle(t.id)}</Hi>
                  {t.isOverridden ? <Chip kind="accent">edited</Chip> : <Chip>default</Chip>}
                  <Spacer />
                  <Btn tiny onClick={() => navigate('email', t.id)}>
                    Edit
                  </Btn>
                </Row>
                <Sub style="margin:6px 0 0">{(TEMPLATE_WORDS[t.id] || { line: '' }).line}</Sub>
                <Sub style="margin:4px 0 0">{'Subject: ' + cellText((t.effective || {}).subject)}</Sub>
              </Card>
            ))}
          </div>
          {open ? (
            <TemplateDrawer
              key={open.id}
              template={open}
              onClose={() => navigate('email')}
              onChanged={() => {
                loadTemplates();
              }}
            />
          ) : null}
        </div>
      ) : null}
    </Page>
  );
}

// --------------------------------------------------------------- settings --

/** The settings form. Its state is the loaded config; the parent remounts it after every reload. */
function SettingsCard({ data, reload }: { data: EmailConfigData; reload: () => void }) {
  const { readonly } = useSession();
  const config = data.config || {};
  const smtp = config.smtp || {};
  const found = presetFor(cellText(smtp.host));
  const [enabled, setEnabled] = useState(!!config.enabled);
  const [presetId, setPresetId] = useState<string>(found.preset.id);
  const [region, setRegion] = useState(found.region || SES_REGIONS[0]);
  const [host, setHost] = useState(cellText(smtp.host));
  const [port, setPort] = useState(smtp.port === undefined ? '' : String(smtp.port));
  const [secure, setSecure] = useState(!!smtp.secure);
  const [username, setUsername] = useState(cellText(smtp.username));
  const [password, setPassword] = useState('');
  const [fromAddress, setFromAddress] = useState(cellText(config.fromAddress));
  const [fromName, setFromName] = useState(cellText(config.fromName));
  const [baseUrl, setBaseUrl] = useState(cellText(config.baseUrl));
  const [sendOnSignup, setSendOnSignup] = useState(!!(config.verification && config.verification.sendOnSignup));
  const [requireForLogin, setRequireForLogin] = useState(!!(config.verification && config.verification.requireForLogin));
  const preset = presetById(presetId);

  function pick(p: SmtpPreset, r: string = region) {
    setPresetId(p.id);
    if (p.id === 'other') return;
    const filled = fillFrom(p, r);
    setHost(filled.host);
    setPort(filled.port);
    setSecure(filled.secure);
  }

  function save() {
    const patch = {
      enabled,
      smtp: {
        host: host.trim(),
        port: port ? Number(port) : undefined,
        secure,
        username: username.trim()
      },
      fromAddress: fromAddress.trim(),
      fromName: fromName.trim(),
      baseUrl: baseUrl.trim(),
      verification: { sendOnSignup, requireForLogin }
    };
    const payload: { config: typeof patch; smtpPassword?: string } = { config: patch };
    if (password) payload.smtpPassword = password;
    api('PUT', '/admin/email/config', payload)
      .then(() => {
        toast('Email settings saved.', 'ok');
        reload();
      })
      .catch(fail);
  }

  function testSend() {
    openModal((close) => <TestSendDialog close={close} />);
  }

  const text = (set: (v: string) => void) => (e: Event) => set((e.currentTarget as HTMLInputElement).value);

  return (
    <Card>
      <Switch checked={enabled} onChange={setEnabled} disabled={readonly}>
        Sending is on
      </Switch>

      <div class="drawer-section">Who sends it</div>
      <div class="tiles providers" role="radiogroup" aria-label="Email provider">
        {SMTP_PRESETS.map((p) => (
          <label class={'tile' + (presetId === p.id ? ' on' : '')} key={p.id}>
            <input type="radio" name="smtp-preset" value={p.id} checked={presetId === p.id} disabled={readonly} aria-label={p.label} onChange={() => pick(p)} />
            <b>{p.label}</b>
            <span class="sub">{p.line}</span>
          </label>
        ))}
      </div>
      {preset.id === 'ses' ? (
        <div class="when-body" style="margin-top:8px">
          <Field label="Region">
            <select
              value={region}
              disabled={readonly}
              aria-label="SES region"
              onChange={(e) => {
                const r = (e.currentTarget as HTMLSelectElement).value;
                setRegion(r);
                pick(preset, r);
              }}
            >
              {SES_REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Field>
        </div>
      ) : null}
      {preset.id !== 'other' ? (
        <Hint>
          <span id="preset-hint">
            {'Username: ' + preset.usernameHint + '. Password: ' + preset.passwordHint + '. '}
            {preset.credentialUrl ? (
              <a href={preset.credentialUrl} target="_blank" rel="noreferrer">
                {preset.credentialLabel} ↗
              </a>
            ) : null}
          </span>
        </Hint>
      ) : null}

      <div class="grid2" style="margin-top:10px">
        <Field label="SMTP host">
          <input type="text" id="smtp-host" value={host} disabled={readonly} onInput={text(setHost)} />
        </Field>
        <Field label="SMTP port">
          <input type="number" id="smtp-port" value={port} disabled={readonly} onInput={text(setPort)} />
        </Field>
        <Field label="Username">
          <input type="text" id="smtp-username" placeholder={preset.id !== 'other' ? preset.usernameHint : ''} value={username} disabled={readonly} onInput={text(setUsername)} />
        </Field>
        <Field label="Password">
          <input
            type="password"
            id="smtp-password"
            placeholder={data.hasSmtpPassword ? '(unchanged)' : preset.id !== 'other' ? preset.passwordHint : '(not set)'}
            value={password}
            disabled={readonly}
            onInput={text(setPassword)}
          />
        </Field>
        <Field label="From address">
          <input type="text" id="smtp-from" value={fromAddress} disabled={readonly} onInput={text(setFromAddress)} />
        </Field>
        <Field label="From name">
          <input type="text" value={fromName} disabled={readonly} onInput={text(setFromName)} />
        </Field>
        <Field label="Base URL (links in emails)">
          <input type="text" id="smtp-baseurl" value={baseUrl} placeholder="https://api.example.com" disabled={readonly} onInput={text(setBaseUrl)} />
        </Field>
      </div>
      <Row style="margin-top:10px">
        <Check checked={secure} onChange={setSecure} disabled={readonly}>
          Implicit TLS (port 465)
        </Check>
      </Row>

      <div class="drawer-section">When someone signs up</div>
      <div class="when-body" id="signup-policy">
        <Switch checked={sendOnSignup} onChange={setSendOnSignup} disabled={readonly}>
          Send them a verification email
        </Switch>
        <Switch checked={requireForLogin} onChange={setRequireForLogin} disabled={readonly}>
          They cannot sign in until they have verified
        </Switch>
      </div>

      <Row style="margin-top:12px">
        <WriteBtn tiny kind="primary" onClick={save}>
          Save
        </WriteBtn>
        <WriteBtn tiny onClick={testSend}>
          Send test email
        </WriteBtn>
      </Row>
    </Card>
  );
}

// ------------------------------------------------------------- the drawer --

type Part = 'subject' | 'text' | 'html';

function TemplateDrawer({ template, onClose, onChanged }: { template: Template; onClose: () => void; onChanged: () => void }) {
  const { readonly } = useSession();
  const effective = { ...(template.default || { subject: '', text: '', html: '' }), ...(template.effective || {}) } as TemplateText;
  const [subject, setSubject] = useState(effective.subject || '');
  const [text, setText] = useState(effective.text || '');
  const [html, setHtml] = useState(effective.html || '');
  const [preview, setPreview] = useState<TemplateText | null>(null);
  const [previewProblem, setPreviewProblem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const focused = useRef<Part>('text');
  const subjectRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const htmlRef = useRef<HTMLTextAreaElement>(null);
  const caret = useRef<{ part: Part; at: number } | null>(null);
  const seq = useRef(0);
  const variables = template.variables || [];
  const dirty = subject !== (effective.subject || '') || text !== (effective.text || '') || html !== (effective.html || '');

  // The preview is the server's rendering of THIS draft (§5): asked after a short pause on every change.
  useEffect(() => {
    const mine = ++seq.current;
    const handle = setTimeout(() => {
      const q = new URLSearchParams({ subject, text, html }).toString();
      api<{ preview?: TemplateText }>('GET', '/admin/email/templates/' + encode(template.id) + '/preview?' + q)
        .then((r) => {
          if (seq.current !== mine) return;
          setPreview(r.preview || null);
          setPreviewProblem(null);
        })
        .catch((e: Error) => {
          if (seq.current !== mine) return;
          setPreviewProblem(e.message);
        });
    }, 300);
    return () => clearTimeout(handle);
  }, [subject, text, html, template.id]);

  // After a chip inserts, put the caret after the token in the field it went into.
  useEffect(() => {
    const c = caret.current;
    if (!c) return;
    caret.current = null;
    const el = c.part === 'subject' ? subjectRef.current : c.part === 'text' ? textRef.current : htmlRef.current;
    if (el) {
      el.focus();
      try {
        el.setSelectionRange(c.at, c.at);
      } catch {
        /* a type that has no selection */
      }
    }
  });

  function insert(name: string) {
    const part = focused.current;
    const el = part === 'subject' ? subjectRef.current : part === 'text' ? textRef.current : htmlRef.current;
    const value = part === 'subject' ? subject : part === 'text' ? text : html;
    const start = el && el.selectionStart !== null ? el.selectionStart : value.length;
    const end = el && el.selectionEnd !== null ? el.selectionEnd : start;
    const next = insertToken(value, start, end, tokenFor(name));
    (part === 'subject' ? setSubject : part === 'text' ? setText : setHtml)(next.value);
    caret.current = { part, at: next.caret };
  }

  function save() {
    setSaving(true);
    api('PUT', '/admin/email/templates/' + encode(template.id), { subject, text, html })
      .then(() => {
        toast('Template saved.', 'ok');
        onChanged();
      })
      .catch(fail)
      .then(() => setSaving(false));
  }

  function reset() {
    api('DELETE', '/admin/email/templates/' + encode(template.id))
      .then(() => {
        toast('Back to the default.', 'ok');
        onChanged();
      })
      .catch(fail);
  }

  function sendMe() {
    openModal((close) => (
      <SendMeDialog
        close={close}
        send={(to) =>
          api<{ sent?: TemplateText }>('POST', '/admin/email/test', { to, template: template.id, subject, text, html }).then(() => {
            toast('Sent to ' + to + '.', 'ok');
          })
        }
      />
    ));
  }

  const words = TEMPLATE_WORDS[template.id] || { title: template.id, line: '' };
  const onFocus = (part: Part) => () => {
    focused.current = part;
  };

  return (
    <Drawer title={words.title} subtitle={words.line} onClose={onClose} wide footer={
      <Row>
        <WriteBtn kind="primary" onClick={save} disabled={saving || !dirty}>
          Save
        </WriteBtn>
        <WriteBtn onClick={sendMe}>Send me this</WriteBtn>
        <Spacer />
        <Btn onClick={onClose}>Close</Btn>
      </Row>
    }>
      <Field label="Subject">
        <input type="text" id="tpl-subject" ref={subjectRef} value={subject} disabled={readonly} onFocus={onFocus('subject')} onInput={(e) => setSubject((e.currentTarget as HTMLInputElement).value)} />
      </Field>

      <div class="field">
        <span class="field-head">
          <b>Names you can drop in</b>
        </span>
        <div class="placeholder-bar" role="toolbar" aria-label="Placeholders">
          {variables.map((v) => (
            <button type="button" class="chip accent" key={v.name} data-placeholder={v.name} title={'Inserts ' + tokenFor(v.name) + ' — e.g. ' + v.sample} disabled={readonly} onClick={() => insert(v.name)}>
              {v.label}
            </button>
          ))}
          {!variables.length ? <Hint>This backend did not say which names this message may use.</Hint> : null}
        </div>
        <Hint>Click one to drop it where the cursor is. The backend fills it in when it sends.</Hint>
      </div>

      <Field label="Body">
        <textarea id="tpl-text" ref={textRef} rows={9} value={text} disabled={readonly} onFocus={onFocus('text')} onInput={(e) => setText((e.currentTarget as HTMLTextAreaElement).value)} />
      </Field>

      <div class="field">
        <span class="field-head">
          <b>Preview</b>
          <Hint>Rendered by the backend with sample values, exactly as it would send.</Hint>
        </span>
        <div class="preview-pane" id="tpl-preview" aria-live="polite">
          {previewProblem ? <Notice kind="bad">{previewProblem}</Notice> : null}
          {preview ? (
            <>
              <div class="preview-subject">{preview.subject}</div>
              <pre>{preview.text}</pre>
            </>
          ) : (
            <Hint>Rendering…</Hint>
          )}
        </div>
      </div>

      <Disclosure label="Edit HTML">
        <Sub style="margin:0 0 6px">The HTML version, for mail apps that show it. Most people never need to touch this; the plain body above is always sent too.</Sub>
        <textarea id="tpl-html" ref={htmlRef} rows={8} value={html} disabled={readonly} onFocus={onFocus('html')} onInput={(e) => setHtml((e.currentTarget as HTMLTextAreaElement).value)} />
        {preview ? (
          <div class="field" style="margin-top:8px">
            <span class="field-head">
              <b>Rendered HTML, as source</b>
            </span>
            <pre class="preview-pane mono" id="tpl-html-preview">{preview.html}</pre>
          </div>
        ) : null}
      </Disclosure>

      {template.isOverridden ? (
        <DangerZone>
          <div class="danger-action">
            <div class="danger-why">Throws away your words for this message; the backend sends its own again.</div>
            <WriteBtn kind="danger" onClick={() => confirmSimple('Reset to default', 'Your edited subject, body and HTML for “' + words.title + '” are discarded. The shipped default is sent from now on.', reset, 'Reset to default')}>
              Reset to default
            </WriteBtn>
          </div>
        </DangerZone>
      ) : null}
    </Drawer>
  );
}

function SendMeDialog({ close, send }: { close: () => void; send: (to: string) => Promise<void> }) {
  const [to, setTo] = useState(rememberedAddress());
  const [busy, setBusy] = useState(false);
  function go() {
    const addr = to.trim();
    if (!addr) return;
    setBusy(true);
    rememberAddress(addr);
    send(addr)
      .then(close)
      .catch((e) => {
        setBusy(false);
        fail(e);
      });
  }
  return (
    <Dialog
      title="Send me this"
      actions={
        <>
          <Btn onClick={close}>Cancel</Btn>
          <Btn kind="primary" onClick={go} disabled={busy}>
            Send
          </Btn>
        </>
      }
    >
      <Sub>Sends this message as it is now — saved or not — with the sample values, through your SMTP, to one address.</Sub>
      <input type="email" id="send-me-to" placeholder="you@example.com" style="width:100%" value={to} onInput={(e) => setTo((e.currentTarget as HTMLInputElement).value)} onKeyDown={(e) => e.key === 'Enter' && go()} />
    </Dialog>
  );
}

function TestSendDialog({ close }: { close: () => void }) {
  const [to, setTo] = useState(rememberedAddress());
  function send() {
    const addr = to.trim();
    rememberAddress(addr);
    api('POST', '/admin/email/test', { to: addr })
      .then(() => {
        close();
        toast('Test email sent.', 'ok');
      })
      .catch(fail);
  }
  return (
    <Dialog
      title="Send a test email"
      actions={
        <>
          <Btn onClick={close}>Cancel</Btn>
          <Btn kind="primary" onClick={send}>
            Send
          </Btn>
        </>
      }
    >
      <Sub>This sends a real message through the configured SMTP right now, and reports the failure reason if it cannot.</Sub>
      <input type="email" placeholder="you@example.com" style="width:100%" value={to} onInput={(e) => setTo((e.currentTarget as HTMLInputElement).value)} />
    </Dialog>
  );
}
