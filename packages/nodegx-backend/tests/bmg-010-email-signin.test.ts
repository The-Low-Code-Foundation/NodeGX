/**
 * BMG-010 over a real BackendService — the Email and Sign-in pages' routes.
 *
 *  - AC3: `GET /admin/email/templates` answers each template's `variables`; the
 *    names are what the real senders pass (`email-routes.ts` reset + verify,
 *    `oauth-routes.ts` magic link — pinned here BY NAME), every `{{token}}` in a
 *    shipped default is one of them, and every one renders non-empty in the
 *    preview.
 *  - AC2: the preview takes an unsaved draft in the query; a test send of a
 *    template (`POST /admin/email/test {template, …draft}`) puts on the wire
 *    EXACTLY what the preview showed; save → preview equals the saved words;
 *    reset → the shipped default and `isOverridden:false`.
 *  - AC1: the Resend preset's host/port/TLS, saved through the config route,
 *    send through the mailer's test transport.
 *  - AC4: the wizard's payload for Google is the old modal's payload for the
 *    *google* preset, and the stored record is what the old shape stored.
 *  - AC5: an origin with a scheme is read back from `GET /admin/auth`; one
 *    without is refused by the page's rule and by the server.
 *  - `callbackUrlTemplate` builds every row's `callbackUrl`.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { PROVIDER_PRESETS, applyPreset, completeProvider } from '../src/auth/model';
import { DEFAULT_TEMPLATES, TEMPLATE_IDS, TEMPLATE_VARIABLES, TemplateId, renderTemplate, sampleVariables, templateTokens } from '../src/email/templates';
import type { TemplateListResponse, TemplatePreviewResponse, TestSendResponse } from '../src/server/admin-email';
import type { UpsertProviderResponse } from '../src/server/admin-auth';
import { SMTP_PRESETS, fillFrom, presetById } from '../src/admin/app/smtpPresets';
import { draftFor, originProblem, wizardPayload } from '../src/admin/app/providerWizard';
import { BackendService } from '../src/service';

import { adminHeaders, request } from './helpers/http';

jest.setTimeout(60000);

interface Sent {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

describe('BMG-010 the Email and Sign-in routes', () => {
  let dataDir: string;
  let service: BackendService;
  let base: string;
  let admin: Record<string, string>;
  const sent: Sent[] = [];
  const req = <T = unknown>(method: string, p: string, body?: unknown) => request<T>(base, method, p, { body, headers: admin });

  beforeAll(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-bmg010-'));
    service = new BackendService({ dataDir, port: 0, backendId: 'bmg10', backendName: 'BMG-010' });
    base = (await service.start()).listen.url;
    admin = adminHeaders(dataDir);
    service.getMailerForTesting()!.setTransportForTesting({
      async sendMail(opts: Record<string, unknown>) {
        sent.push({ to: String(opts.to), subject: String(opts.subject), text: String(opts.text), html: opts.html === undefined ? undefined : String(opts.html) });
        return { messageId: 'fake-' + sent.length };
      }
    });
  });

  afterAll(async () => {
    if (service) await service.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  // ---- AC3 — the placeholder list is the backend's ---------------------------------------------

  describe('AC3 — the variables a template may use come from the backend', () => {
    /** What each real sender passes — read from the callers, pinned here so a chip can never name more. */
    const SENDERS: Record<TemplateId, string[]> = {
      passwordReset: ['appName', 'username', 'resetUrl', 'expiresIn'], // email-routes.ts requestPasswordReset
      verifyEmail: ['appName', 'username', 'verifyUrl'], // email-routes.ts sendVerification
      magicLink: ['appName', 'magicLinkUrl', 'expiresIn'] // oauth-routes.ts sendMagicLink
    };

    it('the list answers `variables` per template, equal to what its sender supplies', async () => {
      const r = await req<TemplateListResponse>('GET', '/admin/email/templates');
      expect(r.status).toBe(200);
      expect(r.json.templates.map((t) => t.id)).toEqual(TEMPLATE_IDS);
      for (const t of r.json.templates) {
        expect(t.variables.map((v) => v.name)).toEqual(SENDERS[t.id]);
        for (const v of t.variables) {
          expect(v.label.length).toBeGreaterThan(0);
          expect(v.sample.length).toBeGreaterThan(0);
        }
      }
    });

    it('every {{token}} in a shipped default is on its list — nothing the default uses is missing from the chips', () => {
      for (const id of TEMPLATE_IDS) {
        const names = TEMPLATE_VARIABLES[id].map((v) => v.name);
        const d = DEFAULT_TEMPLATES[id];
        for (const token of templateTokens(d.subject + '\n' + d.text + '\n' + d.html)) expect(names).toContain(token);
      }
    });

    it('every variable renders as something in the preview (no chip inserts an empty string)', async () => {
      for (const id of TEMPLATE_IDS) {
        const text = TEMPLATE_VARIABLES[id].map((v) => v.name + '=[{{' + v.name + '}}]').join(' ');
        const r = await req<TemplatePreviewResponse>('GET', '/admin/email/templates/' + id + '/preview?' + new URLSearchParams({ text }));
        expect(r.status).toBe(200);
        for (const v of TEMPLATE_VARIABLES[id]) expect(r.json.preview.text).toContain(v.name + '=[' + v.sample + ']');
        expect(r.json.preview.text).not.toContain('=[]');
      }
    });
  });

  // ---- AC1 — the Resend preset sends -----------------------------------------------------------

  describe('AC1 — a preset fills the SMTP form and the test send goes through', () => {
    it('the table: a port the mailer accepts, TLS iff 465, a hint for both credentials, a link for every named provider', () => {
      for (const p of SMTP_PRESETS) {
        expect([25, 465, 587, 2525]).toContain(p.port);
        expect(p.secure).toBe(p.port === 465);
        expect(p.usernameHint.length).toBeGreaterThan(0);
        expect(p.passwordHint.length).toBeGreaterThan(0);
        if (p.id !== 'other') expect(p.credentialUrl).toMatch(/^https:\/\//);
      }
    });

    it('Resend: host, port and TLS saved through the config route; the test email is sent', async () => {
      const filled = fillFrom(presetById('resend'));
      expect(filled).toEqual({ host: 'smtp.resend.com', port: '465', secure: true });
      const put = await req<{ configured: boolean }>('PUT', '/admin/email/config', {
        config: { enabled: true, smtp: { host: filled.host, port: Number(filled.port), secure: filled.secure, username: 'resend' }, fromAddress: 'noreply@example.com', fromName: 'BMG' },
        smtpPassword: 're_test_key'
      });
      expect(put.status).toBe(200);
      expect(put.json.configured).toBe(true);
      const before = sent.length;
      const test = await req<TestSendResponse>('POST', '/admin/email/test', { to: 'me@example.com' });
      expect(test.status).toBe(200);
      expect(sent.length).toBe(before + 1);
      expect(sent[sent.length - 1].to).toBe('me@example.com');
    });
  });

  // ---- AC2 — edit, preview, send me this, reset ------------------------------------------------

  describe('AC2 — the preview is what a test send puts on the wire', () => {
    const id: TemplateId = 'verifyEmail';
    const draft = { subject: 'Welcome to {{appName}}, {{username}}', text: 'Press this: {{verifyUrl}}\n\nSee you inside.' };

    it('an UNSAVED draft previews from the query and sends the same words', async () => {
      const preview = await req<TemplatePreviewResponse>('GET', '/admin/email/templates/' + id + '/preview?' + new URLSearchParams(draft));
      expect(preview.status).toBe(200);
      expect(preview.json.preview.subject).toBe('Welcome to Your App, jane.doe');
      expect(preview.json.preview.text).toContain('Press this: https://example.com/apps/demo/verify_email?username=jane.doe&token=SAMPLE');
      // The HTML was not in the draft, so it is the shipped default, rendered.
      expect(preview.json.preview.html).toBe(renderTemplate(DEFAULT_TEMPLATES[id], sampleVariables(id)).html);

      const before = sent.length;
      const test = await req<TestSendResponse>('POST', '/admin/email/test', { to: 'me@example.com', template: id, ...draft });
      expect(test.status).toBe(200);
      expect(test.json.template).toBe(id);
      expect(test.json.sent).toEqual(preview.json.preview);
      expect(sent.length).toBe(before + 1);
      const wire = sent[sent.length - 1];
      expect({ subject: wire.subject, text: wire.text, html: wire.html }).toEqual(preview.json.preview);

      // Nothing was saved by previewing or sending.
      const list = await req<TemplateListResponse>('GET', '/admin/email/templates');
      expect(list.json.templates.find((t) => t.id === id)!.isOverridden).toBe(false);
    });

    it('saved: the list says edited, the preview without a draft shows the saved words; reset: default again', async () => {
      const put = await req('PUT', '/admin/email/templates/' + id, draft);
      expect(put.status).toBe(200);
      const list = await req<TemplateListResponse>('GET', '/admin/email/templates');
      const row = list.json.templates.find((t) => t.id === id)!;
      expect(row.isOverridden).toBe(true);
      expect(row.effective.subject).toBe(draft.subject);
      const preview = await req<TemplatePreviewResponse>('GET', '/admin/email/templates/' + id + '/preview');
      expect(preview.json.preview.subject).toBe('Welcome to Your App, jane.doe');

      const del = await req<{ removed: boolean }>('DELETE', '/admin/email/templates/' + id);
      expect(del.status).toBe(200);
      expect(del.json.removed).toBe(true);
      const after = await req<TemplateListResponse>('GET', '/admin/email/templates');
      const reset = after.json.templates.find((t) => t.id === id)!;
      expect(reset.isOverridden).toBe(false);
      expect(reset.effective).toEqual(DEFAULT_TEMPLATES[id]);
    });

    it('an unknown template is a 404 in words; a blank field falls back like a save does', async () => {
      const bad = await req<{ error: string }>('POST', '/admin/email/test', { to: 'me@example.com', template: 'welcome' });
      expect(bad.status).toBe(404);
      expect(bad.json.error).toContain('welcome');
      const blank = await req<TemplatePreviewResponse>('GET', '/admin/email/templates/' + id + '/preview?subject=');
      expect(blank.json.preview.subject).toBe(renderTemplate(DEFAULT_TEMPLATES[id], sampleVariables(id)).subject);
    });
  });

  // ---- AC4 — the wizard's record is the old modal's record --------------------------------------

  describe('AC4 — the Google wizard produces the old modal’s provider record', () => {
    /** The nine-field modal's payload for the *google* preset (signin.tsx before BMG-010), verbatim. */
    const OLD_MODAL = {
      displayName: 'Google',
      issuer: 'https://accounts.google.com',
      clientId: 'cid-123',
      scopes: ['openid', 'email', 'profile'],
      enabled: true,
      allowSignup: true,
      preset: 'google',
      clientSecret: 's3cret'
    };

    it('the payload is equal, with scopes as an array from the boxes', () => {
      const draft = { ...draftFor('google', PROVIDER_PRESETS.google), clientId: 'cid-123', clientSecret: 's3cret' };
      expect(wizardPayload(draft, PROVIDER_PRESETS.google, null)).toEqual(OLD_MODAL);
    });

    it('through the route: the stored provider is what the old shape stored, the secret set and never echoed', async () => {
      const draft = { ...draftFor('google', PROVIDER_PRESETS.google), clientId: 'cid-123', clientSecret: 's3cret' };
      const put = await req<UpsertProviderResponse>('PUT', '/admin/auth/providers/google', wizardPayload(draft, PROVIDER_PRESETS.google, null));
      expect(put.status).toBe(200);
      const expected = completeProvider('google', applyPreset({ ...OLD_MODAL, kind: undefined }));
      const { hasClientSecret, ready, notReadyReason, callbackUrl, ...stored } = put.json.provider;
      expect(stored).toEqual(expected);
      expect(hasClientSecret).toBe(true);
      expect(ready).toBe(true);
      expect(notReadyReason).toBeNull();
      expect(JSON.stringify(put.json)).not.toContain('s3cret');
      void callbackUrl;
    });

    it('a profile box left unticked drops only that scope; the identity scopes cannot be dropped', () => {
      const draft = { ...draftFor('google', PROVIDER_PRESETS.google), clientId: 'c', ticked: [] as string[] };
      expect(wizardPayload(draft, PROVIDER_PRESETS.google, null).scopes).toEqual(['openid', 'email']);
      const gh = { ...draftFor('github', PROVIDER_PRESETS.github), clientId: 'c', ticked: [] as string[] };
      expect(wizardPayload(gh, PROVIDER_PRESETS.github, null)).toMatchObject({ issuer: '', scopes: ['read:user', 'user:email'], preset: 'github' });
    });
  });

  // ---- AC5 — where your app lives -------------------------------------------------------------

  describe('AC5 — origins', () => {
    it('example.com is refused by the page’s rule with the fix in the sentence; https://app.example.com is not', () => {
      expect(originProblem('example.com')).toBe('An origin starts with https:// (or http://localhost while you develop) — e.g. https://example.com');
      expect(originProblem('https://app.example.com')).toBeNull();
      expect(originProblem('http://localhost:3000')).toBeNull();
      expect(originProblem('http://app.example.com')).toMatch(/Plain http:\/\/ is only allowed for localhost/);
    });

    it('an accepted origin is saved and read back from GET /admin/auth; the server refuses a bare host too', async () => {
      const put = await req('PUT', '/admin/auth', { redirectAllowList: ['https://app.example.com'] });
      expect(put.status).toBe(200);
      const get = await req<{ config: { redirectAllowList: string[] } }>('GET', '/admin/auth');
      expect(get.json.config.redirectAllowList).toEqual(['https://app.example.com']);
      const bad = await req<{ error: string }>('PUT', '/admin/auth', { redirectAllowList: ['example.com'] });
      expect(bad.status).toBe(400);
      expect(bad.json.error).toMatch(/absolute http\(s\) origin/);
    });
  });

  it('callbackUrlTemplate builds every row’s callbackUrl', async () => {
    const get = await req<{ callbackUrlTemplate: string; config: { providers: Array<{ id: string; callbackUrl: string }> } }>('GET', '/admin/auth');
    expect(get.json.callbackUrlTemplate).toMatch(/\/oauth\/\{id\}\/callback$/);
    expect(get.json.config.providers.length).toBeGreaterThan(0);
    for (const p of get.json.config.providers) {
      expect(get.json.callbackUrlTemplate.replace('{id}', encodeURIComponent(p.id))).toBe(p.callbackUrl);
    }
  });
});
