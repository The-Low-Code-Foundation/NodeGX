/**
 * HLT-021 — the renderer reads the port that was BOUND, at the moment it needs it, from one place.
 *
 * Three claims, graded separately:
 *  - AC4: no renderer file reads `process.env.NOODLPORT` except the helper, counted against the
 *    helper's own `NOODLPORT_READERS` — beside a control proving the scan finds a read at all.
 *  - the helper asks at CALL time: a module-scope `const` would read before `listening` fires,
 *    which is the same defect one layer along and would pass any spec that calls it late.
 *  - `'0'` is not rescued by a default that never fires, and not "rescued" into another editor's
 *    8574 either.
 * Main's half (the global is set to the socket's port) is `tests-main/hlt021-bound-port.test.js`.
 */
import * as fs from 'fs';
import * as path from 'path';

let mockBound: unknown;
jest.mock('@electron/remote', () => ({ getGlobal: (name: string) => (name === 'noodlBoundPort' ? mockBound : undefined) }), {
  virtual: true
});

import {
  BOUND_PORT_GLOBAL,
  NOODLPORT_READERS,
  resolveViewerPort,
  viewerOrigin,
  viewerPort
} from '../../src/editor/src/views/SandboxSurface/viewerOrigin';

const EDITOR_SRC = path.join(__dirname, '../../src/editor/src');
const READ = /process\.env\.NOODLPORT\b/;

/** Lines that read the variable in code — a comment naming it is not a read. */
function codeReads(source: string): number {
  return source.split('\n').filter((line) => {
    const t = line.trim();
    return !t.startsWith('*') && !t.startsWith('/*') && !t.startsWith('//') && READ.test(line);
  }).length;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|js|jsx)$/.test(entry.name) && !entry.name.includes('.bundle.')) out.push(full);
  }
  return out;
}

const saved = process.env.NOODLPORT;
afterEach(() => {
  mockBound = undefined;
  if (saved === undefined) delete process.env.NOODLPORT;
  else process.env.NOODLPORT = saved;
});

describe('HLT-021 — one reader (AC4)', () => {
  it('the scan finds a read when there is one (control)', () => {
    expect(codeReads('const port = process.env.NOODLPORT || 8574;')).toBe(1);
    expect(codeReads(' * It used to be `process.env.NOODLPORT || 8574`')).toBe(0);
    const helper = fs.readFileSync(path.join(EDITOR_SRC, NOODLPORT_READERS[0]), 'utf8');
    expect(codeReads(helper)).toBeGreaterThan(0);
  });

  it('only the files the helper names read process.env.NOODLPORT', () => {
    const readers = walk(EDITOR_SRC)
      .filter((file) => codeReads(fs.readFileSync(file, 'utf8')) > 0)
      .map((file) => path.relative(EDITOR_SRC, file).split(path.sep).join('/'))
      .sort();
    expect(readers).toEqual([...NOODLPORT_READERS].sort());
  });
});

describe('HLT-021 — which port', () => {
  it('bound wins over the request, including a request of 0', () => {
    expect(resolveViewerPort(51234, '0')).toBe(51234);
    expect(resolveViewerPort(51234, '9000')).toBe(51234);
  });

  it('without a bound port, the request is used as asked; unset is the default', () => {
    expect(resolveViewerPort(undefined, '9000')).toBe(9000);
    expect(resolveViewerPort(null, undefined)).toBe(8574);
    expect(resolveViewerPort(undefined, '')).toBe(8574);
    // Before the bind, `0` stays 0 — loud — rather than guessing 8574, which may be another editor.
    expect(resolveViewerPort(undefined, '0')).toBe(0);
  });

  it('a bound port that is not a real port is ignored', () => {
    expect(resolveViewerPort(0, '9000')).toBe(9000);
    expect(resolveViewerPort('51234', '9000')).toBe(9000);
  });
});

describe('HLT-021 — asked at call time', () => {
  it('reads the global by the name main sets', () => {
    expect(BOUND_PORT_GLOBAL).toBe('noodlBoundPort');
  });

  it('a call after the bind sees the bind, from the same loaded module', () => {
    process.env.NOODLPORT = '0';
    expect(viewerPort()).toBe(0);
    mockBound = 60123;
    expect(viewerPort()).toBe(60123);
    expect(viewerOrigin()).toBe('http://localhost:60123');
  });
});
