/**
 * P125 CCN-006 — the offer of the desktop app, in a browser window the agent opened.
 *
 * Richard, 2026-10-23: one install gets Studio into the conversation; the desktop app is offered at the moment a
 * person needs it, not before. That moment is this window losing its server. The window is Studio served through
 * this process's proxy (studioProxy.ts), so when the agent's host quits (Claude Desktop, Claude Code, Cline) the
 * page is still on screen and can save nothing. This script notices, says the work is safe and where it is, and
 * offers the app that opens the same folder without the agent.
 *
 * Before that, a small pill says which agent the window is working with and offers the app once; dismissed, it
 * stays dismissed. Inside a conversation's panel (an iframe) the script does nothing: the host's panel has its own
 * strip.
 *
 * The proxy adds it to Studio's page (`GET /`), so a page Studio's desktop app serves never carries it: the offer
 * exists only where the agent is the window's lifeline. It reads `/__nodegx/status` every three seconds; two
 * misses in a row is the server gone (one can be a slow answer). If the server comes back on the same port (the
 * proxy asks for its last port first), the page reloads itself.
 *
 * A string, not a function's source: the bundler may wrap functions in helpers the browser does not have.
 * No backticks and no `${` inside it.
 */

export const COMPANION_PATH = '/__nodegx/companion.js';
export const STATUS_PATH = '/__nodegx/status';
export const OPEN_APP_PATH = '/__nodegx/open-app';

export interface CompanionStatus {
  /** The agent's host, as a person calls it ("Claude Code"). */
  client: string;
  projectDir: string | null;
  app: { opensLinks: boolean } | null;
  download: string;
  scheme: string;
}

/** The agent's host, from the `clientInfo.name` it sent at initialize, in the words a person uses for it. */
export function clientLabel(name: string | undefined): string {
  const n = (name ?? '').toLowerCase();
  if (n === 'claude-code' || n.startsWith('claude-code')) return 'Claude Code';
  if (n === 'claude-ai' || n.startsWith('local-agent-mode') || n.startsWith('claude')) return 'Claude';
  if (n.includes('cline')) return 'Cline';
  if (n.includes('cursor')) return 'Cursor';
  if (n.includes('vibe') || n.includes('mistral')) return 'Mistral Vibe';
  return 'your AI agent';
}

/** Studio's page with the companion added. Only a whole HTML document gets it. */
export function injectCompanion(html: string): string {
  if (!/<html[\s>]/i.test(html) || html.includes(COMPANION_PATH)) return html;
  const tag = `<script src="${COMPANION_PATH}" defer></script>`;
  return /<\/body>/i.test(html) ? html.replace(/<\/body>/i, `${tag}</body>`) : html + tag;
}

export const COMPANION_JS = String.raw`(function () {
  if (window.parent !== window || window.__nodegxCompanion) return;
  window.__nodegxCompanion = true;

  var STATUS = '/__nodegx/status';
  var OPEN_APP = '/__nodegx/open-app';
  var DISMISSED = 'nodegx.companion.pill.dismissed';
  var status = null;
  var misses = 0;
  var lost = false;

  function store(get, value) {
    try { return get ? localStorage.getItem(DISMISSED) : localStorage.setItem(DISMISSED, value); } catch (e) { return null; }
  }
  function h(tag, attrs, kids) {
    var e = document.createElement(tag);
    for (var k in attrs || {}) {
      if (k === 'text') e.textContent = attrs[k];
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), attrs[k]);
      else e.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }
  function folderName() {
    var d = (status && status.projectDir) || '';
    var parts = d.split(/[\\/]/).filter(Boolean);
    return parts[parts.length - 1] || 'your project';
  }
  function who() { return (status && status.client) || 'your AI agent'; }

  // Studio's own light look (its header, its blue), so the offer reads as part of Studio, not a page on top of it.
  var css = h('style', { text: [
    '#ngx-pill, #ngx-veil, #ngx-bar { font: 13px/1.4 Inter, system-ui, -apple-system, sans-serif; color: #101828; }',
    '#ngx-pill button, #ngx-veil button, #ngx-bar button { font: inherit; cursor: pointer; margin: 0; }',
    '#ngx-pill { position: fixed; right: 12px; bottom: 12px; z-index: 2147483000; display: flex; align-items: center; gap: 8px;',
    '  padding: 5px 4px 5px 12px; background: #fff; border: 1px solid #e4e7ec; border-radius: 999px;',
    '  box-shadow: 0 4px 16px rgba(16,24,40,.10); }',
    '#ngx-pill .ngx-dot { width: 8px; height: 8px; border-radius: 50%; background: #17b26a; flex: none; }',
    '#ngx-pill .ngx-who { color: #475467; white-space: nowrap; }',
    '#ngx-pill .ngx-go { padding: 4px 12px; border: 1px solid #1570ef; border-radius: 999px; background: #1570ef; color: #fff; font-weight: 600; }',
    '#ngx-pill .ngx-go:hover { background: #175cd3; }',
    '#ngx-pill .ngx-x { width: 26px; height: 26px; border: 0; border-radius: 50%; background: transparent; color: #98a2b3; font-size: 16px; line-height: 1; }',
    '#ngx-pill .ngx-x:hover { color: #344054; background: #f2f4f7; }',
    '#ngx-veil { position: fixed; inset: 0; z-index: 2147483001; display: grid; place-items: center; padding: 16px;',
    '  background: rgba(16,24,40,.38); backdrop-filter: blur(2px); }',
    '#ngx-card { width: min(460px, 100%); box-sizing: border-box; background: #fff; border: 1px solid #e4e7ec; border-radius: 14px;',
    '  padding: 24px; box-shadow: 0 20px 48px rgba(16,24,40,.22); }',
    '#ngx-card h2 { margin: 0 0 14px; font-size: 18px; line-height: 1.3; font-weight: 650; color: #101828; }',
    '#ngx-card p { margin: 0 0 10px; color: #344054; }',
    '#ngx-card .ngx-safe { padding: 10px 12px; margin: 0 0 14px; background: #ecfdf3; border: 1px solid #abefc6; border-radius: 10px; color: #067647; }',
    '#ngx-card .ngx-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 18px; }',
    '#ngx-card .ngx-primary { padding: 8px 16px; border: 1px solid #1570ef; border-radius: 8px; background: #1570ef; color: #fff; font-weight: 600; }',
    '#ngx-card .ngx-primary:hover { background: #175cd3; }',
    '#ngx-card .ngx-plain { padding: 8px 14px; border: 1px solid #d0d5dd; border-radius: 8px; background: #fff; color: #344054; font-weight: 500; }',
    '#ngx-card .ngx-plain:hover { background: #f9fafb; }',
    '#ngx-card .ngx-links { gap: 16px; margin-top: 16px; }',
    '#ngx-card .ngx-quiet { padding: 0; border: 0; background: none; color: #475467; text-decoration: underline; text-underline-offset: 3px; }',
    '#ngx-card .ngx-quiet:hover { color: #101828; }',
    '#ngx-card .ngx-note { margin: 12px 0 0; color: #475467; font-size: 12.5px; }',
    '#ngx-bar { position: fixed; right: 12px; bottom: 12px; z-index: 2147483000; display: flex; align-items: center; gap: 10px;',
    '  padding: 5px 5px 5px 14px; background: #fffaeb; border: 1px solid #fedf89; border-radius: 999px; color: #93370d;',
    '  box-shadow: 0 4px 16px rgba(16,24,40,.10); }',
    '#ngx-bar button { padding: 3px 12px; border: 1px solid #fec84b; border-radius: 999px; background: #fff; color: #93370d; }'
  ].join('\n') });

  function openApp() {
    if (!status) return;
    if (!lost) {
      fetch(OPEN_APP, { method: 'POST' }).then(function (r) { return r.json(); }).then(function (r) {
        if (r && r.opened) say('Opening ' + folderName() + ' in NodeGX Studio…');
        else window.open(status.download, '_blank', 'noopener');
      }).catch(function () { window.open(status.download, '_blank', 'noopener'); });
      return;
    }
    location.href = status.scheme + '://open?dir=' + encodeURIComponent(status.projectDir || '');
  }
  function copyPath(btn) {
    var d = (status && status.projectDir) || '';
    var done = function () { btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = 'Copy the folder location'; }, 1600); };
    if (navigator.clipboard) navigator.clipboard.writeText(d).then(done, function () { window.prompt('The folder location:', d); });
    else window.prompt('The folder location:', d);
  }

  // The pill: while the server is here.
  var pill = null;
  function drawPill() {
    if (pill) pill.remove();
    pill = null;
    if (!status || lost || store(true)) return;
    var installed = !!status.app;
    pill = h('div', { id: 'ngx-pill', role: 'status' }, [
      h('span', { class: 'ngx-dot' }),
      h('span', { class: 'ngx-who', text: 'Connected to ' + who() }),
      h('button', {
        class: 'ngx-go',
        text: installed ? 'Open in the desktop app' : 'Get the desktop app',
        title: 'NodeGX Studio as a desktop app opens this folder and keeps working when ' + who() + ' is closed.',
        onclick: openApp
      }),
      h('button', { class: 'ngx-x', title: 'Hide', 'aria-label': 'Hide', text: '×', onclick: function () { store(false, '1'); drawPill(); } })
    ]);
    document.body.appendChild(pill);
  }
  function say(text) {
    var w = pill && pill.querySelector('.ngx-who');
    if (w) w.textContent = text;
  }

  // The card: when the server has gone.
  var veil = null;
  var bar = null;
  var backLine = null;
  function drawLost() {
    if (pill) { pill.remove(); pill = null; }
    if (bar) { bar.remove(); bar = null; }
    if (veil) return;
    var app = status && status.app;
    var actions = [];
    if (app && app.opensLinks) actions.push(h('button', { class: 'ngx-primary', text: 'Open in NodeGX Studio', onclick: openApp }));
    else if (!app) actions.push(h('button', { class: 'ngx-primary', text: 'Get NodeGX Studio', onclick: function () { window.open(status.download, '_blank', 'noopener'); } }));
    var copy = h('button', { class: 'ngx-plain', text: 'Copy the folder location', onclick: function () { copyPath(copy); } });
    actions.push(copy);
    backLine = h('p', { class: 'ngx-note', hidden: '' });
    veil = h('div', { id: 'ngx-veil', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'ngx-title' }, [
      h('div', { id: 'ngx-card' }, [
        h('h2', { id: 'ngx-title', text: who() + ' has closed' }),
        h('p', { class: 'ngx-safe' }, [document.createTextNode('Your app is safe. Everything up to now is saved in the folder “' + folderName() + '”.')]),
        h('p', { text: 'This window was running through ' + who() + ', so it can’t save anything new.' }),
        h('p', { text: app
          ? (app.opensLinks ? 'NodeGX Studio is on this computer. It opens the same folder and works on its own.'
                            : 'NodeGX Studio is on this computer. Open it and choose this folder to carry on without ' + who() + '.')
          : 'NodeGX Studio, the free desktop app, opens the same folder and works on its own.' }),
        h('div', { class: 'ngx-row' }, actions),
        backLine,
        h('div', { class: 'ngx-row ngx-links' }, [
          h('button', { class: 'ngx-quiet', text: 'I’ll go back to ' + who(), onclick: function () {
            backLine.hidden = false;
            backLine.textContent = 'Ask ' + who() + ' to open Studio again. This window reconnects when it does.';
          } }),
          h('button', { class: 'ngx-quiet', text: 'Just look at it', onclick: function () { veil.remove(); veil = null; drawBar(); } })
        ])
      ])
    ]);
    document.body.appendChild(veil);
  }
  function drawBar() {
    bar = h('div', { id: 'ngx-bar', role: 'status' }, [
      h('span', { text: who() + ' has closed. Changes made here won’t be saved.' }),
      h('button', { text: 'What now?', onclick: function () { bar.remove(); bar = null; drawLost(); } })
    ]);
    document.body.appendChild(bar);
  }

  function poll() {
    var ctl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 2500);
    fetch(STATUS, { cache: 'no-store', signal: ctl ? ctl.signal : undefined })
      .then(function (r) { return r.json(); })
      .then(function (s) {
        clearTimeout(timer);
        misses = 0;
        if (lost) {
          if (s.studio) { location.reload(); return; }
          if (backLine) { backLine.hidden = false; backLine.textContent = who() + ' is back. Ask it to open Studio and this window reconnects.'; }
          return;
        }
        var first = !status;
        status = s;
        if (first) drawPill();
      })
      .catch(function () {
        clearTimeout(timer);
        misses += 1;
        if (status && !lost && misses >= 2) { lost = true; drawLost(); }
      });
  }

  function start() {
    document.head.appendChild(css);
    poll();
    setInterval(poll, 3000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) poll(); });
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
`;
