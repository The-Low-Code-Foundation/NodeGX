/**
 * The esbuild options every `noodl-mcp` bundle shares. Its own module so `build.mjs` and
 * `build-cloud-bundle.mjs` (which a spec runs to build the cloud bundler into a temp path,
 * P109 ISL-042) read one copy. Paths resolve from this file, not the working directory.
 */
import { existsSync, readdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
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
const EDITOR_VERSION = JSON.parse(readFileSync(path.join(here, '..', 'noodl-editor', 'package.json'), 'utf8')).version;

/**
 * NPMAUDIT-SERVERINFO — but the bundle npm publishes is `@nodegx/mcp`, whose version is real now (0.2.x) and is
 * what `--version` prints and `npx @nodegx/mcp@<v>` names; reporting the editor's (`0.4.3`) there sent anyone
 * comparing the two to the wrong release. So a build npm runs for `npm pack` / `npm publish` (its `prepack`)
 * reports this package's own version, and every other build (the editor's sidecar, a checkout) the editor's.
 */
export function reportedVersion(env = process.env) {
  if (env.npm_lifecycle_event === 'prepack') {
    return JSON.parse(readFileSync(path.join(here, 'package.json'), 'utf8')).version;
  }
  return EDITOR_VERSION;
}
const APP_VERSION = reportedVersion();

/**
 * NPMAUDIT-LOCALPATH — a release is built in a worktree, whose `node_modules` entries are links to
 * the primary checkout's (`scripts/devtools/make-worktree.sh`). esbuild names a module by its real
 * path, so every module comment and `__commonJS` key in the bundle read
 * `../../../../OpenNoodl/node_modules/…`: a folder outside the repo, shipped to everyone. These name
 * the same files through the links, as a checkout would. The real folder is found through esbuild's
 * own entry, which every build here has. `check-pack-paths.mjs` (prepack) refuses any that get through.
 */
const NODE_MODULES = path.resolve(here, '..', '..', 'node_modules');
const NODE_MODULES_REAL = existsSync(path.join(NODE_MODULES, 'esbuild'))
  ? path.dirname(realpathSync(path.join(NODE_MODULES, 'esbuild')))
  : NODE_MODULES;

/** One path esbuild read, relative to `fromDir`, renamed through the `node_modules` link. */
export function throughNodeModulesLink(rel, fromDir = here) {
  if (NODE_MODULES_REAL === NODE_MODULES) return rel;
  const abs = path.resolve(fromDir, rel);
  if (!abs.startsWith(NODE_MODULES_REAL + path.sep)) return rel;
  return path.relative(fromDir, path.join(NODE_MODULES, abs.slice(NODE_MODULES_REAL.length + 1)));
}

/** The same rename over a written bundle (esbuild prints paths relative to `absWorkingDir`). */
export const nodeModulesThroughLink = {
  name: 'node-modules-through-link',
  setup(build) {
    build.onEnd((result) => {
      const { outfile, outdir, write = true, absWorkingDir = process.cwd() } = build.initialOptions;
      if (result.errors.length || !write || NODE_MODULES_REAL === NODE_MODULES) return;
      // One file, or every script an `outdir` build wrote (the render harness's three entries)
      const outputs = outfile
        ? [outfile]
        : outdir
          ? readdirSync(outdir).filter((f) => /\.[cm]?js$/.test(f)).map((f) => path.join(outdir, f))
          : [];
      const real = path.relative(absWorkingDir, NODE_MODULES_REAL) + '/';
      const link = path.relative(absWorkingDir, NODE_MODULES) + '/';
      for (const file of outputs) {
        const text = readFileSync(file, 'utf8');
        if (text.includes(real)) writeFileSync(file, text.split(real).join(link));
      }
    });
  }
};

export const common = {
  define: { __NODEGX_APP_VERSION__: JSON.stringify(APP_VERSION) },
  bundle: true,
  platform: 'node',
  format: 'cjs',
  sourcemap: false,
  logLevel: 'info',
  plugins: [nodeModulesThroughLink],
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
