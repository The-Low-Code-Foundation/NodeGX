// Seeing the backend as one real person, for real (BACKEND-2.md): a short-lived key bound to that
// person, the backend's MCP door, which runs functions AS them, and the backend's own rule checks.
// Nothing here simulates: every answer is the backend's. Every function call is a real run.
//
// The key's secret lives only in a local variable for the length of one question, then the key is
// deleted. It is never returned, logged or written anywhere.

export const KEY_SUFFIX = '-by-backend-map';

/** Words a function's own description uses when it changes something. */
const WRITE_WORDS = /\b(save|saves|record|records|delete|deletes|mark|marks|write|writes|publish|publishes|copy|copies|add|adds|turn|turns|stop|stops|send|sends|set|sets|create|creates|reply|replies|accept|accepts|change|changes|update|updates|remove|removes|import|give|gives)\b/i;

export function personName(u) {
  if (u.firstName || u.lastName) return [u.firstName, u.lastName].filter(Boolean).join(' ');
  const base = String(u.email ?? u.username ?? u.objectId).split('@')[0];
  if (!u.email) return `${base} (no email)`;
  return base
    .split(/[._-]+/)
    .filter(Boolean)
    .map((p) => (p.length === 1 ? p.toUpperCase() + '.' : p[0].toUpperCase() + p.slice(1)))
    .join(' ');
}

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

/**
 * Whether the map may run a function as someone, and why not. Read-only only: the map saw no write
 * in its graph or code, AND its own description says nothing that changes data.
 */
export function runnable(fn, tool) {
  const writes = fn?.touches?.filter((t) => t.hows.some((h) => h === 'creates' || h === 'changes' || h === 'deletes')) ?? [];
  if (writes.length) return { ok: false, why: `it changes data (it ${writes.map((t) => `${t.hows.filter((h) => h !== 'reads' && h !== 'mentions').join(' and ')} ${t.table}`).join('; ')}), so the map never runs it` };
  const desc = tool?.description ?? '';
  const m = desc.match(WRITE_WORDS);
  if (m) return { ok: false, why: `its own description says it ${m[0].toLowerCase()}s or changes something (“${desc.slice(0, 110)}${desc.length > 110 ? '…' : ''}”), so the map never runs it` };
  return { ok: true };
}

export function asPerson(be, opts = {}) {
  const mine = opts.mine ?? new Map(); // requestId → { person, fn }
  const live = new Set(); // objectIds of keys that exist right now

  /** Makes a key bound to the person, hands an MCP caller to `work`, and deletes the key, always. */
  async function withKey(user, work) {
    const name = `view-as-${slug(personName(user))}${KEY_SUFFIX}`;
    const made = await be.post('/admin/keys', { name, scopes: ['functions:*'], actsAsUserId: user.objectId });
    let secret = made.secret;
    live.add(made.objectId);
    const person = personName(user);
    async function mcp(method, params) {
      const res = await fetch(be.base + '/mcp', {
        method: 'POST',
        headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })
      });
      const requestId = res.headers.get('x-request-id');
      const text = await res.text();
      let json = null;
      try {
        json = JSON.parse(text);
      } catch {
        // an event stream: the last data line carries the answer
        const data = text.split('\n').filter((l) => l.startsWith('data:')).pop();
        if (data) json = JSON.parse(data.slice(5));
      }
      return { json, requestId, status: res.status };
    }
    try {
      return await work({
        keyName: name,
        async tools() {
          const { json } = await mcp('tools/list');
          if (!json?.result) throw new Error(json?.error?.message ?? 'The backend’s MCP door gave no list.');
          return json.result.tools;
        },
        async call(fn, args) {
          const started = Date.now();
          const { json, requestId } = await mcp('tools/call', { name: fn, arguments: args });
          if (requestId) mine.set(requestId, { person, fn, key: name });
          const ms = Date.now() - started;
          if (json?.error) return { ok: false, error: json.error.message ?? 'refused', ms, requestId };
          const r = json?.result;
          if (r?.isError) return { ok: false, error: r.content?.map((c) => c.text).join(' ') || 'refused', ms, requestId };
          let value = r?.structuredContent;
          if (value === undefined) {
            const t = r?.content?.find((c) => c.type === 'text')?.text;
            try {
              value = t ? JSON.parse(t) : null;
            } catch {
              value = t;
            }
          }
          if (value && typeof value === 'object' && 'result' in value && Object.keys(value).length === 1) value = value.result;
          return { ok: true, value, ms, requestId };
        }
      });
    } finally {
      secret = null;
      await be.del(`/admin/keys/${encodeURIComponent(made.objectId)}`).catch(() => {});
      live.delete(made.objectId);
    }
  }

  /** Deletes any key this map made and didn't get to delete (a crash, a killed process). */
  async function sweep() {
    try {
      const { keys } = await be.get('/admin/keys');
      for (const k of keys ?? []) {
        // deleting revokes a key and the backend keeps the record: only a working one needs deleting
        if (!k.revoked && String(k.name ?? '').endsWith(KEY_SUFFIX) && !live.has(k.objectId)) await be.del(`/admin/keys/${encodeURIComponent(k.objectId)}`).catch(() => {});
      }
    } catch {
      /* nothing to sweep */
    }
  }

  return { withKey, sweep, mine, live };
}

/** Every string in an answer, for finding one row's ids in it. */
export function containsAny(value, needles) {
  const text = JSON.stringify(value ?? null);
  return needles.filter((n) => text.includes(JSON.stringify(n).slice(1, -1)));
}

/**
 * The arguments a call needs that the map can honestly supply, and what's missing.
 * `context` is name → { value, from }, `from` saying in words where the value came from.
 */
export function argsFor(tool, context) {
  const required = tool?.inputSchema?.required ?? [];
  const args = {};
  const from = {};
  const missing = [];
  for (const name of required) {
    const c = context[name];
    if (c && c.value !== undefined && c.value !== null && c.value !== '') {
      args[name] = c.value;
      from[name] = c.from;
    } else missing.push(name);
  }
  return { args, from, missing };
}
