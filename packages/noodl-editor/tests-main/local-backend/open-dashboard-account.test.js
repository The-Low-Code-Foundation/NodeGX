/**
 * P104 BMG-012 §7 / BMG-014 — how the editor opens the backend manager.
 *
 * Richard, 2026-09-26: once the backend has an admin ACCOUNT, the editor opens
 * the manager WITHOUT the machine credential, so a person signs in (once per
 * browser) and the manager — and its Activity trail — knows who they are.
 * Before an account exists the credential still goes, because that first open
 * is where the page asks for the account. If the backend cannot say, the
 * credential goes too: the button must always open something that works.
 */

const mockOpenExternal = jest.fn(() => Promise.resolve());

jest.mock('electron', () => ({
  ipcMain: { handle: jest.fn(), on: jest.fn() },
  BrowserWindow: { getAllWindows: () => [] },
  shell: { openExternal: (...args) => mockOpenExternal(...args) }
}));

const { BackendManager } = require('../../src/main/src/local-backend/BackendManager');

function managerWith(whoami) {
  const supervisor = {
    endpoint: 'http://127.0.0.1:8697',
    adminToken: () => 'k3y/+=',
    request: jest.fn(async (method, p) => {
      if (method === 'GET' && p === '/_admin/whoami') {
        if (whoami instanceof Error) throw whoami;
        return whoami;
      }
      throw new Error('unexpected ' + method + ' ' + p);
    })
  };
  const manager = Object.create(BackendManager.prototype);
  manager.requireRunning = () => supervisor;
  return manager;
}

beforeEach(() => mockOpenExternal.mockClear());

describe('openDashboard — the credential goes only until there is a person to sign in', () => {
  it('no account yet: the credential goes, so the page can ask for the account', async () => {
    await managerWith({ ok: true, adminAccount: false }).openDashboard('b1');
    expect(mockOpenExternal).toHaveBeenCalledWith('http://127.0.0.1:8697/_admin#token=' + encodeURIComponent('k3y/+='));
  });

  it('an account exists: no credential in the link — the route alone, or nothing', async () => {
    await managerWith({ ok: true, adminAccount: true }).openDashboard('b1', '/schema/Pet/new-field');
    expect(mockOpenExternal).toHaveBeenCalledWith('http://127.0.0.1:8697/_admin#route=' + encodeURIComponent('/schema/Pet/new-field'));
    await managerWith({ ok: true, adminAccount: true }).openDashboard('b1');
    expect(mockOpenExternal).toHaveBeenLastCalledWith('http://127.0.0.1:8697/_admin');
    for (const [url] of mockOpenExternal.mock.calls) expect(url).not.toContain('k3y');
  });

  it('the backend cannot say: the credential goes, as before', async () => {
    await managerWith(new Error('GET /_admin/whoami failed with HTTP 500')).openDashboard('b1', '/triggers/new');
    expect(mockOpenExternal).toHaveBeenCalledWith('http://127.0.0.1:8697/_admin#token=' + encodeURIComponent('k3y/+=') + '&route=' + encodeURIComponent('/triggers/new'));
  });
});
