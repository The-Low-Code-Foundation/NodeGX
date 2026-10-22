/**
 * DEP-001 — `nodegx-config.json` re-points a deployed app's backend (`src/deploy-config.ts`).
 *
 * The spec's cases, one row each: a missing file, an empty body, an HTML body (a host answering
 * index.html for every path), a valid config, a config with an unknown key, and a config holding
 * only `appId`. The rule they share: anything but a usable override leaves the baked address in
 * place, and only a 404 does so silently.
 */
import { applyDeployConfig, loadDeployConfig, parseDeployConfig } from '../src/deploy-config';

function respond(status: number, body = '') {
  return () => Promise.resolve({ ok: status >= 200 && status < 300, status, text: () => Promise.resolve(body) });
}

function baked() {
  return {
    metadata: {
      cloudservices: { endpoint: 'http://localhost:8577', appId: 'baked-app', type: 'nodegx' },
      styles: { colors: {} }
    }
  };
}

describe('DEP-001 loadDeployConfig', () => {
  it('a missing file (404) is no override, and says nothing', async () => {
    const warn = jest.fn();
    expect(await loadDeployConfig('nodegx-config.json', respond(404), warn)).toBeNull();
    expect(warn).not.toHaveBeenCalled();
  });

  it('asks past the cache, so a re-pointed deploy needs no cache bust', async () => {
    const fetchImpl = jest.fn(respond(404));
    await loadDeployConfig('/app/nodegx-config.json', fetchImpl, jest.fn());
    expect(fetchImpl).toHaveBeenCalledWith('/app/nodegx-config.json', { cache: 'no-store' });
  });

  it('an empty body is a warning and no override', async () => {
    const warn = jest.fn();
    expect(await loadDeployConfig('c.json', respond(200, ''), warn)).toBeNull();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('an HTML body — a host answering index.html for every path — is a warning and no override', async () => {
    const warn = jest.fn();
    expect(await loadDeployConfig('c.json', respond(200, '<!DOCTYPE html><html>'), warn)).toBeNull();
    expect(warn.mock.calls[0][0]).toContain('is not JSON');
  });

  it('a server error or a failed request is a warning and no override, never a rejection', async () => {
    const warn = jest.fn();
    expect(await loadDeployConfig('c.json', respond(500), warn)).toBeNull();
    expect(await loadDeployConfig('c.json', () => Promise.reject(new Error('offline')), warn)).toBeNull();
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it('a valid file is returned as written', async () => {
    const body = JSON.stringify({ cloudservices: { endpoint: 'https://data.example.com' } });
    expect(await loadDeployConfig('c.json', respond(200, body), jest.fn())).toEqual({
      cloudservices: { endpoint: 'https://data.example.com' }
    });
  });

  it('with no fetch at all (an old browser) the app boots on the baked address', async () => {
    expect(await loadDeployConfig('c.json', undefined, jest.fn())).toBeNull();
  });
});

describe('DEP-001 applyDeployConfig', () => {
  it('a new endpoint replaces the baked one and keeps the rest of cloudservices', () => {
    const data = baked();
    expect(applyDeployConfig(data, { cloudservices: { endpoint: 'http://localhost:9001' } }, jest.fn())).toEqual([
      'cloudservices'
    ]);
    expect(data.metadata.cloudservices).toEqual({ endpoint: 'http://localhost:9001', appId: 'baked-app', type: 'nodegx' });
  });

  it('a file holding only appId keeps the baked endpoint', () => {
    const data = baked();
    applyDeployConfig(data, { cloudservices: { appId: 'other-app' } }, jest.fn());
    expect(data.metadata.cloudservices.endpoint).toBe('http://localhost:8577');
    expect(data.metadata.cloudservices.appId).toBe('other-app');
  });

  it('a key outside the allow-list is ignored, with a warning — the file cannot rewrite the app', () => {
    const data = baked();
    const warn = jest.fn();
    expect(applyDeployConfig(data, { styles: { colors: { evil: '#f00' } }, settings: {} }, warn)).toEqual([]);
    expect(data.metadata.styles).toEqual({ colors: {} });
    expect(warn.mock.calls[0][0]).toContain('"styles", "settings"');
  });

  it('backendServices is the one other key it may set', () => {
    const data: { metadata: Record<string, unknown> } = baked();
    applyDeployConfig(data, { backendServices: { activeBackendId: 'b2' } }, jest.fn());
    expect(data.metadata.backendServices).toEqual({ activeBackendId: 'b2' });
  });

  it('a value of the wrong shape is ignored, not merged', () => {
    const data = baked();
    const warn = jest.fn();
    expect(applyDeployConfig(data, { cloudservices: 'http://x' }, warn)).toEqual([]);
    expect(applyDeployConfig(data, { cloudservices: { endpoint: 42 } }, warn)).toEqual([]);
    expect(data.metadata.cloudservices.endpoint).toBe('http://localhost:8577');
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it('no config, or a deploy with no metadata, changes nothing and does not throw', () => {
    const data = baked();
    expect(applyDeployConfig(data, null)).toEqual([]);
    expect(data).toEqual(baked());
    const bare: { metadata?: Record<string, unknown> } = {};
    applyDeployConfig(bare, { cloudservices: { endpoint: 'http://localhost:1' } }, jest.fn());
    expect(bare.metadata).toEqual({ cloudservices: { endpoint: 'http://localhost:1' } });
  });

  it('parseDeployConfig refuses a JSON array or string', () => {
    const warn = jest.fn();
    expect(parseDeployConfig('[1]', warn)).toBeNull();
    expect(parseDeployConfig('"x"', warn)).toBeNull();
    expect(warn).toHaveBeenCalledTimes(2);
  });
});
