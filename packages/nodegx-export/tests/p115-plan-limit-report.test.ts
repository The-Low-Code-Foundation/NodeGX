/**
 * P115 HST-004 §10 — a cloud function call that Cloudflare refuses over the plan's limit.
 *
 * Measured on the deploy (2026-11-04): a Worker over its CPU limit answers 503 `text/plain` "error code: 1102", which
 * is Cloudflare's text, not the function's JSON. The emitted client used to show "Failed running cloud function." and
 * nobody but the visitor knew. Now the visitor gets a sentence and the site's Worker gets a report it can email its
 * builder about; the report waits in localStorage until the Worker answers (over the daily limit, 1027, it is refused
 * too). The emitted client is run here as it ships, against a scripted wire.
 */
import * as path from 'path';
import * as ts from 'typescript';

import { Catalog, loadCatalog } from '../src/catalog';
import { emitApp } from '../src/emit/emitApp';
import { parseProject } from '../src/parse/parseProject';

const catalog: Catalog = loadCatalog();
/** A project with a backend (the EXP-009 fixture), so the export prints its real client, callFunction in it. */
const source = emitApp(parseProject(path.join(__dirname, 'fixtures', 'puppy-test-3'), catalog), catalog).files['src/api/client.ts'];

type Answer = { status: number; body: string };
type Call = { url: string; body: string | undefined };

/** A wire that answers `/functions/*` from a script and `/__nodegx/plan-limit` with `reportStatus`. */
function world(functionAnswers: Answer[], reportStatus = 204) {
  const calls: Call[] = [];
  const store = new Map<string, string>();
  const localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k)
  };
  const fetch = async (url: string, init: { body?: string } = {}) => {
    calls.push({ url, body: init.body });
    const answer = url.endsWith('/__nodegx/plan-limit') ? { status: reportStatus, body: '' } : functionAnswers.shift()!;
    return { status: answer.status, ok: answer.status >= 200 && answer.status < 300, text: async () => answer.body };
  };
  const plain = source.replace(/import\.meta\.env\.VITE_NODEGX_\w+/g, 'undefined');
  const js = ts.transpileModule(plain, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const module: { exports: Record<string, unknown> } = { exports: {} };
  // eslint-disable-next-line no-new-func
  new Function('require', 'module', 'exports', 'fetch', 'localStorage', js)(() => ({}), module, module.exports, fetch, localStorage);
  const callFunction = module.exports.callFunction as (name: string, params: Record<string, unknown>) => Promise<unknown>;
  const reports = () => calls.filter((c) => c.url.endsWith('/__nodegx/plan-limit')).map((c) => JSON.parse(c.body!));
  return { callFunction, calls, store, reports };
}

/** The key the client keeps a report under: its app id, read from the emitted source. */
const storedKey = `nodegx/${/const APP_ID(?::\s*string)? = [^?]+\?\? '([^']+)'/.exec(source)![1]}/planLimitReport`;

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const refused = (code: string): Answer => ({ status: 503, body: `error code: ${code}` });
/** The page Cloudflare sent Node's fetch for the same refusal (2026-11-04), cut down to its title and code. */
const refusedPage = (code: string): Answer => ({
  status: 503,
  body: `<!DOCTYPE html>\n<html lang="en-US"><head><title>Worker exceeded resource limits | x.workers.dev | Cloudflare</title></head><body><h1><span data-translate="error">Error</span><span class="cf-error-code">${code}</span></h1></body></html>`
});

describe('P115 HST-004 §10: a call Cloudflare refuses over the plan’s limit', () => {
  it('1102: the visitor gets a sentence, the Worker gets a report naming the function, and nothing is left stored', async () => {
    const w = world([refused('1102')]);
    await expect(w.callFunction('subscribe', { email: 'a@b.c' })).rejects.toThrow(
      "This site has gone over its hosting plan's limit. Please try again in a moment."
    );
    await tick();
    expect(w.reports()).toEqual([expect.objectContaining({ code: '1102', fn: 'subscribe' })]);
    expect(w.calls[1].url).toMatch(/\/__nodegx\/plan-limit$/);
    expect([...w.store.keys()]).toEqual([]);
  });

  it('1027: the sentence says today, and a report the Worker refuses too is kept', async () => {
    const w = world([refused('1027')], 503);
    await expect(w.callFunction('subscribe', {})).rejects.toThrow(
      "This site has reached its hosting plan's limit for today. Please try again tomorrow."
    );
    await tick();
    expect(w.reports()).toEqual([expect.objectContaining({ code: '1027', fn: 'subscribe' })]);
    expect(w.store.size).toBe(1);
  });

  it('a kept report is sent before the next call, and cleared once the Worker answers', async () => {
    let reportStatus = 503;
    const calls: string[] = [];
    const store = new Map<string, string>();
    const localStorage = {
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k)
    };
    const answers: Answer[] = [refused('1027'), { status: 200, body: '{"result":{"ok":true}}' }];
    const fetch = async (url: string) => {
      calls.push(new URL(url).pathname);
      const a = url.endsWith('/__nodegx/plan-limit') ? { status: reportStatus, body: '' } : answers.shift()!;
      return { status: a.status, ok: a.status >= 200 && a.status < 300, text: async () => a.body };
    };
    const plain = source.replace(/import\.meta\.env\.VITE_NODEGX_\w+/g, 'undefined');
    const js = ts.transpileModule(plain, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
    const module: { exports: Record<string, unknown> } = { exports: {} };
    // eslint-disable-next-line no-new-func
    new Function('require', 'module', 'exports', 'fetch', 'localStorage', js)(() => ({}), module, module.exports, fetch, localStorage);
    const callFunction = module.exports.callFunction as (name: string, params: Record<string, unknown>) => Promise<unknown>;

    await expect(callFunction('subscribe', {})).rejects.toThrow(/limit for today/);
    await tick();
    expect(store.size).toBe(1);

    reportStatus = 204; // the next day: the Worker answers
    await expect(callFunction('subscribe', {})).resolves.toEqual({ ok: true });
    await tick();
    expect(calls).toEqual(['/functions/subscribe', '/__nodegx/plan-limit', '/__nodegx/plan-limit', '/functions/subscribe']);
    expect(store.size).toBe(0);
  });

  it('1102 as Cloudflare’s HTML page: the same sentence and the same report', async () => {
    const w = world([refusedPage('1102')]);
    await expect(w.callFunction('subscribe', {})).rejects.toThrow("This site has gone over its hosting plan's limit.");
    await tick();
    expect(w.reports()).toEqual([expect.objectContaining({ code: '1102', fn: 'subscribe' })]);
  });

  it('the controls: a function’s own failure and a 503 that is not Cloudflare’s limit, and Cloudflare’s page for another code, report nothing', async () => {
    const w = world([
      { status: 400, body: '{"error":"Invalid request body: \\"email\\" is required"}' },
      { status: 503, body: 'Service Unavailable' },
      { status: 500, body: '{"error":"error code: 1102 is not this"}' },
      refusedPage('1101')
    ]);
    await expect(w.callFunction('subscribe', {})).rejects.toThrow('Invalid request body: "email" is required');
    await expect(w.callFunction('subscribe', {})).rejects.toThrow('Failed running cloud function.');
    await expect(w.callFunction('subscribe', {})).rejects.toThrow('error code: 1102 is not this');
    await expect(w.callFunction('subscribe', {})).rejects.toThrow('Failed running cloud function.');
    await tick();
    expect(w.reports()).toEqual([]);
    expect(w.store.size).toBe(0);
  });

  it('a report older than three days is dropped, not sent', async () => {
    const w = world([{ status: 200, body: '{"result":{}}' }]);
    const old = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();
    w.store.set(storedKey, JSON.stringify({ code: '1102', fn: 'subscribe', at: old }));
    await w.callFunction('subscribe', {});
    await tick();
    expect(w.reports()).toEqual([]);
    expect(w.store.size).toBe(0);
  });
});
