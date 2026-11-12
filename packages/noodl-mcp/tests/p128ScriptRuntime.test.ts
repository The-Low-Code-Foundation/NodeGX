/**
 * P128-S3-HELPERNODE — the program the server's child scripts run on.
 *
 * In Claude Desktop the server runs on Desktop's built-in Node, whose `execPath` is Claude's helper binary, and that
 * binary refuses to run a script (exit 64, "This is a helper executable and cannot be launched directly"). The fake
 * helper below does exactly that, so the spec can stand where Desktop stands without Desktop.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';

import { HELPER_NODE_MESSAGE, registrationRuntime, resetScriptRuntimeProbes, scriptRuntime } from '../src/scriptRuntime';

describe('P128-S3-HELPERNODE — scriptRuntime', () => {
  let dir: string;
  let helper: string;

  beforeEach(() => {
    resetScriptRuntimeProbes();
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p128-runtime-'));
    helper = path.join(dir, 'Claude Helper (Plugin)');
    fs.writeFileSync(
      helper,
      '#!/bin/sh\necho "This is a helper executable and cannot be launched directly; it requires a --type argument from the browser process." >&2\nexit 64\n'
    );
    fs.chmodSync(helper, 0o755);
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('the fake helper refuses a script, as Claude Desktop\'s does (the control)', () => {
    const r = spawnSync(helper, ['-e', 'process.exit(0)'], { env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' } });
    expect(r.status).toBe(64);
  });

  it('plain Node: its own execPath, unprobed', () => {
    expect(scriptRuntime({ env: {}, execPath: helper, electron: undefined })).toBe(helper);
  });

  it('an Electron host whose binary refuses scripts, with nothing bundled: says so instead of starting a child that dies', () => {
    expect(() => scriptRuntime({ env: {}, execPath: helper, electron: '39.0.0' })).toThrow(HELPER_NODE_MESSAGE);
  });

  it('the same host with the .mcpb\'s Node in NODEGX_NODE: the bundled Node', () => {
    expect(scriptRuntime({ env: { NODEGX_NODE: process.execPath }, execPath: helper, electron: '39.0.0' })).toBe(process.execPath);
  });

  it('a bundled Node that lost its executable bit in the unzip is given it back', () => {
    const bundled = path.join(dir, 'node');
    fs.copyFileSync(helper, bundled);
    fs.chmodSync(bundled, 0o644);
    expect(scriptRuntime({ env: { NODEGX_NODE: bundled }, execPath: helper, electron: '39.0.0' })).toBe(bundled);
    expect(fs.statSync(bundled).mode & 0o111).not.toBe(0);
  });

  it('NODEGX_NODE naming nothing falls back to execPath, probed', () => {
    const missing = path.join(dir, 'gone', 'node');
    expect(() => scriptRuntime({ env: { NODEGX_NODE: missing }, execPath: helper, electron: '39.0.0' })).toThrow(HELPER_NODE_MESSAGE);
    expect(scriptRuntime({ env: { NODEGX_NODE: missing }, execPath: process.execPath, electron: '39.0.0' })).toBe(process.execPath);
  });

  it('an Electron binary that runs scripts (the editor\'s, RunAsNode on) keeps its execPath', () => {
    expect(scriptRuntime({ env: {}, execPath: process.execPath, electron: '39.0.0' })).toBe(process.execPath);
  });

  it('registrationRuntime: the bundled Node when there is one, never the helper; never throws', () => {
    expect(registrationRuntime({ env: { NODEGX_NODE: process.execPath }, execPath: helper, electron: '39.0.0' })).toEqual({
      command: process.execPath,
      electron: false
    });
    expect(registrationRuntime({ env: {}, execPath: helper, electron: '39.0.0' })).toEqual({ command: helper, electron: true });
  });
});
