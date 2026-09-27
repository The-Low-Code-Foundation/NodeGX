// BMG-010 AC1–AC5, AC7 through the page, with the server (and the SMTP sink's mailbox) measured beside every step.
// Rendered text is `innerText` of #main / .drawer / .modal (the inlined bundle is not in it).
export default async ({ ev, sleep, nav, shot, key, typeText }) => {
  const fs = await import('fs');
  const port = process.env.PORT || '8697';
  const base = `http://127.0.0.1:${port}`;
  const smtpPort = process.env.SMTP_PORT || '2526';
  const mailbox = process.env.MAILBOX;
  const out = { checks: {} };
  const ok = (name, pass, detail) => {
    out.checks[name] = { pass: !!pass, detail };
    console.log((pass ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? ' — ' + JSON.stringify(detail).slice(0, 400) : ''));
  };
  const J = JSON.stringify;
  const call = async (method, p, body) => {
    const r = await fetch(base + p, { method, headers: { authorization: 'Bearer t0k', ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    return { status: r.status, json: await r.json().catch(() => null) };
  };
  const click = (sel) => ev(`(function(){var e=document.querySelector(${J(sel)}); if(!e) throw new Error('no '+${J(sel)}); e.click(); return true})()`);
  const clickText = (sel, text) =>
    ev(`(function(){var b=[...document.querySelectorAll(${J(sel)})].find(function(b){return b.textContent.trim()===${J(text)}}); if(!b) throw new Error('no '+${J(sel + ' ' + text)}+' among '+[...document.querySelectorAll(${J(sel)})].map(function(b){return b.textContent.trim()}).join('|')); b.click(); return true})()`);
  const setVal = (sel, v) =>
    ev(`(function(){var e=document.querySelector(${J(sel)}); if(!e) throw new Error('no '+${J(sel)}); var proto=e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto,'value').set.call(e,${J(v)}); e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true})); return true})()`);
  const val = (sel) => ev(`(function(){var e=document.querySelector(${J(sel)}); return e ? e.value : null})()`);
  const txt = (sel) => ev(`(function(){var e=document.querySelector(${J(sel)}); return e ? e.innerText.trim() : null})()`);
  const step = () => ev(`(function(){var e=document.querySelector('.drawer .wizard-steps li.current'); return e ? e.innerText.replace(/\\s+/g,' ').trim() : null})()`);
  const exists = (sel) => ev(`!!document.querySelector(${J(sel)})`);
  const count = (sel) => ev(`document.querySelectorAll(${J(sel)}).length`);
  const open = async (hash) => {
    await nav('about:blank');
    await nav(`${base}/_admin#token=t0k`);
    await sleep(1200);
    await ev(`location.hash = ${J(hash)}`);
    await sleep(1500);
  };
  const mails = () => fs.readFileSync(mailbox, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const waitFor = async (fn, tries = 30, ms = 300) => {
    for (let i = 0; i < tries; i++) {
      const v = await fn();
      if (v) return v;
      await sleep(ms);
    }
    return null;
  };
  // AC7 — what a text control says about itself: label, placeholder, aria-label, and the words beside it.
  const separated = () =>
    ev(`[...document.querySelectorAll('#main input, #main textarea, #main label, #main .sub, #main .hint, .drawer input, .drawer textarea, .drawer label, .drawer .sub, .drawer .hint')].map(function(e){return ((e.innerText||'')+' '+(e.getAttribute('placeholder')||'')+' '+(e.getAttribute('aria-label')||'')).toLowerCase()}).filter(function(w){return /separated|per line|one per|comma/.test(w)})`);

  // ================================================================ SIGN-IN (base URL still blank: the warning) ====
  await open('#/signin');
  await shot('bmg010-signin-empty');
  ok('signin: the page warns that no base URL is set, before anything else', /No baseUrl is configured/.test(await txt('#main .notice.warn')), await txt('#main .notice.warn'));
  ok('AC7 signin: no textarea', (await count('#main textarea')) === 0);
  ok('AC7 signin: no separated field', J(await separated()) === '[]', await separated());

  // ---- AC4: the Google wizard -----------------------------------------------------------------
  await clickText('#main button', 'Add provider');
  await sleep(800);
  ok('wizard opens at #/signin/new in a drawer, on step 1', (await ev('location.hash')) === '#/signin/new' && (await step()) === '1 Which', await step());
  const tiles = await ev(`[...document.querySelectorAll('.drawer input[name=provider-tile]')].map(function(i){return i.getAttribute('aria-label')})`);
  ok('step 1: the tiles are Google · GitHub · Another OpenID Connect provider (the backend has no other preset)', J(tiles) === J(['Google', 'GitHub', 'Another OpenID Connect provider']), tiles);
  ok('step 1: Google is picked and the button label is prefilled', (await val('.drawer #wiz-label')) === 'Google' && !(await exists('.drawer #wiz-issuer')));
  await shot('bmg010-wizard-step1');
  await clickText('.drawer .drawer-foot button', 'Next');
  await sleep(400);
  const auth0 = (await call('GET', '/admin/auth')).json;
  const expectedCb = auth0.callbackUrlTemplate.replace('{id}', 'google');
  const cbShown = await txt('.drawer #wiz-callback');
  ok('step 2: the callback URL is shown first, big, and equals the server’s template for "google"', cbShown === expectedCb && /\/oauth\/google\/callback$/.test(cbShown), { cbShown, expectedCb });
  const warnBeforeUrl = await ev(`(function(){var w=document.querySelector('.drawer .notice.warn'), u=document.querySelector('.drawer #wiz-callback'); return !!(w&&u) && !!(w.compareDocumentPosition(u) & Node.DOCUMENT_POSITION_FOLLOWING)})()`);
  ok('§5: with no base URL, the warning comes BEFORE the callback URL', warnBeforeUrl);
  const steps = await ev(`[...document.querySelectorAll('.drawer #wiz-register-steps li')].map(function(l){return l.innerText.trim()})`);
  ok('step 2: the steps are in Google’s own words and end at the client id and secret', steps.length === 4 && /Authorised redirect URIs/.test(steps[2]) && /Client ID and Client secret/.test(steps[3]), steps);
  ok('step 2: a link to Google’s console, and a Copy button', (await ev(`(document.querySelector('.drawer a.btn')||{}).href`)) === auth0.presets.google.consoleUrl && (await exists('.drawer button.btn.primary')));
  await shot('bmg010-wizard-step2');
  await clickText('.drawer .drawer-foot button', 'Next');
  await sleep(400);
  const boxes = await ev(`[...document.querySelectorAll('.drawer #wiz-scopes input[type=checkbox]')].map(function(b){return [b.closest('label').innerText.trim(), b.checked, b.disabled]})`);
  ok('step 3: what we may read is two boxes — identity locked on, profile optional on; no scope field', J(boxes) === J([['Who they are and their email address (needed to sign in)', true, true], ['Their name and profile picture', true, false]]) && !(await ev(`[...document.querySelectorAll('.drawer input')].some(function(i){return /scope/i.test(i.placeholder||'')||/scope/i.test((i.closest('label')||{}).innerText||'')})`)), boxes);
  const addBtnDisabled = await ev(`(function(){var b=[...document.querySelectorAll('.drawer .drawer-foot button')].find(function(b){return b.textContent.trim()==='Add Google'}); return b ? b.disabled : null})()`);
  ok('step 3: Add is disabled until the client id and secret are pasted', addBtnDisabled === true, addBtnDisabled);
  await setVal('.drawer #wiz-client-id', 'cid-123');
  await setVal('.drawer #wiz-client-secret', 's3cret');
  await shot('bmg010-wizard-step3');
  await clickText('.drawer .drawer-foot button', 'Add Google');
  await sleep(1200);
  const auth1 = (await call('GET', '/admin/auth')).json;
  const g = (auth1.config.providers || []).find((p) => p.id === 'google');
  const fixture = { id: 'google', kind: 'oidc', displayName: 'Google', enabled: true, clientId: 'cid-123', issuer: 'https://accounts.google.com', scopes: ['openid', 'email', 'profile'], allowSignup: true };
  const stored = g && { id: g.id, kind: g.kind, displayName: g.displayName, enabled: g.enabled, clientId: g.clientId, issuer: g.issuer, scopes: g.scopes, allowSignup: g.allowSignup };
  ok('AC4: GET /admin/auth holds the record the old modal made for the google preset, scopes as an array; the secret set, never echoed', J(stored) === J(fixture) && g.hasClientSecret === true && g.ready === true && !J(auth1).includes('s3cret'), stored);
  ok('after Add the drawer closes onto the list, which says enabled · ready', (await ev('location.hash')) === '#/signin' && /enabled/.test(await txt('#main tbody tr')) && /ready/.test(await txt('#main tbody tr')), await txt('#main tbody tr'));
  await shot('bmg010-signin-list');

  // A not-ready provider says which step is missing: a GitHub row with no secret.
  await call('PUT', '/admin/auth/providers/github', { preset: 'github', clientId: 'gh-cid', enabled: true });
  await clickText('#main button', 'Refresh');
  await sleep(800);
  const ghRow = await ev(`(function(){var r=[...document.querySelectorAll('#main tbody tr')].find(function(t){return /github/.test(t.innerText)}); return r ? r.innerText : null})()`);
  ok('a not-ready provider says which step is missing', /not ready/.test(ghRow) && /Missing — Step 3: the client secret/.test(ghRow), ghRow);
  // Its Edit opens on step 3 with the secret "(not set)".
  await ev(`(function(){var r=[...document.querySelectorAll('#main tbody tr')].find(function(t){return /github/.test(t.innerText)}); [...r.querySelectorAll('button')].find(function(b){return b.textContent.trim()==='Edit'}).click()})()`);
  await sleep(800);
  ok('Edit opens #/signin/github on step 3 with the client id kept and the secret "(not set)"', (await ev('location.hash')) === '#/signin/github' && (await step()) === '3 Paste back' && (await val('.drawer #wiz-client-id')) === 'gh-cid' && (await ev(`document.querySelector('.drawer #wiz-client-secret').placeholder`)) === '(not set)');
  await key('Escape');
  await sleep(500);

  // ---- AC5: where your app lives ---------------------------------------------------------------
  const originInput = '#app-origins .chips input';
  await ev(`document.querySelector(${J(originInput)}).focus()`);
  await typeText('example.com');
  await key('Enter');
  await sleep(300);
  const problem = await txt('#app-origins .chips-problem');
  ok('AC5: "example.com" is refused inline with the fix in the sentence; no chip', problem === 'An origin starts with https:// (or http://localhost while you develop) — e.g. https://example.com' && (await count('#app-origins .chips-set .chip')) === 0, problem);
  await shot('bmg010-origin-refused');
  await setVal(originInput, '');
  await ev(`document.querySelector(${J(originInput)}).focus()`);
  await typeText('https://app.example.com/after/signin?x=1');
  await key('Enter');
  await sleep(300);
  const chipsNow = await ev(`[...document.querySelectorAll('#app-origins .chips-set .chip')].map(function(c){return c.innerText.replace('✕','').trim()})`);
  ok('AC5: a pasted page URL becomes its origin as a chip', J(chipsNow) === J(['https://app.example.com']), chipsNow);
  await clickText('#main button', 'Save policy');
  await sleep(1000);
  const auth2 = (await call('GET', '/admin/auth')).json;
  ok('AC5: GET /admin/auth reads it back', J(auth2.config.redirectAllowList) === J(['https://app.example.com']), auth2.config.redirectAllowList);
  await shot('bmg010-origins');

  // ================================================================ EMAIL ====================================
  await open('#/email');
  ok('email: says it is NOT configured', /NOT configured/.test(await txt('#main .notice.warn')), await txt('#main .notice.warn'));
  ok('AC7 email: no textarea on the page', (await count('#main textarea')) === 0);
  ok('AC7 email: no separated field', J(await separated()) === '[]', await separated());
  const presetTiles = await ev(`[...document.querySelectorAll('#main input[name=smtp-preset]')].map(function(i){return i.getAttribute('aria-label')})`);
  ok('AC1: the provider tiles', J(presetTiles) === J(['Gmail / Google Workspace', 'Resend', 'Postmark', 'Amazon SES', 'Mailgun', 'Brevo', 'Other']), presetTiles);
  await click('#main input[name=smtp-preset][value=resend]');
  await sleep(300);
  const filled = { host: await val('#smtp-host'), port: await val('#smtp-port'), tls: await ev(`[...document.querySelectorAll('#main label.check input')].find(function(c){return /Implicit TLS/.test(c.closest('label').innerText)}).checked`), hint: await txt('#preset-hint'), link: await ev(`(document.querySelector('#preset-hint a')||{}).href`) };
  ok('AC1: Resend fills smtp.resend.com · 465 · TLS on, says the username is "resend" and the password an API key, links to where keys are made', filled.host === 'smtp.resend.com' && filled.port === '465' && filled.tls === true && /The word resend/.test(filled.hint) && /API key from Resend/.test(filled.hint) && filled.link === 'https://resend.com/api-keys', filled);
  await shot('bmg010-email-presets');
  await click('#main input[name=smtp-preset][value=gmail]');
  await sleep(200);
  ok('AC1: Gmail says an App password, not the Google password', /App password, not your Google password/.test(await txt('#preset-hint')) && (await val('#smtp-host')) === 'smtp.gmail.com');
  ok('the policy switches sit under "When someone signs up"', (await ev(`[...document.querySelectorAll('#main .drawer-section')].map(function(h){return h.innerText.trim()})`)).includes('WHEN SOMEONE SIGNS UP') || (await ev(`[...document.querySelectorAll('#main .drawer-section')].map(function(h){return h.textContent.trim()})`)).includes('When someone signs up'));

  // Now point it at the sink and save: Other, 127.0.0.1:2526, no auth, sending on.
  await click('#main input[name=smtp-preset][value=other]');
  await setVal('#smtp-host', '127.0.0.1');
  await setVal('#smtp-port', smtpPort);
  await setVal('#smtp-from', 'noreply@drive.test');
  await setVal('#smtp-baseurl', base);
  await ev(`(function(){var s=[...document.querySelectorAll('#main label.switch input')].find(function(c){return /Sending is on/.test(c.closest('label').innerText)}); if(!s.checked) s.click(); return true})()`);
  await clickText('#main button', 'Save');
  await sleep(1200);
  const cfg = (await call('GET', '/admin/email/config')).json;
  ok('Save: the config route holds host · port · enabled · from · base URL', cfg.configured === true && cfg.config.smtp.host === '127.0.0.1' && String(cfg.config.smtp.port) === smtpPort && cfg.config.enabled === true && cfg.config.baseUrl === base, { configured: cfg.configured, smtp: cfg.config.smtp });
  // AC1's send: the test email lands in the sink.
  await clickText('#main button', 'Send test email');
  await sleep(500);
  await setVal('.modal input[type=email]', 'me@drive.test');
  await clickText('.modal .foot button', 'Send');
  const first = await waitFor(() => (mails().length >= 1 ? mails() : null));
  ok('AC1: Send test email → one message in the sink, to me@drive.test', first && first.length === 1 && /me@drive\.test/.test(first[0].to.join(',')) && /test email/.test(first[0].body), first && { to: first[0].to, subject: (first[0].body.match(/^Subject: .*$/m) || [])[0] });

  // ---- AC3 + AC2: the template drawer ---------------------------------------------------------
  await ev(`location.hash = '#/email/verifyEmail'`);
  await sleep(1200);
  ok('the card’s Edit opens #/email/verifyEmail in a drawer titled in words', (await exists('.drawer')) && (await txt('.drawer h3')) === 'Verify your email');
  const list = (await call('GET', '/admin/email/templates')).json.templates;
  const serverVars = list.find((t) => t.id === 'verifyEmail').variables;
  const chips = await ev(`[...document.querySelectorAll('.drawer .placeholder-bar [data-placeholder]')].map(function(c){return [c.getAttribute('data-placeholder'), c.innerText.trim()]})`);
  ok('AC3: the chips are exactly the backend’s variables for this template (name and label)', J(chips) === J(serverVars.map((v) => [v.name, v.label])), chips);
  ok('AC3: no chip for a name this template’s sender does not supply (expiresIn)', !chips.some((c) => c[0] === 'expiresIn'));
  // Every chip inserts a token that renders: empty the body, click each chip, preview each one.
  await setVal('.drawer #tpl-text', '');
  await ev(`document.querySelector('.drawer #tpl-text').focus()`);
  for (const [name] of chips) {
    await ev(`(function(){var t=document.querySelector('.drawer #tpl-text'); t.focus(); t.setSelectionRange(t.value.length,t.value.length); return true})()`);
    await click(`.drawer [data-placeholder="${name}"]`);
    await sleep(100);
  }
  const bodyAfter = await val('.drawer #tpl-text');
  ok('AC3: clicking every chip drops its {{token}} into the body at the caret', bodyAfter === chips.map((c) => '{{' + c[0] + '}}').join(''), bodyAfter);
  await sleep(700);
  const renderedAll = await txt('.drawer #tpl-preview pre');
  ok('AC3: every token renders as its sample in the server’s preview — none is empty', serverVars.every((v) => renderedAll.includes(v.sample)) && renderedAll === serverVars.map((v) => v.sample).join(''), renderedAll);

  // AC2: subject + body, preview, send me this, save, reset.
  await setVal('.drawer #tpl-subject', 'Hello {{username}} from {{appName}}');
  await setVal('.drawer #tpl-text', 'Go here: {{verifyUrl}}\n\nThanks.');
  await sleep(800);
  const previewSubject = await txt('.drawer #tpl-preview .preview-subject');
  const previewText = await txt('.drawer #tpl-preview pre');
  ok('AC2: the preview pane is the server’s rendering of the unsaved draft', previewSubject === 'Hello jane.doe from Your App' && previewText === 'Go here: https://example.com/apps/demo/verify_email?username=jane.doe&token=SAMPLE\n\nThanks.', { previewSubject, previewText });
  ok('§5: the preview renders no HTML in the page (text nodes only)', (await count('.drawer #tpl-preview a, .drawer #tpl-preview p')) === 0);
  await shot('bmg010-template-drawer');
  await clickText('.drawer .drawer-foot button', 'Send me this');
  await sleep(500);
  await setVal('.modal #send-me-to', 'me@drive.test');
  await clickText('.modal .foot button', 'Send');
  const two = await waitFor(() => (mails().length >= 2 ? mails() : null));
  const wire = two && two[1].body;
  const wireSubject = wire && (wire.match(/^Subject: (.*)$/m) || [])[1];
  // nodemailer sends the plain part quoted-printable (soft breaks, =3D): decode it back to the words.
  const qp = (s) => s.replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  const plainPart = (body) => {
    const m = /Content-Type: text\/plain[^]*?\r?\n\r?\n([^]*?)\r?\n----/.exec(body);
    return m ? qp(m[1]).replace(/\r\n/g, '\n').trim() : null; // SMTP carries CRLF; the page's words have LF
  };
  const wireText = wire && plainPart(wire);
  ok('AC2: Send me this → the message in the sink carries the preview’s subject and body, UNSAVED', two && two.length === 2 && wireSubject === previewSubject && wireText === previewText, { wireSubject, wireText });
  const notSaved = (await call('GET', '/admin/email/templates')).json.templates.find((t) => t.id === 'verifyEmail');
  ok('AC2: previewing and sending saved nothing', notSaved.isOverridden === false);
  await clickText('.drawer .drawer-foot button', 'Save');
  await sleep(1000);
  const saved = (await call('GET', '/admin/email/templates')).json.templates.find((t) => t.id === 'verifyEmail');
  ok('AC2: Save → the route holds the subject and body; the card says edited', saved.isOverridden === true && saved.effective.subject === 'Hello {{username}} from {{appName}}' && /edited/.test(await ev(`[...document.querySelectorAll('#main .template-card')].find(function(c){return /Verify your email/.test(c.innerText)}).innerText`)), saved.override);
  ok('after Save the danger row offers Reset to default', await ev(`[...document.querySelectorAll('.drawer .danger-zone button')].some(function(b){return b.textContent.trim()==='Reset to default'})`));
  await clickText('.drawer .danger-zone button', 'Reset to default');
  await sleep(400);
  await clickText('.modal .foot button', 'Reset to default');
  await sleep(1000);
  const reset = (await call('GET', '/admin/email/templates')).json.templates.find((t) => t.id === 'verifyEmail');
  const cardChip = await ev(`[...document.querySelectorAll('#main .template-card')].find(function(c){return /Verify your email/.test(c.innerText)}).querySelector('.chip').innerText.trim()`);
  ok('AC2: Reset → the shipped default is back and the card chip says default', reset.isOverridden === false && reset.effective.subject === 'Verify your email for {{appName}}' && cardChip === 'default', { cardChip, subject: reset.effective.subject });
  ok('AC7 email, drawer open: the only textareas are the body and the HTML (prose), no separated field', (await ev(`[...document.querySelectorAll('textarea')].map(function(t){return t.id})`)).every((id) => id === 'tpl-text' || id === 'tpl-html') && J(await separated()) === '[]');
  await ev(`[...document.querySelectorAll('.drawer .disclose-head')].find(function(h){return /Edit HTML/.test(h.innerText)}).click()`);
  await sleep(700);
  ok('Edit HTML is behind a disclosure and shows the rendered HTML as source, not as a page', (await exists('.drawer #tpl-html')) && /<p>/.test(await txt('.drawer #tpl-html-preview')) && (await count('.drawer #tpl-html-preview p')) === 0);
  await shot('bmg010-template-html');

  const n = Object.keys(out.checks).length;
  const passed = Object.values(out.checks).filter((c) => c.pass).length;
  console.log(`\n${passed}/${n} checks passed`);
  fs.writeFileSync(process.env.OUT, JSON.stringify(out, null, 2));
};
