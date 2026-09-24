/**
 * Email — SMTP, the verification policy, a real test send, and the templates
 * with a reset back to the default. Ported as-is from the vanilla page
 * (BMG-001 §3.1); the settings form re-reads the server's values after every
 * save, exactly as the old page rebuilt its inputs.
 */
import { useEffect, useState } from 'preact/hooks';

import { api, encode, useSession } from '../api';
import { EmptyState } from '../composers';
import { cellText } from '../format';
import { Btn, Card, Check, Chip, Dialog, Field, Hi, Notice, Page, Row, Spacer, Sub, WriteBtn, fail, openModal, toast } from '../ui';
import type { ViewProps } from './index';

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

interface Template {
  id: string;
  overridden?: boolean;
  effective?: { subject?: string };
}

export function EmailView(_props: ViewProps) {
  const [data, setData] = useState<EmailConfigData | null>(null);
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [templatesUnavailable, setTemplatesUnavailable] = useState(false);
  const [generation, setGeneration] = useState(0);

  function load() {
    api<EmailConfigData>('GET', '/admin/email/config')
      .then((d) => {
        setData(d);
        setGeneration((g) => g + 1);
        setTemplates(null);
        setTemplatesUnavailable(false);
        api<{ templates?: Template[] }>('GET', '/admin/email/templates')
          .then((result) => setTemplates(result.templates || []))
          .catch(() => setTemplatesUnavailable(true));
      })
      .catch(fail);
  }
  useEffect(() => {
    load();
  }, []);

  function resetTemplate(t: Template) {
    api('DELETE', '/admin/email/templates/' + encode(t.id))
      .then(() => {
        toast('Template reset.', 'ok');
        load();
      })
      .catch(fail);
  }

  return (
    <Page title="Email" subtitle="SMTP, the verification policy, and a real test send.">
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
          <div>
            {templatesUnavailable ? <Notice>Templates are unavailable on this backend.</Notice> : null}
            {templates && !templates.length ? <EmptyState>No templates.</EmptyState> : null}
            {(templates || []).map((t) => (
              <Card key={t.id}>
                <Row>
                  <Hi>{t.id}</Hi>
                  {t.overridden ? <Chip kind="accent">overridden</Chip> : <Chip>default</Chip>}
                  <Spacer />
                  <WriteBtn tiny onClick={() => resetTemplate(t)}>
                    Reset to default
                  </WriteBtn>
                </Row>
                <Sub style="margin:8px 0 0">{'Subject: ' + cellText((t.effective || {}).subject)}</Sub>
              </Card>
            ))}
          </div>
        </div>
      ) : null}
    </Page>
  );
}

/** The settings form. Its state is the loaded config; the parent remounts it after every reload. */
function SettingsCard({ data, reload }: { data: EmailConfigData; reload: () => void }) {
  const { readonly } = useSession();
  const config = data.config || {};
  const smtp = config.smtp || {};
  const [enabled, setEnabled] = useState(!!config.enabled);
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
      <Check checked={enabled} onChange={setEnabled} disabled={readonly}>
        Sending enabled
      </Check>
      <div class="grid2" style="margin-top:10px">
        <Field label="SMTP host">
          <input type="text" value={host} disabled={readonly} onInput={text(setHost)} />
        </Field>
        <Field label="SMTP port">
          <input type="number" value={port} disabled={readonly} onInput={text(setPort)} />
        </Field>
        <Field label="Username">
          <input type="text" value={username} disabled={readonly} onInput={text(setUsername)} />
        </Field>
        <Field label="Password">
          <input type="password" placeholder={data.hasSmtpPassword ? '(unchanged)' : '(not set)'} value={password} disabled={readonly} onInput={text(setPassword)} />
        </Field>
        <Field label="From address">
          <input type="text" value={fromAddress} disabled={readonly} onInput={text(setFromAddress)} />
        </Field>
        <Field label="From name">
          <input type="text" value={fromName} disabled={readonly} onInput={text(setFromName)} />
        </Field>
        <Field label="Base URL (links in emails)">
          <input type="text" value={baseUrl} placeholder="https://api.example.com" disabled={readonly} onInput={text(setBaseUrl)} />
        </Field>
      </div>
      <Row style="margin-top:10px">
        <Check checked={secure} onChange={setSecure} disabled={readonly}>
          Implicit TLS (port 465)
        </Check>
        <Check checked={sendOnSignup} onChange={setSendOnSignup} disabled={readonly}>
          Send verification on signup
        </Check>
        <Check checked={requireForLogin} onChange={setRequireForLogin} disabled={readonly}>
          Require verified email to log in
        </Check>
      </Row>
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

function TestSendDialog({ close }: { close: () => void }) {
  const [to, setTo] = useState('');
  function send() {
    api('POST', '/admin/email/test', { to: to.trim() })
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
