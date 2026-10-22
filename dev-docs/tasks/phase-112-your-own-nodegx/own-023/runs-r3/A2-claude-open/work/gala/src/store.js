// The two files the server keeps outside the game folder (serve.mjs): settings.json and save.json. Only these two, only on
// this machine. Every call here fails quietly: when the server can't be reached, the page plays on with this browser's copy.
const NAMES = ['settings', 'save'];
const url = (name) => `/api/${name}`;

// { reached: true, data } (the server answers null when there is no file yet), or { reached: false }
export async function getFile(name) {
  if (!NAMES.includes(name) || typeof fetch !== 'function') return { reached: false };
  try {
    const r = await fetch(url(name), { cache: 'no-store', signal: AbortSignal.timeout(2500) });
    if (!r.ok) return { reached: false };
    return { reached: true, data: await r.json() };
  } catch { return { reached: false }; }
}

// written a moment later, the last version only (a stepper pressed ten times sends one file); resolves true once stored
const queue = {};
export function putFile(name, data, delay = 300) {
  if (!NAMES.includes(name) || typeof fetch !== 'function') return Promise.resolve(false);
  const q = queue[name] || (queue[name] = { waiters: [], timer: null, busy: null });
  q.body = JSON.stringify(data); clearTimeout(q.timer);
  q.timer = setTimeout(() => send(name), delay);
  return new Promise((res) => q.waiters.push(res));
}
async function send(name, keepalive = false) {
  const q = queue[name]; clearTimeout(q.timer); q.timer = null;
  if (q.busy) await q.busy;
  const body = q.body, waiters = q.waiters.splice(0);
  q.busy = (async () => {
    let ok = false;
    try { ok = (await fetch(url(name), { method: 'PUT', headers: { 'content-type': 'application/json' }, body, keepalive: keepalive && body.length < 60000 })).ok; } catch { /* unreachable */ }
    waiters.forEach((w) => w(ok));
  })();
  await q.busy; q.busy = null;
}
// send what is waiting now (before a reload, or when the page is closed)
export function flush(keepalive = false) {
  return Promise.all(Object.keys(queue).map((n) => (queue[n].timer ? send(n, keepalive) : queue[n].busy)));
}
if (typeof addEventListener === 'function') addEventListener('pagehide', () => { flush(true); });
