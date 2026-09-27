/**
 * BRG-002 §3.3 — the API-key store, after it moved off raw SQL onto the facade.
 *
 * This spec exists because moving a write from hand-written SQL onto the facade
 * changes WHO serializes the value. `_ApiKey.scopes` is declared `Array`
 * (`service.ts:888`), so the adapter encodes it; the raw SQL wrote
 * `JSON.stringify(scopes)` into the column by hand. Passing that same string
 * through the facade would store a JSON string inside a JSON array, and a scope
 * list that reads back as `['[', '"', 'r'...]` — or as `[]` — is an
 * authorization bug that no type catches and no existing test covered.
 *
 * It also measures the authorization path's latency (AC5), because these run on
 * every API-key-authenticated request.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type * as http from 'http';

import { createAdapter } from '../src/persistence/createAdapter';
import { AdapterFacade } from '../src/persistence/AdapterFacade';
import { SecurityState } from '../src/security/state';

const dirs: string[] = [];
afterAll(() => dirs.forEach((d) => fs.rmSync(d, { recursive: true, force: true })));

async function securityFor() {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'brg002-key-'));
  dirs.push(dataDir);
  const handle = await createAdapter({ dataDir });
  const facade = new AdapterFacade(handle.adapter);
  // The two tables `service.ts` creates at start, with the same declarations.
  facade.schemaManager.createTable({
    name: '_ApiKey',
    columns: [
      { name: 'name', type: 'String' },
      { name: 'keyHash', type: 'String' },
      { name: 'scopes', type: 'Array' },
      { name: 'revoked', type: 'Boolean' },
      { name: 'lastUsedAt', type: 'Date' }
    ]
  });
  facade.schemaManager.createTable({
    name: '_Role',
    columns: [
      { name: 'name', type: 'String' },
      { name: 'users', type: 'Relation', targetClass: '_User' }
    ]
  });
  const security = new SecurityState({
    dataDir,
    loopback: true,
    cliToken: null,
    deployedFunctions: [],
    facade
  });
  return { security, facade, disconnect: () => handle.adapter.disconnect() };
}

describe('BRG-002 §3.3 — API keys through the facade', () => {
  jest.setTimeout(120_000);

  it('scopes survive the round trip as an array, not a re-encoded string', async () => {
    const { security, disconnect } = await securityFor();

    const { objectId, secret } = await security.createApiKey('ci', ['records:read', 'records:write']);
    expect(secret.startsWith('ngxk_')).toBe(true);

    const listed = await security.listApiKeys();
    expect(listed).toHaveLength(1);
    expect(listed[0].objectId).toBe(objectId);
    // The assertion the double-encoding bug would fail.
    expect(listed[0].scopes).toEqual(['records:read', 'records:write']);
    expect(listed[0].revoked).toBe(false);

    // And the authorization path reads the same scopes back.
    const principal = await security.resolvePrincipal({
      headers: { 'x-nodegx-api-key': secret }
    } as unknown as http.IncomingMessage);
    expect(principal).toEqual({ kind: 'apiKey', name: 'ci', scopes: ['records:read', 'records:write'] });

    await disconnect();
  });

  it('a revoked key stops authorizing', async () => {
    const { security, disconnect } = await securityFor();
    const { objectId, secret } = await security.createApiKey('temp', ['records:read']);

    expect(await security.revokeApiKey(objectId)).toBe(true);
    await expect(
      security.resolvePrincipal({ headers: { 'x-nodegx-api-key': secret } } as unknown as http.IncomingMessage)
    ).rejects.toThrow();

    const listed = await security.listApiKeys();
    expect(listed[0].revoked).toBe(true);
    await disconnect();
  });

  it('measures the authorization path (BRG-002 AC5)', async () => {
    const { security, disconnect } = await securityFor();
    const { secret } = await security.createApiKey('bench', ['records:read']);
    const req = { headers: { 'x-nodegx-api-key': secret } } as unknown as http.IncomingMessage;

    const N = 2000;
    await security.resolvePrincipal(req); // warm

    // THROUGHPUT: back-to-back, so the deferred `lastUsedAt` writes run between
    // calls and are counted. This is the process's total cost.
    const t0 = Date.now();
    for (let i = 0; i < N; i++) await security.resolvePrincipal(req);
    const throughputMs = Date.now() - t0;

    // LATENCY: what one request actually waits for. The event loop is drained
    // first so the previous call's advisory write has already run and is not
    // billed to this one — the two numbers are different questions, and
    // fire-and-forget moves only this one.
    const L = 200;
    let latencySum = 0;
    for (let i = 0; i < L; i++) {
      await new Promise((r) => setImmediate(r));
      const t = process.hrtime.bigint();
      await security.resolvePrincipal(req);
      latencySum += Number(process.hrtime.bigint() - t) / 1e6;
    }

    /* eslint-disable no-console */
    console.log(
      `BRG-002 AC5 — API-key auth THROUGHPUT: ${N} calls in ${throughputMs} ms ` +
        `(${(throughputMs / N).toFixed(3)} ms each)`
    );
    console.log(`BRG-002 AC5 — API-key auth LATENCY: ${(latencySum / L).toFixed(3)} ms per request (n=${L})`);
    /* eslint-enable no-console */
    await disconnect();
  });
});
