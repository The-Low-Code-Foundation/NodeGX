/**
 * P112-OWN023-COLDSERVER — `npx -y @nodegx/mcp` installs the server and nothing else.
 *
 * Measured 2026-10-19: on a person's first run the server took ~28 s to answer `initialize` from an empty npm cache,
 * and Claude Code stops waiting at 30 s, so the agent's first conversation had no NodeGX tools. Measured 2026-10-20 on
 * 0.2.2's own tarball: `dependencies` (`@modelcontextprotocol/sdk`, `zod`) pulled 91 more packages into the npx folder
 * (express, hono, jose, ajv, …) that the server never loads, because esbuild inlines both into `dist/noodl-mcp.cjs`.
 * Cold install 12.6 / 11.6 s with them, 3.8 / 5.5 s without; the server's boot about 1 s either way.
 *
 * So the package declares no runtime dependency, and this holds that claim to its reason: nothing a build here leaves
 * external except `ws` and its two optional helpers, which `build-render-harness.mjs` ships inside the harness.
 */
import fs from 'fs';
import path from 'path';

const root = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

describe('P112-OWN023-COLDSERVER — the published server installs no dependency it has already bundled', () => {
  it('declares no runtime dependency; the SDK and zod are build inputs', () => {
    expect(pkg.dependencies ?? {}).toEqual({});
    expect(Object.keys(pkg.devDependencies)).toEqual(expect.arrayContaining(['@modelcontextprotocol/sdk', 'zod']));
  });

  it('leaves nothing external in its builds but the harness\'s own copy of ws', () => {
    const builds = fs.readdirSync(root).filter((f) => /^build.*\.mjs$/.test(f));
    expect(builds).toEqual(expect.arrayContaining(['build.mjs', 'build-common.mjs', 'build-render-harness.mjs']));
    const externals = builds.flatMap((f) =>
      [...fs.readFileSync(path.join(root, f), 'utf8').matchAll(/^\s*external:\s*\[([^\]]*)\]/gm)].flatMap((m) =>
        m[1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean).map((name) => `${f}: ${name}`)
      )
    );
    expect(externals.sort()).toEqual(
      ['build-render-harness.mjs: bufferutil', 'build-render-harness.mjs: utf-8-validate', 'build-render-harness.mjs: ws'].sort()
    );
    for (const f of builds) expect(fs.readFileSync(path.join(root, f), 'utf8')).not.toMatch(/packages:\s*['"]external['"]/);
  });
});
