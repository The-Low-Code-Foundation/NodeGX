/**
 * The shell: sign-in form or the app (brand, top bar, nav, main), with the
 * route deciding which page renders. The page is keyed by its id, so moving
 * between pages remounts; moving within one (`#/collections/Pet` →
 * `#/collections/Pet/<id>`) re-renders it with new parameters.
 */
import { useEffect, useState } from 'preact/hooks';

import { live, signOut, submitCredential, useSession } from './api';
import { useStore } from './store';
import { visibleNav } from './nav';
import { currentRoute, hashPath, href, replaceRoute, useRoute } from './router';
import { toggleTheme, useTheme } from './theme';
import { Btn, Chip, ModalHost, Notice, ToastHost } from './ui';
import { VIEWS, findView } from './views';

export function App() {
  const s = useSession();
  return (
    <>
      {s.whoami ? <Shell /> : s.booting ? null : <Login error={s.loginError} />}
      <ToastHost />
      <ModalHost />
    </>
  );
}

function Login({ error }: { error: string | null }) {
  const [token, setToken] = useState('');
  const [remember, setRemember] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <div id="login">
      <form
        id="login-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!token || busy) return;
          setBusy(true);
          submitCredential(token, remember).finally(() => setBusy(false));
        }}
      >
        <h1>
          <span class="dot" /> NodeGX Backend
        </h1>
        <p class="sub">Sign in with this backend’s admin credential.</p>
        <div class="field-row">
          <input
            id="login-token"
            type="password"
            autocomplete="current-password"
            placeholder="Admin credential"
            aria-label="Admin credential"
            value={token}
            onInput={(e) => setToken((e.currentTarget as HTMLInputElement).value)}
          />
          <button class="btn primary" type="submit" disabled={busy}>
            Sign in
          </button>
        </div>
        <label class="check" style="margin-top: 10px">
          <input id="login-remember" type="checkbox" checked={remember} onChange={(e) => setRemember((e.currentTarget as HTMLInputElement).checked)} /> Keep me
          signed in on this tab
        </label>
        {error ? (
          <div id="login-error" class="notice bad" style="margin-top: 14px">
            {error}
          </div>
        ) : null}
        <p class="sub" style="margin: 16px 0 0; font-size: 11px">
          The credential is the <code>adminToken</code> in the backend’s <code>secrets.json</code>, or whatever was passed to <code>--token</code>. A
          read-only credential signs in here too.
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
 * Dev-open, told honestly. When it is on, the backend relaxes EVERY gate — including this
 * page's. Showing a password box in front of that would be theatre, so we say what is true.
 */
function DevOpenNotice() {
  return (
    <Notice kind="warn">
      <b>This backend enforces nothing. </b>
      dev-open is enabled in security.json, so collection permissions, row ACLs and this dashboard’s own credential are all bypassed. It is only ever
      active on a loopback bind — the service refuses to start dev-open while bound beyond localhost. Set "devOpen": false to test real
      enforcement.
    </Notice>
  );
}

/**
 * First run, told honestly. BAK-003 mints an admin credential before anything can be served, so
 * there is no safe "create the first admin" page. What we CAN say is that nobody has chosen it.
 */
function FirstRunNotice() {
  return (
    <Notice kind="accent">
      <b>First run. </b>
      This backend generated its own admin credential on this start — no operator has chosen one. It is the "adminToken" in the backend’s
      secrets.json (mode 0600). To set your own, restart the service with --token &lt;your-secret&gt;. To hand someone look-but-don’t-touch
      access, restart with --readonly-token &lt;another-secret&gt;.
    </Notice>
  );
}
