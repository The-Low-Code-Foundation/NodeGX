// The running backend, with the admin credential. Only the editor's server holds the credential;
// the page talks to the editor's server.

export class BackendError extends Error {
  constructor(status, message, body) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export function backend(baseUrl, token) {
  const base = baseUrl.replace(/\/$/, '');
  async function call(method, path, body, headers = {}) {
    let res;
    let text;
    // The backend limits admin requests (300 a minute, bursts of 100): when it says "retry in N s", wait and retry.
    for (let attempt = 0; ; attempt++) {
      try {
        res = await fetch(base + path, {
          method,
          headers: { Authorization: `Bearer ${token}`, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers },
          body: body !== undefined ? JSON.stringify(body) : undefined
        });
      } catch (e) {
        throw new BackendError(0, `The backend at ${base} isn’t answering. Is it running?`);
      }
      text = await res.text();
      if (res.status !== 429 || attempt >= 8) break;
      const after = Number(res.headers.get('retry-after')) || Number(text.match(/Retry in (\d+)s/)?.[1]) || 1;
      await new Promise((r) => setTimeout(r, after * 1000 + 50));
    }
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      /* not JSON */
    }
    if (!res.ok) {
      const msg = json?.error?.message ?? json?.error ?? json?.message ?? text.slice(0, 200);
      throw new BackendError(res.status, `The backend said no (${res.status}): ${msg}`, json);
    }
    return { json, headers: res.headers };
  }
  return {
    base,
    get: (p) => call('GET', p).then((r) => r.json),
    getWithHeaders: (p) => call('GET', p),
    put: (p, b, h) => call('PUT', p, b, h).then((r) => r.json),
    post: (p, b) => call('POST', p, b).then((r) => r.json),
    del: (p) => call('DELETE', p).then((r) => r.json),
    async health() {
      const res = await fetch(base + '/health').catch(() => null);
      return res && res.ok ? res.json() : null;
    }
  };
}
