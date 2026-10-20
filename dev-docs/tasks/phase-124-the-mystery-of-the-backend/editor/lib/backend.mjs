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
    try {
      res = await fetch(base + path, {
        method,
        headers: { Authorization: `Bearer ${token}`, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers },
        body: body !== undefined ? JSON.stringify(body) : undefined
      });
    } catch (e) {
      throw new BackendError(0, `The backend at ${base} isn’t answering. Is it running?`);
    }
    const text = await res.text();
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
