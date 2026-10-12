/**
 * The esbuild options every `noodl-mcp` bundle shares. Its own module so `build.mjs` and
 * `build-cloud-bundle.mjs` (which a spec runs to build the cloud bundler into a temp path,
 * P109 ISL-042) read one copy. Paths resolve from this file, not the working directory.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

/**
 * The release this bundle is shipping inside, stamped into the server's MCP handshake.
 *
 * 🔴 `@nodegx/mcp`'s own version has been `0.1.0` since the package was created and has never been
 * bumped, so the handshake reported `0.1.0` from every release — which made "my MCP server is
 * stuck on an old version" unanswerable. The packaged directory carries no `package.json` either,
 * so there was no second place to look.
 *
 * Read from `noodl-editor` rather than from here because that is the number the user sees in the
 * app and quotes in a bug report, and because taking it from a file somebody already has to bump
 * every release is what stops the two drifting.
 */
const APP_VERSION = JSON.parse(readFileSync(path.join(here, '..', 'noodl-editor', 'package.json'), 'utf8')).version;

export const common = {
  define: { __NODEGX_APP_VERSION__: JSON.stringify(APP_VERSION) },
  bundle: true,
  platform: 'node',
  format: 'cjs',
  sourcemap: false,
  logLevel: 'info',
  /**
   * HLS-008 — the third of the three resolvers that have to agree, after
   * `tsconfig.json`'s `paths` and `jest.config.js`'s `moduleNameMapper`.
   *
   * 🔴 Without it esbuild follows `@nodegx/export`'s `main` into
   * `../nodegx-export/dist/index.cjs`, and the server would ship whatever the
   * exporter looked like the last time somebody ran `npm run build` in a
   * sibling package. The editor already carries this alias in its own three
   * resolvers for the same reason; this package is now the second consumer.
   */
  alias: {
    '@nodegx/export': path.join(here, '..', 'nodegx-export', 'src', 'index.ts'),
    // NSP-020 R19 — the specs by source, as the editor maps them (its tsconfig, jest and webpack): the package's `main` is a
    // `dist/` build that can be older than the specs, and `get_component`'s drawn ports must be today's
    '@nodegx/node-spec': path.join(here, '..', 'nodegx-node-spec', 'src', 'browser.ts')
  }
};
