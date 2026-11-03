/**
 * P132 BWF-006 — the *Call an API* step's settings and their write-time check. Pure: no network, no engine, so
 * `kinds.ts` can consult it from the registry's load path.
 *
 * ⚠️ A KEY IS NEVER IN THE FILE (ruling R3)
 * ----------------------------------------
 * The step names a Secret (`authSecret`) and the executor reads its value when the step runs. So that the file cannot
 * hold one by accident either, a header, query or body literal that looks like a key is refused here with the
 * sentence that says where it goes. Two detectors, both deliberately narrow:
 *
 *  1. the SHAPE of a known key (`sk-…`, `AKIA…`, `ghp_…`, a JWT…). These are the deploy packager's own patterns
 *     (`scripts/package-deploy.js` `SECRET_PATTERNS`), and `tests/p132-bwf-006-http-request.test.ts` holds the two
 *     lists to the same samples so they cannot drift apart;
 *  2. a header or query parameter whose NAME says credential (`Authorization`, `X-API-Key`, `api_key`, `token`…)
 *     with a typed value. A value picked from the run (`{"$path"}`) or computed (`{"$fn"}`) is data, not a key in the
 *     file, and passes.
 *
 * @module nodegx-backend/workflow/steps/httpParams
 */

import { FUNCTION_SECRET_NAME_PATTERN } from '../../config/SecretsStore';
import { isPlainObject } from './values';

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'] as const;
export const HTTP_AUTH_TYPES = ['none', 'bearer', 'header', 'query', 'basic'] as const;
export const HTTP_BODY_TYPES = ['json', 'form', 'text'] as const;
export type HttpAuthType = (typeof HTTP_AUTH_TYPES)[number];

/** The longest a step waits for an answer, and how long it waits when it names no time. */
export const HTTP_MAX_TIMEOUT_MS = 300000;
export const HTTP_DEFAULT_TIMEOUT_MS = 30000;

/** The packager's key shapes (`scripts/package-deploy.js`), less the two that are about its own files. */
export const KEY_SHAPES: ReadonlyArray<{ name: string; re: RegExp }> = [
  { name: 'PEM private key', re: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/ },
  { name: 'AWS access key id', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'OpenAI-style API key', re: /\bsk-[A-Za-z0-9]{32,}\b/ },
  { name: 'Anthropic API key', re: /\bsk-ant-[A-Za-z0-9_-]{24,}\b/ },
  { name: 'GitHub token', re: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/ },
  { name: 'Slack token', re: /\bxox[abposr]-[A-Za-z0-9-]{10,}\b/ },
  { name: 'Google API key', re: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { name: 'JSON web token', re: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\./ },
  { name: 'connection string with password', re: /\b[a-z][a-z0-9+.-]*:\/\/[^\s:@/"']+:[^\s:@/"']{6,}@/ }
];

/** A header or query name that carries a credential, whatever its value looks like. */
const CREDENTIAL_NAME = /^(authorization|proxy-authorization|x-api-key|api-?key|apikey|x-auth-token|x-access-token|access_token|api_key|token|secret|client_secret|password|key|appid|app_id)$/i;

/** The name of the key shape `text` contains, or undefined. */
export function keyShapeIn(text: string): string | undefined {
  for (const { name, re } of KEY_SHAPES) if (re.test(text)) return name;
  return undefined;
}

function isValue(v: unknown): boolean {
  return isPlainObject(v) && (typeof v.$path === 'string' || '$literal' in v || '$fn' in v);
}

const MOVE_IT =
  'A key belongs in Secrets, not in the workflow file: add it there, then choose it under "Authentication" ' +
  '("authType" and "authSecret"), and the step sends it when it runs.';

/** Every literal string under `v` (a `{"$path"}` / `{"$fn"}` is a value, and skipped). */
function literalStrings(v: unknown, out: string[] = []): string[] {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => literalStrings(x, out));
  else if (isPlainObject(v) && !isValue(v)) for (const x of Object.values(v)) literalStrings(x, out);
  return out;
}

function checkPairs(v: unknown, at: string, what: 'header' | 'query parameter', errors: string[]): void {
  if (v === undefined) return;
  if (!isPlainObject(v) || isValue(v)) {
    errors.push(`${at} must be { "<name>": <value> }`);
    return;
  }
  for (const [name, value] of Object.entries(v)) {
    if (CREDENTIAL_NAME.test(name) && typeof value === 'string' && value !== '') {
      errors.push(`${at}.${name}: the ${what} "${name}" carries a key, typed into the step. ${MOVE_IT}`);
    }
  }
}

/** Write-time check of an `http-request` step's params. */
export function validateHttpRequestParams(p: Record<string, unknown>, at: string): string[] {
  const errors: string[] = [];
  if (p.url === undefined || p.url === '') errors.push(`${at}: http-request needs a "url" — the address it calls`);
  else if (typeof p.url === 'string') {
    let u: URL | undefined;
    try {
      u = new URL(p.url);
    } catch {
      errors.push(`${at}.params.url "${p.url.slice(0, 80)}" is not a whole address (it needs https:// at the start)`);
    }
    if (u && u.protocol !== 'http:' && u.protocol !== 'https:') {
      errors.push(`${at}.params.url must start with https:// or http://, not ${u.protocol}`);
    }
    if (u && (u.username || u.password)) errors.push(`${at}.params.url carries a name and password. ${MOVE_IT}`);
  } else if (!isValue(p.url)) errors.push(`${at}.params.url must be an address, a value picked from the run, or a formula`);

  const method = p.method === undefined ? 'GET' : p.method;
  if (!(HTTP_METHODS as readonly unknown[]).includes(method)) errors.push(`${at}.params.method must be one of ${HTTP_METHODS.join(', ')}`);
  if ((method === 'GET' || method === 'HEAD') && p.body !== undefined) {
    errors.push(`${at}: a ${method} request sends no body — choose POST, PUT or PATCH, or remove "body"`);
  }
  if (p.bodyType !== undefined && !(HTTP_BODY_TYPES as readonly unknown[]).includes(p.bodyType)) {
    errors.push(`${at}.params.bodyType must be one of ${HTTP_BODY_TYPES.join(', ')}`);
  }

  checkPairs(p.headers, `${at}.params.headers`, 'header', errors);
  checkPairs(p.query, `${at}.params.query`, 'query parameter', errors);

  for (const [name, v] of [['url', p.url], ['headers', p.headers], ['query', p.query], ['body', p.body]] as const) {
    for (const s of literalStrings(v)) {
      const shape = keyShapeIn(s);
      if (shape) {
        errors.push(`${at}.params.${name} holds what looks like a key (${shape}). ${MOVE_IT}`);
        break;
      }
    }
  }

  const auth = p.authType === undefined ? 'none' : p.authType;
  if (!(HTTP_AUTH_TYPES as readonly unknown[]).includes(auth)) {
    errors.push(`${at}.params.authType must be one of ${HTTP_AUTH_TYPES.join(', ')}`);
  } else if (auth !== 'none') {
    if (typeof p.authSecret !== 'string' || !p.authSecret) {
      errors.push(`${at}: authentication "${String(auth)}" needs "authSecret" — the NAME of the Secret that holds the key`);
    } else if (!FUNCTION_SECRET_NAME_PATTERN.test(p.authSecret)) {
      errors.push(`${at}.params.authSecret "${p.authSecret.slice(0, 40)}" is not a Secret's name (letters, digits, "_", "." and "-")`);
    }
    if ((auth === 'header' || auth === 'query') && (typeof p.authName !== 'string' || !p.authName)) {
      errors.push(`${at}: authentication "${auth}" needs "authName" — the ${auth === 'header' ? 'header' : 'query parameter'} the key goes in, such as ${auth === 'header' ? '"X-API-Key"' : '"api_key"'}`);
    }
    if (auth === 'basic' && p.authUser !== undefined && typeof p.authUser !== 'string' && !isValue(p.authUser)) {
      errors.push(`${at}.params.authUser must be a user name`);
    }
  }

  if (p.timeoutMs !== undefined && !isValue(p.timeoutMs)) {
    if (typeof p.timeoutMs !== 'number' || !Number.isFinite(p.timeoutMs) || p.timeoutMs <= 0 || p.timeoutMs > HTTP_MAX_TIMEOUT_MS) {
      errors.push(`${at}.params.timeoutMs must be a number of milliseconds from 1 to ${HTTP_MAX_TIMEOUT_MS}`);
    }
  }
  if (p.anyStatus !== undefined && typeof p.anyStatus !== 'boolean') errors.push(`${at}.params.anyStatus must be true or false`);
  return errors;
}
