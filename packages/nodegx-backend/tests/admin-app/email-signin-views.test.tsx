/**
 * BMG-010 — the Email and Sign-in pages under jsdom, over a stubbed backend.
 *
 * AC1: picking a provider tile fills host, port and TLS and says which
 * credential it wants. AC2: the drawer previews the draft through the server's
 * route and saves it. AC3: the chips are the backend's list, and a click
 * inserts the token. AC4: the wizard's three steps send the old modal's
 * record. AC5: an origin without a scheme is refused inline; a page URL is
 * kept as its origin. AC7: no space- or line-separated text field on either
 * page. Plus the wizard's pure model.
 */
import { mount, unmount, change, click, press, settle, q, qa, text, typeInto } from './dom';

import { PROVIDER_PRESETS, applyPreset, completeProvider } from '../../src/auth/model';
import { DEFAULT_TEMPLATES, TEMPLATE_IDS, TEMPLATE_VARIABLES, mergeTemplate, renderTemplate, sampleVariables } from '../../src/email/templates';
import { SMTP_PRESETS, fillFrom, hostFor, presetById, presetFor } from '../../src/admin/app/smtpPresets';
import {
  draftFor,
  draftFrom,
  draftProblem,
  idProblem,
  normaliseOrigin,
  originProblem,
  providerIdFrom,
  registerSteps,
  scopeBoxes,
  scopesFrom,
  stepMissing,
  tileOf,
  wizardPayload
} from '../../src/admin/app/providerWizard';
import { EmailView, insertToken, templateTitle } from '../../src/admin/app/views/email';
import { ProviderWizard, SignInView, callbackFor } from '../../src/admin/app/views/signin';

// ------------------------------------------------------------ the backend --

interface Call {
  method: string;
  url: string;
  body?: Record<string, unknown>;
}

const calls: Call[] = [];
let authState: Record<string, unknown> & { providers: Array<Record<string, unknown>> } = {
  providers: [],
  magicLink: { enabled: false, ttlMinutes: 15, allowSignup: true },
  redirectAllowList: [],
  linking: { autoLinkVerifiedEmail: true }
};
const templates = () =>
  TEMPLATE_IDS.map((id) => ({ id, default: DEFAULT_TEMPLATES[id], override: null, effective: DEFAULT_TEMPLATES[id], isOverridden: false, variables: TEMPLATE_VARIABLES[id] }));

const answer = (status: number, json: unknown) => Promise.resolve(new Response(JSON.stringify(json), { status, headers: { 'content-type': 'application/json' } }));

function fakeFetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  const url = String(input);
  const method = (init && init.method) || 'GET';
  const body = init && init.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : undefined;
  calls.push({ method, url, body });
  const u = new URL(url, 'http://127.0.0.1');
  const p = u.pathname;
  if (p === '/admin/email/config') {
    return answer(200, {
      configured: false,
      notConfiguredReason: 'smtp.host is empty',
      hasSmtpPassword: false,
      config: { enabled: false, smtp: { host: '', port: 587, secure: false, username: '' }, fromAddress: '', fromName: '', baseUrl: '', verification: { sendOnSignup: false, requireForLogin: false } }
    });
  }
  if (p === '/admin/email/templates') return answer(200, { templates: templates() });
  const preview = /^\/admin\/email\/templates\/([^/]+)\/preview$/.exec(p);
  if (preview) {
    const id = preview[1] as keyof typeof DEFAULT_TEMPLATES;
    const draft: Record<string, string> = {};
    for (const k of ['subject', 'text', 'html']) if (u.searchParams.has(k)) draft[k] = u.searchParams.get(k)!;
    return answer(200, { id, preview: renderTemplate(mergeTemplate(DEFAULT_TEMPLATES[id], draft), sampleVariables(id)) });
  }
  if (/^\/admin\/email\/templates\/[^/]+$/.test(p)) return answer(200, { success: true });
  if (p === '/admin/email/test') return answer(200, { success: true, sent: body });
  if (p === '/admin/auth') {
    if (method === 'PUT') authState = { ...authState, ...(body as object) } as typeof authState;
    return answer(200, {
      config: authState,
      presets: PROVIDER_PRESETS,
      callbackUrlTemplate: 'https://api.example.com/oauth/{id}/callback',
      baseUrl: { url: 'https://api.example.com', usedFallback: false, warning: null },
      magicLinkReady: false,
      magicLinkNotReadyReason: 'Magic-link sign-in is turned off for this backend (auth.json: magicLink.enabled).'
    });
  }
  const prov = /^\/admin\/auth\/providers\/([^/]+)$/.exec(p);
  if (prov && method === 'PUT') {
    const id = prov[1];
    const provider = {
      ...completeProvider(id, applyPreset(body as Record<string, unknown>)),
      hasClientSecret: !!(body && body.clientSecret),
      ready: true,
      notReadyReason: null,
      callbackUrl: 'https://api.example.com/oauth/' + id + '/callback'
    };
    authState.providers = [...authState.providers.filter((x) => x.id !== id), provider];
    return answer(200, { success: true, provider });
  }
  return answer(404, { error: 'no route ' + method + ' ' + p });
}

const realFetch = globalThis.fetch;
beforeAll(() => {
  (globalThis as { fetch: typeof fetch }).fetch = fakeFetch as typeof fetch;
});
afterAll(() => {
  (globalThis as { fetch: typeof fetch }).fetch = realFetch;
});
beforeEach(() => {
  calls.length = 0;
  location.hash = '';
});

const labelsOf = (root: HTMLElement, sel: string) => qa<HTMLInputElement>(root, sel).map((i) => i.getAttribute('aria-label'));
/** AC7: every text control's label, placeholder and surrounding words — nothing may say "separated" or "per line". */
function separatedFields(root: HTMLElement): string[] {
  const hits: string[] = [];
  for (const el of qa<HTMLElement>(root, 'input, textarea, label, .sub, .hint')) {
    const words = (text(el) + ' ' + (el.getAttribute('placeholder') || '') + ' ' + (el.getAttribute('aria-label') || '')).toLowerCase();
    if (/separated|per line|one per|comma/.test(words)) hits.push(words.trim().slice(0, 80));
  }
  return hits;
}

// ------------------------------------------------------------------ email --

describe('Email page (BMG-010 §3.1)', () => {
  it('AC1: the tiles are the preset table; Resend fills host, port and TLS and names the credential', async () => {
    const root = mount(<EmailView params={[]} />);
    await settle(20);
    expect(labelsOf(root, 'input[name=smtp-preset]')).toEqual(SMTP_PRESETS.map((p) => p.label));
    // Nothing stored yet: *Other* is on, no hint.
    expect(q<HTMLInputElement>(root, 'input[name=smtp-preset][value=other]').checked).toBe(true);
    change(q<HTMLInputElement>(root, 'input[name=smtp-preset][value=resend]'), true);
    expect(q<HTMLInputElement>(root, '#smtp-host').value).toBe('smtp.resend.com');
    expect(q<HTMLInputElement>(root, '#smtp-port').value).toBe('465');
    expect(qa<HTMLInputElement>(root, 'label.check input[type=checkbox]').find((c) => /Implicit TLS/.test(text(c.closest('label'))))!.checked).toBe(true);
    const hint = text(q(root, '#preset-hint'));
    expect(hint).toContain('Username: The word resend');
    expect(hint).toContain('An API key from Resend');
    expect(q<HTMLAnchorElement>(root, '#preset-hint a').href).toBe('https://resend.com/api-keys');
    expect(q<HTMLInputElement>(root, '#smtp-username').placeholder).toBe('The word resend');

    // Gmail says: an App password, not the Google password.
    change(q<HTMLInputElement>(root, 'input[name=smtp-preset][value=gmail]'), true);
    expect(q<HTMLInputElement>(root, '#smtp-host').value).toBe('smtp.gmail.com');
    expect(q<HTMLInputElement>(root, '#smtp-port').value).toBe('587');
    expect(text(q(root, '#preset-hint'))).toContain('App password, not your Google password');

    // SES asks for a region and builds the host from it.
    change(q<HTMLInputElement>(root, 'input[name=smtp-preset][value=ses]'), true);
    expect(q<HTMLInputElement>(root, '#smtp-host').value).toBe('email-smtp.us-east-1.amazonaws.com');
    change(q<HTMLSelectElement>(root, 'select[aria-label="SES region"]'), 'eu-west-1');
    expect(q<HTMLInputElement>(root, '#smtp-host').value).toBe('email-smtp.eu-west-1.amazonaws.com');

    // The sign-up policy is under its own heading, as switches.
    expect(qa(root, '.drawer-section').map((h) => text(h))).toContain('When someone signs up');
    expect(qa(root, '#signup-policy label.switch').map((l) => text(l).trim())).toEqual(['Send them a verification email', 'They cannot sign in until they have verified']);
    unmount(root);
  });

  it('AC7: no textarea and no separated field on the page itself', async () => {
    const root = mount(<EmailView params={[]} />);
    await settle(20);
    expect(qa(root, 'textarea')).toEqual([]);
    expect(separatedFields(root)).toEqual([]);
    unmount(root);
  });

  it('the stored host opens on the tile that made it', () => {
    expect(presetFor('smtp.resend.com').preset.id).toBe('resend');
    expect(presetFor('SMTP.GMAIL.COM').preset.id).toBe('gmail');
    expect(presetFor('email-smtp.eu-central-1.amazonaws.com')).toEqual({ preset: presetById('ses'), region: 'eu-central-1' });
    expect(presetFor('mail.mycompany.test').preset.id).toBe('other');
    expect(presetFor('').preset.id).toBe('other');
    for (const p of SMTP_PRESETS) if (p.id !== 'other') expect(presetFor(hostFor(p, 'us-west-2')).preset.id).toBe(p.id);
    expect(fillFrom(presetById('other'))).toEqual({ host: '', port: '', secure: false });
  });

  it('AC3 + AC2: the drawer’s chips are the backend’s list; a click inserts the token; the preview is the server’s rendering of the draft; Save sends it', async () => {
    const root = mount(<EmailView params={['verifyEmail']} />);
    await settle(20);
    expect(text(q(root, '.drawer h3'))).toBe(templateTitle('verifyEmail'));
    const chips = qa<HTMLButtonElement>(root, '.placeholder-bar [data-placeholder]');
    expect(chips.map((c) => c.getAttribute('data-placeholder'))).toEqual(TEMPLATE_VARIABLES.verifyEmail.map((v) => v.name));
    expect(chips.map((c) => text(c))).toEqual(TEMPLATE_VARIABLES.verifyEmail.map((v) => v.label));
    // A name the sender of this template never supplies is not offered.
    expect(chips.map((c) => c.getAttribute('data-placeholder'))).not.toContain('expiresIn');

    const body = q<HTMLTextAreaElement>(root, '#tpl-text');
    expect(body.value).toBe(DEFAULT_TEMPLATES.verifyEmail.text);
    typeInto(body, 'Press: ');
    body.focus();
    body.setSelectionRange(7, 7);
    click(chips.find((c) => c.getAttribute('data-placeholder') === 'verifyUrl')!);
    expect(q<HTMLTextAreaElement>(root, '#tpl-text').value).toBe('Press: {{verifyUrl}}');

    // The subject chip goes into the subject when that is where the cursor was.
    const subject = q<HTMLInputElement>(root, '#tpl-subject');
    typeInto(subject, 'Hi ');
    subject.focus();
    subject.setSelectionRange(3, 3);
    click(chips.find((c) => c.getAttribute('data-placeholder') === 'username')!);
    expect(q<HTMLInputElement>(root, '#tpl-subject').value).toBe('Hi {{username}}');

    // The preview, after the pause: rendered by the (stubbed) server from the query.
    await settle(450);
    const previewCalls = calls.filter((c) => /\/preview\?/.test(c.url));
    expect(previewCalls.length).toBeGreaterThan(0);
    const last = new URL(previewCalls[previewCalls.length - 1].url, 'http://x');
    expect(last.searchParams.get('subject')).toBe('Hi {{username}}');
    expect(last.searchParams.get('text')).toBe('Press: {{verifyUrl}}');
    expect(text(q(root, '#tpl-preview .preview-subject'))).toBe('Hi jane.doe');
    expect(text(q(root, '#tpl-preview pre'))).toBe('Press: https://example.com/apps/demo/verify_email?username=jane.doe&token=SAMPLE');
    // Nothing in the page rendered HTML: the pane holds text nodes only.
    expect(qa(root, '#tpl-preview a, #tpl-preview p')).toEqual([]);

    // Save sends the three fields.
    click(qa<HTMLButtonElement>(root, '.drawer-foot button').find((b) => text(b) === 'Save')!);
    await settle(20);
    const put = calls.find((c) => c.method === 'PUT' && /\/admin\/email\/templates\/verifyEmail$/.test(c.url))!;
    expect(put.body).toEqual({ subject: 'Hi {{username}}', text: 'Press: {{verifyUrl}}', html: DEFAULT_TEMPLATES.verifyEmail.html });

    // AC7 with the drawer open: the only textareas are the body and (behind Edit HTML) the HTML — prose, not lists.
    expect(qa(root, 'textarea').map((t) => t.id).every((id) => id === 'tpl-text' || id === 'tpl-html')).toBe(true);
    expect(separatedFields(root)).toEqual([]);
    unmount(root);
  });

  it('insertToken: at a caret, over a selection, clamped', () => {
    expect(insertToken('Hi ', 3, 3, '{{username}}')).toEqual({ value: 'Hi {{username}}', caret: 15 });
    expect(insertToken('Hi NAME!', 3, 7, '{{username}}')).toEqual({ value: 'Hi {{username}}!', caret: 15 });
    expect(insertToken('ab', 99, 99, 'X')).toEqual({ value: 'abX', caret: 3 });
    expect(insertToken('ab', -1, -1, 'X')).toEqual({ value: 'Xab', caret: 1 });
  });
});

// ---------------------------------------------------------------- sign-in --

describe('Sign-in page (BMG-010 §3.2)', () => {
  /** The nine-field modal's payload for the *google* preset, verbatim (AC4). */
  const OLD_MODAL = { displayName: 'Google', issuer: 'https://accounts.google.com', clientId: 'cid-123', scopes: ['openid', 'email', 'profile'], enabled: true, allowSignup: true, preset: 'google', clientSecret: 's3cret' };

  it('AC4: the Google wizard — which, the URL first, paste back — sends the old modal’s record', async () => {
    const root = mount(<SignInView params={['new']} />);
    await settle(20);
    const drawer = q(root, '.drawer');
    expect(text(q(drawer, 'h3'))).toBe('Add a way to sign in');
    expect(labelsOf(drawer, 'input[name=provider-tile]')).toEqual(['Google', 'GitHub', 'Another OpenID Connect provider']);
    expect(q<HTMLInputElement>(drawer, 'input[name=provider-tile][value=google]').checked).toBe(true);
    expect(q<HTMLInputElement>(drawer, '#wiz-label').value).toBe('Google');
    expect(qa(drawer, '#wiz-issuer')).toEqual([]);
    const next = () => click(qa<HTMLButtonElement>(drawer, '.drawer-foot button').find((b) => text(b) === 'Next')!);
    next();

    // Step 2: the callback URL, before anything is stored, then the steps in Google's words.
    expect(text(q(drawer, '.wizard-steps li.current'))).toContain('Register with them');
    expect(text(q(drawer, '#wiz-callback'))).toBe('https://api.example.com/oauth/google/callback');
    const steps = qa(drawer, '#wiz-register-steps li').map((li) => text(li));
    expect(steps).toEqual(registerSteps('google'));
    expect(steps.join(' ')).toContain('Authorised redirect URIs');
    expect(q<HTMLAnchorElement>(drawer, 'a.btn').href).toBe(PROVIDER_PRESETS.google.consoleUrl);
    expect(qa(drawer, 'input[type=text]').filter((i) => i.id !== 'wiz-id')).toEqual([]); // nothing to type here but the advanced id
    next();

    // Step 3: boxes, not a scope field.
    expect(text(q(drawer, '.wizard-steps li.current'))).toContain('Paste back');
    const boxes = qa<HTMLInputElement>(drawer, '#wiz-scopes input[type=checkbox]');
    expect(boxes.map((b) => [text(b.closest('label')).trim(), b.checked, b.disabled])).toEqual([
      ['Who they are and their email address (needed to sign in)', true, true],
      ['Their name and profile picture', true, false]
    ]);
    expect(qa(drawer, 'input').some((i) => /scope/i.test(i.getAttribute('placeholder') || '') || /scope/i.test(text(i.closest('label'))))).toBe(false);
    typeInto(q<HTMLInputElement>(drawer, '#wiz-client-id'), 'cid-123');
    typeInto(q<HTMLInputElement>(drawer, '#wiz-client-secret'), 's3cret');
    const add = qa<HTMLButtonElement>(drawer, '.drawer-foot button').find((b) => text(b) === 'Add Google')!;
    expect(add.disabled).toBe(false);
    click(add);
    await settle(20);
    const put = calls.find((c) => c.method === 'PUT' && /\/admin\/auth\/providers\/google$/.test(c.url))!;
    expect(put.body).toEqual(OLD_MODAL);
    // …and the drawer closed onto the list, which now says ready.
    await settle(20);
    expect(location.hash).toBe('#/signin');
    unmount(root);
  });

  it('the base-URL warning comes BEFORE the callback URL (§5), and an edit opens on step 3 with the secret unchanged', async () => {
    const existing = { id: 'google', kind: 'oidc' as const, displayName: 'Google', issuer: 'https://accounts.google.com', clientId: 'cid', hasClientSecret: true, scopes: ['openid', 'email', 'profile'], enabled: true, allowSignup: true, ready: true, callbackUrl: 'https://api.example.com/oauth/google/callback' };
    const root = mount(<ProviderWizard existing={existing} presets={PROVIDER_PRESETS} callbackUrlTemplate="https://api.example.com/oauth/{id}/callback" baseUrlWarning="No baseUrl is configured for this backend." taken={['google']} onClose={() => undefined} onSaved={() => undefined} />);
    expect(text(q(root, '.wizard-steps li.current'))).toContain('Paste back');
    expect(q<HTMLInputElement>(root, '#wiz-client-secret').placeholder).toBe('(unchanged)');
    expect(q<HTMLInputElement>(root, '#wiz-client-id').value).toBe('cid');
    // Back to step 2: the warning precedes the URL in reading order.
    click(qa<HTMLButtonElement>(root, '.wizard-steps button')[1]);
    const warning = q(root, '.notice.warn');
    const url = q(root, '#wiz-callback');
    expect(warning.compareDocumentPosition(url) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(qa(root, '#wiz-id')).toEqual([]); // the id of a saved provider is not editable — it is in a registered URL
    unmount(root);
  });

  it('another OIDC provider: the name and issuer are step 1, the id is derived from the name and editable under advanced', async () => {
    const root = mount(<SignInView params={['new']} />);
    await settle(20);
    const drawer = q(root, '.drawer');
    change(q<HTMLInputElement>(drawer, 'input[name=provider-tile][value=oidc]'), true);
    const next = qa<HTMLButtonElement>(drawer, '.drawer-foot button').find((b) => text(b) === 'Next')!;
    expect(next.disabled).toBe(true);
    typeInto(q<HTMLInputElement>(drawer, '#wiz-label'), 'Okta (work)');
    typeInto(q<HTMLInputElement>(drawer, '#wiz-issuer'), 'https://work.okta.com');
    click(qa<HTMLButtonElement>(drawer, '.drawer-foot button').find((b) => text(b) === 'Next')!);
    expect(text(q(drawer, '#wiz-callback'))).toBe('https://api.example.com/oauth/okta-work/callback');
    click(q(drawer, '.disclose-head'));
    expect(q<HTMLInputElement>(drawer, '#wiz-id').value).toBe('okta-work');
    typeInto(q<HTMLInputElement>(drawer, '#wiz-id'), 'sso');
    expect(text(q(drawer, '#wiz-callback'))).toBe('https://api.example.com/oauth/sso/callback');
    unmount(root);
  });

  it('AC5: an origin without a scheme is refused inline; a page URL is kept as its origin; Save sends the list', async () => {
    const root = mount(<SignInView params={[]} />);
    await settle(20);
    const chips = q(root, '#app-origins .chips');
    const input = q<HTMLInputElement>(chips, 'input');
    typeInto(input, 'example.com');
    press(input, 'Enter');
    expect(text(q(chips, '.chips-problem'))).toBe('An origin starts with https:// (or http://localhost while you develop) — e.g. https://example.com');
    expect(qa(chips, '.chip')).toEqual([]);
    typeInto(input, 'https://app.example.com/after/signin?x=1');
    press(input, 'Enter');
    expect(qa(chips, '.chips-set .chip').map((c) => text(c).replace('✕', '').trim())).toEqual(['https://app.example.com']);
    click(qa<HTMLButtonElement>(root, 'button').find((b) => text(b) === 'Save policy')!);
    await settle(20);
    const put = calls.find((c) => c.method === 'PUT' && /\/admin\/auth$/.test(c.url))!;
    expect(put.body!.redirectAllowList).toEqual(['https://app.example.com']);
    unmount(root);
  });

  it('AC7: no textarea and no separated field, drawer closed or open', async () => {
    for (const params of [[], ['new']]) {
      const root = mount(<SignInView params={params} />);
      await settle(20);
      expect(qa(root, 'textarea')).toEqual([]);
      expect(separatedFields(root)).toEqual([]);
      unmount(root);
    }
  });

  it('the table says which step a not-ready provider is missing', () => {
    const base = { id: 'x', kind: 'oidc' as const, issuer: 'https://i.test', clientId: 'c', hasClientSecret: true, ready: false };
    expect(stepMissing({ ...base, ready: true })).toBeNull();
    expect(stepMissing({ ...base, issuer: '' })).toBe('Step 1: the issuer URL');
    expect(stepMissing({ ...base, clientId: '' })).toBe('Step 3: the client id');
    expect(stepMissing({ ...base, hasClientSecret: false })).toBe('Step 3: the client secret');
    expect(stepMissing({ ...base, kind: 'github', issuer: '', clientId: '' })).toBe('Step 3: the client id');
  });

  it('the model: ids, boxes, drafts', () => {
    expect(providerIdFrom('Okta (work)')).toBe('okta-work');
    expect(providerIdFrom('  Company SSO!! ')).toBe('company-sso');
    expect(idProblem('', [])).toMatch(/needs an id/);
    expect(idProblem('Not Slug', [])).toMatch(/lowercase/);
    expect(idProblem('callback', [])).toMatch(/reserved/);
    expect(idProblem('google', ['google'])).toBe('There is already a provider called google.');
    expect(idProblem('okta', ['google'])).toBeNull();

    // An unknown scope on a saved provider is its own optional box, never dropped silently.
    const boxes = scopeBoxes(['openid', 'email', 'profile', 'https://www.googleapis.com/auth/calendar.readonly']);
    expect(boxes.map((b) => b.id)).toEqual(['identity', 'profile', 'raw:https://www.googleapis.com/auth/calendar.readonly']);
    expect(scopesFrom(['openid', 'email', 'profile', 'x'], scopeBoxes(['openid', 'email', 'profile', 'x']), ['raw:x'])).toEqual(['openid', 'email', 'x']);

    const saved = { id: 'gh', kind: 'github' as const, displayName: 'GitHub', issuer: '', clientId: 'c', hasClientSecret: true, scopes: ['read:user', 'user:email'], enabled: false, allowSignup: false };
    expect(tileOf(saved, PROVIDER_PRESETS)).toBe('github');
    expect(tileOf({ id: 'g', kind: 'oidc', issuer: 'https://accounts.google.com' }, PROVIDER_PRESETS)).toBe('google');
    expect(tileOf({ id: 'o', kind: 'oidc', issuer: 'https://okta.test' }, PROVIDER_PRESETS)).toBe('oidc');
    const d = draftFrom(saved, PROVIDER_PRESETS);
    expect(d).toMatchObject({ tile: 'github', id: 'gh', idEdited: true, clientId: 'c', clientSecret: '', enabled: false, allowSignup: false });
    expect(draftProblem(d, saved, [])).toBeNull(); // an edit needs no new secret
    expect(wizardPayload(d, PROVIDER_PRESETS.github, saved)).toEqual({ displayName: 'GitHub', issuer: '', clientId: 'c', scopes: ['read:user', 'user:email'], enabled: false, allowSignup: false, preset: 'github' });

    const fresh = draftFor('oidc', PROVIDER_PRESETS.oidc);
    expect(draftProblem(fresh, null, [])).toMatch(/label/);
    expect(draftProblem({ ...fresh, displayName: 'Okta' }, null, [])).toMatch(/issuer URL/);
    expect(draftProblem({ ...fresh, displayName: 'Okta', issuer: 'okta.com' }, null, [])).toMatch(/https:\/\//);
    expect(draftProblem({ ...fresh, displayName: 'Okta', issuer: 'https://okta.test' }, null, [])).toBe('Paste the client id from step 2.');
    expect(draftProblem({ ...fresh, displayName: 'Okta', issuer: 'https://okta.test', clientId: 'c' }, null, [])).toBe('Paste the client secret from step 2.');

    expect(callbackFor('https://a.test/oauth/{id}/callback', 'my id')).toBe('https://a.test/oauth/my%20id/callback');
    expect(callbackFor(undefined, 'x')).toBe('');
    expect(normaliseOrigin('https://app.example.com/after?x=1')).toBe('https://app.example.com');
    expect(normaliseOrigin('http://localhost:3000/')).toBe('http://localhost:3000');
    expect(originProblem('')).toBe('Type an origin.');
    expect(originProblem('https://')).toMatch(/not a URL|needs a host/);
    expect(originProblem('http://127.0.0.1:8080')).toBeNull();
  });
});
