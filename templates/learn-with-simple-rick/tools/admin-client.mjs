/**
 * The admin door of a NodeGX backend, for this template's setup tools (P119 SRK-003).
 * The same shape as the DBT template's `tools/lib/admin-client.mjs`.
 */
export function adminClient(backend, token) {
  const BACKEND = String(backend).replace(/\/$/, '');
  async function call(method, path, body) {
    const res = await fetch(BACKEND + path, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const text = await res.text();
    let json;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { raw: text };
    }
    if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${text.slice(0, 400)}`);
    return json;
  }
  return { call };
}

export function argsOf(argv) {
  return (name) => {
    const i = argv.indexOf(`--${name}`);
    return i > -1 ? argv[i + 1] : undefined;
  };
}
