/**
 * A Parse-wire backend in memory, for the Noodl Desk (P18 session 134, EXP-020): both arms of
 * `tests/the-noodl-api-travels.test.ts` talk to it, the runtime's through `XMLHttpRequest` (`ParseWireAdapter`, the viewer's
 * `cloudfunctions.ts`) and the export's through `fetch` (`src/lib/noodl.ts`). It answers one task late, as a network does,
 * and logs every request (method, path, JSON body, whether a session token rode along), so the two arms' wire traffic can
 * be compared byte for byte.
 *
 * `spec`: `{ classes: { [name]: rows }, sessions: { [token]: user } }`. A row is stored as the wire sends it (`objectId`,
 * pointers and dates in their envelopes). The routes the desk asks for, and only those:
 *
 * - `POST /classes/<c>` with `_method: 'GET'` — a query: `where` over `$eq`, `$ne`, `$in`, `$nin`, `$and`, `$or` (a pointer
 *   compares by its id), then `limit`. `{ results }`, with `count` where asked. The class `Locked` is refused: 403
 *   `{ code: 119, error: 'Permission denied for Locked.' }`.
 * - `POST /functions/whoAmI` — `{ result: { me } }`, `me` the session's user or `null`.
 * - `POST /functions/addTask` — stores `{ title, done: false }` as a new Task; `{ result: { id } }`.
 * - `POST /functions/locked` — refused: 400 `{ code: 141, error: 'Not for you.' }`.
 * - `GET /files/<name>/sign` — `{ url, expiresAt, ttlSeconds }`; 403 `{ error: 'This file is private.' }` for `secret.png`.
 * - `GET /users/me` — the session's user (the runtime's UserService checks a stored session once, at its start; the
 *   export trusts the stored one, so this request is the runtime arm's alone).
 *
 * - any path under `/down` (`/classes/Down`, `/functions/down`, `/files/down.png/sign`): the backend cannot be reached —
 *   the XHR answers status 0 with no text, `fetch` rejects as a browser's does.
 * - `POST /functions/empty` — 500 with no body.
 *
 * Anything else answers 404 `{ error: 'No such route: …' }`. An operator the query does not evaluate matches every row.
 */

function idOf(value) {
  return value !== null && typeof value === 'object' && value.__type === 'Pointer' ? value.objectId : value;
}

function same(a, b) {
  return JSON.stringify(idOf(a)) === JSON.stringify(idOf(b));
}

function matches(row, where) {
  if (where === undefined || where === null) return true;
  return Object.entries(where).every(([key, constraint]) => {
    if (key === '$and') return constraint.every((w) => matches(row, w));
    if (key === '$or') return constraint.some((w) => matches(row, w));
    const value = row[key];
    if (constraint === null || typeof constraint !== 'object' || Array.isArray(constraint)) return same(value, constraint);
    return Object.entries(constraint).every(([op, operand]) => {
      if (op === '$eq') return operand === null ? value === undefined || value === null : same(value, operand);
      if (op === '$ne') return operand === null ? value !== undefined && value !== null : !same(value, operand);
      if (op === '$in') return operand.some((o) => same(value, o));
      if (op === '$nin') return !operand.some((o) => same(value, o));
      // An operator this backend does not evaluate matches every row: the request's body is what is graded.
      return true;
    });
  });
}

function createFakeBackend(spec) {
  const classes = JSON.parse(JSON.stringify(spec.classes || {}));
  const sessions = spec.sessions || {};
  const log = [];
  let made = 0;

  /** One request: `{ status, text }`. */
  function answer(method, path, token, body) {
    const json = (status, value) => ({ status, text: JSON.stringify(value) });
    const user = token !== undefined ? sessions[token] : undefined;
    let m = /^\/classes\/([^/]+)$/.exec(path);
    if (m && method === 'POST' && body && body._method === 'GET') {
      if (m[1] === 'Locked') return json(403, { code: 119, error: 'Permission denied for Locked.' });
      let rows = (classes[m[1]] || []).filter((row) => matches(row, body.where));
      const count = rows.length;
      if (typeof body.limit === 'number') rows = rows.slice(0, body.limit);
      return json(200, body.count ? { results: rows, count } : { results: rows });
    }
    m = /^\/functions\/([^/]+)$/.exec(path);
    if (m && method === 'POST') {
      if (m[1] === 'whoAmI') return json(200, { result: { me: user ?? null } });
      if (m[1] === 'addTask') {
        made += 1;
        const id = `n${made}`;
        (classes.Task = classes.Task || []).push({ objectId: id, title: String((body && body.title) || ''), done: false });
        return json(200, { result: { id } });
      }
      if (m[1] === 'locked') return json(400, { code: 141, error: 'Not for you.' });
      if (m[1] === 'empty') return { status: 500, text: '' };
    }
    if (path === '/users/me' && method === 'GET') return user ? json(200, { ...user, sessionToken: token }) : json(209, { code: 209, error: 'Invalid session token' });
    m = /^\/files\/([^/]+)\/sign$/.exec(path);
    if (m && method === 'GET') {
      if (m[1] === 'secret.png') return json(403, { error: 'This file is private.' });
      return json(200, { url: `http://files.test/${m[1]}?exp=1&sig=abc`, expiresAt: '2026-10-22T00:00:00.000Z', ttlSeconds: 3600 });
    }
    return json(404, { error: `No such route: ${method} ${path}` });
  }

  /** Handle one request as the wire carries it; logs it, answers one task later. */
  function request(method, url, headers, bodyText, respond) {
    const path = url.replace(/^https?:\/\/[^/]+/, '');
    let body;
    try {
      body = bodyText === undefined || bodyText === null || bodyText === '' ? undefined : JSON.parse(bodyText);
    } catch (e) {
      body = bodyText;
    }
    const token = headers['x-parse-session-token'];
    log.push({ method, path, body: body === undefined ? null : body, appId: headers['x-parse-application-id'] ?? null, signedIn: token !== undefined });
    const reply = /\/(classes\/Down|functions\/down|files\/down)/.test(path) ? { status: 0, text: '' } : answer(method, path, token, body);
    setTimeout(() => respond(reply), 0);
  }

  /** An `XMLHttpRequest` over this backend (the runtime's wire uses `onreadystatechange`, `status`, `response`). */
  class FakeXMLHttpRequest {
    constructor() {
      this.readyState = 0;
      this.status = 0;
      this.response = '';
      this.responseText = '';
      this._headers = {};
      this.upload = {};
    }
    open(method, url) {
      this._method = method;
      this._url = url;
      this.readyState = 1;
    }
    setRequestHeader(name, value) {
      this._headers[name.toLowerCase()] = value;
    }
    send(body) {
      request(this._method, this._url, this._headers, body, (reply) => {
        this.status = reply.status;
        this.response = reply.text;
        this.responseText = reply.text;
        this.readyState = 4;
        if (this.onreadystatechange) this.onreadystatechange();
        if (this.onload) this.onload();
      });
    }
  }

  /** A `fetch` over this backend (the export's `noodlRequest` reads `status` and `text()`). */
  function fetch(url, init = {}) {
    const headers = {};
    for (const [name, value] of Object.entries(init.headers || {})) headers[name.toLowerCase()] = value;
    return new Promise((resolve, reject) => {
      request(init.method || 'GET', String(url), headers, init.body, (reply) =>
        reply.status === 0
          ? reject(new TypeError('Failed to fetch'))
          : resolve({ status: reply.status, ok: reply.status >= 200 && reply.status < 300, text: async () => reply.text })
      );
    });
  }

  return { log, FakeXMLHttpRequest, fetch };
}

module.exports = { createFakeBackend };
