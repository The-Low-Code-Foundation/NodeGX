/**
 * BMG-017 row 3 — the magic-link email's preview says how long the link lasts.
 *
 * The real email says the configured lifetime (`oauth-routes.ts`
 * `sendMagicLink`, from `magicLink.ttlMinutes`); the preview and *Send me
 * this* filled `{{expiresIn}}` from a fixed sample, *15 minutes*. Set the
 * lifetime to 60 and the preview still said 15. Now the preview, the test
 * send, the chip's sample and the real email all say the same words, from one
 * function.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import type { TemplateListResponse, TemplatePreviewResponse, TestSendResponse } from '../src/server/admin-email';
import { BackendService } from '../src/service';

import { adminHeaders, request } from './helpers/http';

jest.setTimeout(60000);

interface Sent {
  to: string;
  subject: string;
  text: string;
}

describe('BMG-017 row 3 — the magic-link preview reads the policy', () => {
  let dataDir: string;
  let service: BackendService;
  let base: string;
  let admin: Record<string, string>;
  const sent: Sent[] = [];
  const req = <T = unknown>(method: string, p: string, body?: unknown) => request<T>(base, method, p, { body, headers: admin });
  const TEXT = 'lasts {{expiresIn}}';

  beforeAll(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-bmg017-email-'));
    fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
    service = new BackendService({ dataDir, port: 0, backendId: 'bmg17e', backendName: 'BMG-017' });
    base = (await service.start()).listen.url;
    admin = adminHeaders(dataDir);
    service.getMailerForTesting()!.setTransportForTesting({
      async sendMail(opts: Record<string, unknown>) {
        sent.push({ to: String(opts.to), subject: String(opts.subject), text: String(opts.text) });
        return { messageId: 'fake-' + sent.length };
      }
    });
    const email = await req('PUT', '/admin/email/config', {
      config: { enabled: true, smtp: { host: 'smtp.example.com', port: 465, secure: true, username: 'u' }, fromAddress: 'noreply@example.com', fromName: 'BMG' },
      smtpPassword: 'p'
    });
    expect(email.status).toBe(200);
    const auth = await req('PUT', '/admin/auth', { magicLink: { enabled: true, ttlMinutes: 60, allowSignup: true } });
    expect(auth.status).toBe(200);
  });

  afterAll(async () => {
    if (service) await service.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  it('AC3: with the lifetime at 60, the preview and the test send both say 60 minutes', async () => {
    const preview = await req<TemplatePreviewResponse>('GET', '/admin/email/templates/magicLink/preview?' + new URLSearchParams({ text: TEXT }));
    expect(preview.status).toBe(200);
    expect(preview.json.preview.text).toBe('lasts 60 minutes');

    const test = await req<TestSendResponse>('POST', '/admin/email/test', { to: 'me@example.com', template: 'magicLink', text: TEXT });
    expect(test.status).toBe(200);
    expect(sent[sent.length - 1].text).toBe('lasts 60 minutes');
  });

  it('the chip’s sample is the same words', async () => {
    const list = await req<TemplateListResponse>('GET', '/admin/email/templates');
    const magic = list.json.templates.find((t) => t.id === 'magicLink')!;
    expect(magic.variables.find((v) => v.name === 'expiresIn')!.sample).toBe('60 minutes');
  });

  it('the real email says what the preview said', async () => {
    await req('PUT', '/admin/email/templates/magicLink', { text: TEXT });
    const before = sent.length;
    const res = await fetch(`${base}/auth/magic-link`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'someone@example.com' })
    });
    expect(res.status).toBeLessThan(300);
    const mail = sent.slice(before).find((s) => s.to === 'someone@example.com');
    expect(mail?.text).toBe('lasts 60 minutes');
    const preview = await req<TemplatePreviewResponse>('GET', '/admin/email/templates/magicLink/preview');
    expect(preview.json.preview.text).toBe(mail?.text);
  });

  it('one minute is said as one', async () => {
    await req('PUT', '/admin/auth', { magicLink: { enabled: true, ttlMinutes: 1, allowSignup: true } });
    const preview = await req<TemplatePreviewResponse>('GET', '/admin/email/templates/magicLink/preview?' + new URLSearchParams({ text: TEXT }));
    expect(preview.json.preview.text).toBe('lasts 1 minute');
  });
});
