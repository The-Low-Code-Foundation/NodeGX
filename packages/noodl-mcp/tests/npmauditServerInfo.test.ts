/**
 * NPMAUDIT-SERVERINFO — `@nodegx/mcp` from npm answered `initialize` with the editor's version (`0.4.3`) while
 * `--version` printed its own (`0.2.5`). The bundle inside the editor reports the editor's release on purpose
 * (`server.ts` PKG_VERSION); the one `npm pack` builds (its `prepack`) now reports this package's.
 *
 * Measured on bundles built from `build-common.mjs` into a scratch folder: `npm_lifecycle_event=prepack` →
 * `serverInfo.version` "0.2.6", a plain build → "0.4.3".
 */
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const HERE = path.join(__dirname, '..');
const own = JSON.parse(fs.readFileSync(path.join(HERE, 'package.json'), 'utf8')).version;
const editor = JSON.parse(fs.readFileSync(path.join(HERE, '..', 'noodl-editor', 'package.json'), 'utf8')).version;

function reported(env: Record<string, string>): string {
  const script = `import { reportedVersion } from './build-common.mjs'; process.stdout.write(reportedVersion(${JSON.stringify(env)}));`;
  return execFileSync(process.execPath, ['--input-type=module', '-e', script], { cwd: HERE, encoding: 'utf8' });
}

describe('NPMAUDIT-SERVERINFO — the handshake names the release the bundle ships in', () => {
  it('a build for npm pack reports @nodegx/mcp\'s own version, the one --version prints', () => {
    expect(reported({ npm_lifecycle_event: 'prepack' })).toBe(own);
  });

  it('any other build (the editor\'s sidecar, a checkout) reports the editor\'s', () => {
    expect(reported({})).toBe(editor);
    expect(reported({ npm_lifecycle_event: 'build' })).toBe(editor);
  });

  it('the two differ today, so the test can tell them apart', () => {
    expect(own).not.toBe(editor);
  });

  it('the bundle takes its define from it', () => {
    const common = fs.readFileSync(path.join(HERE, 'build-common.mjs'), 'utf8');
    expect(common).toContain('const APP_VERSION = reportedVersion();');
    expect(common).toContain('define: { __NODEGX_APP_VERSION__: JSON.stringify(APP_VERSION) }');
  });
});
