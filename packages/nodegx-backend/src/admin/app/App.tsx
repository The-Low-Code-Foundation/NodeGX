/**
 * The shell: sign-in form or the app (brand, top bar, nav, main), with the
 * route deciding which page renders. The page is keyed by its id, so moving
 * between pages remounts; moving within one (`#/collections/Pet` →
 * `#/collections/Pet/<id>`) re-renders it with new parameters.
 */
import { useEffect, useState } from 'preact/hooks';

import { createAdminAccount, live, signOut, submitCredential, submitPassword, useSession } from './api';
import { useStore } from './store';
import { visibleNav } from './nav';
import { currentRoute, hashPath, href, replaceRoute, useRoute } from './router';
import { toggleTheme, useTheme } from './theme';
import { Btn, Chip, Disclosure, ModalHost, Notice, ToastHost } from './ui';
import { VIEWS, findView } from './views';
import { cryptoRandom, generatePassword } from './views/users';

export function App() {
  const s = useSession();
  // BMG-014: signed in with the credential on a backend that has no admin
  // account yet — the setup step comes before anything else. A read-only
  // credential cannot make the account, so it sees the shell and a notice.
  const setup = !!s.whoami && !s.whoami.adminAccount && !s.readonly;
  return (
    <>
      {s.whoami ? setup ? <Setup /> : <Shell /> : s.booting ? null : <Login error={s.loginError} />}
      <ToastHost />
      <ModalHost />
    </>
  );
}

/**
 * Sign in as a person (BMG-014): email and password first. The credential
 * still signs in, behind *Use the admin credential instead* — it is what a
 * script, the editor and the first load of a new backend hold.
 */
function Login({ error }: { error: string | null }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  // A person is remembered in this browser unless they say otherwise; the credential only ever for this tab.
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  return (
    <div id="login">
      <form
        id="login-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (busy) return;
          if (token.trim()) {
            setBusy(true);
            submitCredential(token.trim(), remember).finally(() => setBusy(false));
            return;
          }
          if (!email.trim() || !password) return;
          setBusy(true);
          submitPassword(email.trim(), password, remember).finally(() => setBusy(false));
        }}
      >
        <h1>
          <span class="dot" /> NodeGX Backend
        </h1>
        <p class="sub">Sign in to manage this backend.</p>
        <div class="field" style="margin-top: 14px">
          <input
            id="login-email"
            type="text"
            autocomplete="username"
            placeholder="Email"
            aria-label="Email"
            value={email}
            onInput={(e) => setEmail((e.currentTarget as HTMLInputElement).value)}
          />
        </div>
        <div class="field-row" style="margin-top: 8px">
          <input
            id="login-password"
            type="password"
            autocomplete="current-password"
            placeholder="Password"
            aria-label="Password"
            value={password}
            onInput={(e) => setPassword((e.currentTarget as HTMLInputElement).value)}
          />
          <button class="btn primary" type="submit" disabled={busy || (!token.trim() && (!email.trim() || !password))}>
            Sign in
          </button>
        </div>
        <label class="check" style="margin-top: 10px">
          <input id="login-remember" type="checkbox" checked={remember} onChange={(e) => setRemember((e.currentTarget as HTMLInputElement).checked)} /> Keep me
          signed in on this browser
        </label>
        {error ? (
          <div id="login-error" class="notice bad" style="margin-top: 14px">
            {error}
          </div>
        ) : null}
        <div class="login-alt">
          <Disclosure label="Use the admin credential instead">
            <div class="field-row" style="margin-top: 6px">
              <input
                id="login-token"
                type="password"
                autocomplete="off"
                placeholder="Admin credential"
                aria-label="Admin credential"
                value={token}
                onInput={(e) => setToken((e.currentTarget as HTMLInputElement).value)}
              />
              <button class="btn" type="submit" disabled={busy || !token.trim()}>
                Sign in with it
              </button>
            </div>
            <p class="sub" style="margin: 10px 0 0; font-size: 11px">
              The credential is the <code>adminToken</code> in the backend’s <code>secrets.json</code>, or whatever was passed to <code>--token</code>.
              A new backend asks you to create your admin account once you sign in with it. A read-only credential signs in here too.
            </p>
          </Disclosure>
        </div>
      </form>
    </div>
  );
}

/**
 * The setup step (BMG-014): the first admin account, made with the credential
 * the page holds. One email, one password, and the page is that person.
 */
function Setup() {
  const s = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const backend = s.whoami!.backend || ({} as { name?: string });
  const ready = email.trim().indexOf('@') !== -1 && password.length > 0;
  return (
    <div id="login" class="setup">
      <form
        id="setup-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!ready || busy) return;
          setBusy(true);
          setError(null);
          createAdminAccount(email.trim(), password)
            .catch((err) => setError((err as Error).message))
            .finally(() => setBusy(false));
        }}
      >
        <h1>
          <span class="dot" /> Create your admin account
        </h1>
        <p class="sub">
          {backend.name ? <b>{backend.name}</b> : 'This backend'} has no admin yet. Choose the email and password you will sign in with here — and in
          your app, where this account is in the <b>admin</b> role.
        </p>
        <div class="field" style="margin-top: 14px">
          <input
            id="setup-email"
            type="email"
            autocomplete="username"
            placeholder="Email"
            aria-label="Email"
            value={email}
            onInput={(e) => setEmail((e.currentTarget as HTMLInputElement).value)}
          />
        </div>
        <div class="field-row" style="margin-top: 8px">
          <input
            id="setup-password"
            type={shown ? 'text' : 'password'}
            autocomplete="new-password"
            placeholder="Password"
            aria-label="Password"
            value={password}
            onInput={(e) => setPassword((e.currentTarget as HTMLInputElement).value)}
          />
          <button
            type="button"
            class="btn"
            onClick={() => {
              setPassword(generatePassword(cryptoRandom));
              setShown(true);
            }}
          >
            Generate
          </button>
          <button type="button" class="btn" aria-pressed={shown} onClick={() => setShown(!shown)}>
            {shown ? 'Hide' : 'Show'}
          </button>
        </div>
        <div class="field-row" style="margin-top: 14px">
          <button id="setup-submit" class="btn primary" type="submit" disabled={busy || !ready}>
            Create and sign in
          </button>
        </div>
        {error ? (
          <div id="setup-error" class="notice bad" style="margin-top: 14px">
            {error}
          </div>
        ) : null}
        <p class="sub" style="margin: 16px 0 0; font-size: 11px">
          The admin credential you signed in with stays as it is — scripts and the editor keep using it. From now on you sign in here as yourself,
          and give other people access from the Users page.
        </p>
        <p class="sub" style="margin: 8px 0 0; font-size: 11px">
          <a href="#" onClick={(e) => { e.preventDefault(); signOut(null); }}>Not now — sign out</a>
        </p>
      </form>
    </div>
  );
}

function Shell() {
  const s = useSession();
  const route = useRoute();
  const groups = visibleNav(s.features);

  // No route, or one this backend cannot show: land on the first page it can.
  const target = findView(route.view);
  const allowed = target && s.features[target.feature] ? target : undefined;
  useEffect(() => {
    if (allowed) return;
    const first = VIEWS.find((v) => s.features[v.feature]);
    if (first) replaceRoute(first.id);
  }, [route.view, allowed, s.features]);

  // `#/executions` and friends: normalise the legacy id in the address bar.
  useEffect(() => {
    // BMG-009: `#/runs?trigger=x` — compare the path's first segment, never the query.
    const raw = hashPath(location.hash).split('/')[0];
    const parsed = currentRoute();
    if (raw && parsed.view && raw !== parsed.view) replaceRoute(parsed.view, ...parsed.params);
  }, [route.view]);

  const View = allowed ? allowed.component : null;
  const whoami = s.whoami!;
  return (
    <div id="app">
      <div class="brand">
        <span class="dot" /> <b>NodeGX</b> <span class="brand-role">manager</span>
      </div>
      <Topbar />
      <nav id="nav" aria-label="Sections">
        {groups.map((g) => (
          <div key={g.label}>
            <div class="group">{g.label}</div>
            {g.entries.map((e) => (
              <a key={e.id} href={href(e.id)} aria-current={route.view === e.id ? 'true' : 'false'}>
                {e.label}
              </a>
            ))}
          </div>
        ))}
      </nav>
      <main id="main">
        {whoami.security && !whoami.security.enforced ? <DevOpenNotice /> : null}
        {whoami.firstRun ? <FirstRunNotice /> : null}
        {!whoami.adminAccount ? <NoAdminNotice /> : null}
        {View ? (
          <View key={allowed!.id} params={route.params} query={route.query} />
        ) : groups.length ? null : (
          <Notice kind="bad">This backend reports no available admin sections.</Notice>
        )}
      </main>
    </div>
  );
}

function Topbar() {
  const s = useSession();
  const liveState = useStore(live);
  const theme = useTheme();
  const backend = s.whoami!.backend || ({} as { name?: string; id?: string });
  const security = s.whoami!.security;
  return (
    <div class="topbar">
      <span id="backend-name" class="mono">
        {backend.name} · {backend.id}
      </span>
      <span id="tier-chip">{s.readonly ? <Chip kind="warn">read-only</Chip> : <Chip kind="accent">admin</Chip>}</span>
      <span id="person-chip" class="mono" title={s.whoami!.person ? 'Signed in as ' + (s.whoami!.person.email || s.whoami!.person.username) : 'Signed in with the admin credential'}>
        {s.whoami!.person ? s.whoami!.person.email || s.whoami!.person.username : 'credential'}
      </span>
      <span id="enforce-chip">{security && security.enforced ? <Chip kind="ok">enforcing</Chip> : <Chip kind="warn">dev-open — nothing enforced</Chip>}</span>
      <span class="spacer" />
      <span id="live-chip">{liveState.state === 'off' ? null : <Chip kind={liveState.state === 'live' ? 'ok' : 'warn'}>{liveState.state}</Chip>}</span>
      <button
        type="button"
        class="btn tiny theme-toggle"
        aria-label={theme.theme === 'dark' ? 'Switch to the light theme' : 'Switch to the dark theme'}
        title={theme.theme === 'dark' ? 'Light theme' : 'Dark theme'}
        onClick={toggleTheme}
      >
        {theme.theme === 'dark' ? '☀' : '☾'}
      </button>
      <Btn tiny id="signout" onClick={() => signOut(null)}>
        Sign out
      </Btn>
    </div>
  );
}

/**
 * Dev-open, told honestly. When it is on, the backend relaxes the data and function gates
 * (not this page's own — FH-024 kept the admin gate), so what a person tests here is not
 * what a locked backend enforces.
 */
function DevOpenNotice() {
  return (
    <Notice kind="warn">
      <b>This backend enforces nothing for your app. </b>
      dev-open is enabled in security.json, so collection permissions and row ACLs are bypassed for every caller. It is only ever active on a
      loopback bind — the service refuses to start dev-open while bound beyond localhost. Set "devOpen": false to test real enforcement.
    </Notice>
  );
}

/**
 * First run, told honestly: the credential this backend minted on this start is still there
 * (scripts and the editor use it), and nobody chose it. Shown only once the admin account
 * exists — before that, the setup step is the whole page.
 */
function FirstRunNotice() {
  return (
    <Notice kind="accent">
      <b>First run. </b>
      This backend generated its own admin credential on this start. It is the "adminToken" in the backend’s secrets.json (mode 0600) — the
      editor and scripts use it; you sign in here as yourself. To choose your own, restart the service with --token &lt;your-secret&gt;.
    </Notice>
  );
}

/** A read-only sign-in on a backend with no full admin yet: say what is missing and who can fix it. */
function NoAdminNotice() {
  return (
    <Notice kind="warn">
      <b>No admin account yet. </b>
      Nobody has full access to this backend as a person. Sign in with the full admin credential and the manager asks you to create one.
    </Notice>
  );
}
