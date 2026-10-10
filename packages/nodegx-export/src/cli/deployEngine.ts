/**
 * HLS-015 — finding the deploy engine, and saying so when it is not there.
 *
 * ## 🔴 The published package cannot deploy, on purpose, and this file is where that is admitted
 *
 * `@nodegx/export` translates a project into React source you build yourself. A *deploy* is a
 * different artefact: a ready-to-host static site that carries the ~14.9 MB NodeGX interpreter and
 * runs the graph directly. Producing one needs `ProjectModel`, `NodeLibrary`, the viewer's node
 * register and that interpreter — none of which is in the tarball `npm publish` uploads
 * (`files: ["dist", "README.md"]`), and putting it there would make this package's build depend on
 * the editor's.
 *
 * So `nodegx deploy` is a **front door onto an engine that lives elsewhere**, exactly as
 * `nodegx render` is, and the honest outcome of running it from a bare `npm i -g @nodegx/export`
 * is a refusal that says where it looked. That refusal is the shipped behaviour, not an accident:
 * see {@link ./renderHarness} for the same shape and register row **C72** for what happens when a
 * path resolves in a checkout by coincidence of directory depth and is absent in the artefact.
 *
 * ⚠️ **The engine is a build artifact, so a checkout is not enough either.** It is produced by
 * `npm run build --workspace @noodl/preview` (esbuild, one command) and is gitignored, so the
 * refusal below has to distinguish "you are not in a checkout" from "you are, and have not built
 * it" — those have different fixes and a reader who is told the wrong one goes looking in the
 * wrong place.
 */
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface ResolvedEngine {
  /** The engine entry point, or `null` when nothing was found. */
  entry: string | null;
  /** Every path tried, in order, whether or not it existed. Printed in the refusal. */
  probed: string[];
  /** Set when `NODEGX_DEPLOY_CLI` was given and pointed at nothing. */
  overrideMissing?: string;
  /**
   * Set when a `packages/noodl-preview` was found next to a *missing* bundle — i.e. this IS a
   * checkout and the only thing wrong is that nobody ran the build.
   */
  unbuiltPackage?: string;
}

/** The environment variable that redirects this, named once. */
export const ENGINE_ENV = 'NODEGX_DEPLOY_CLI';

/** The bundle `packages/noodl-preview/build.mjs` writes for this command. */
const ENGINE_RELATIVE = ['noodl-preview', 'dist', 'nodegx-deploy.cjs'];

/**
 * Locate `nodegx-deploy.cjs`.
 *
 * ⚠️ A `NODEGX_DEPLOY_CLI` that points at nothing is an **error**, never a fall-through to the
 * checkout candidates — the same rule `resolveHarness` follows, for the same reason: setting it is
 * a deliberate act, so a typo in it must say so rather than silently running a different engine
 * from the one the caller redirected to.
 */
export function resolveEngine(fromDir: string = __dirname, env: NodeJS.ProcessEnv = process.env): ResolvedEngine {
  const probed: string[] = [];
  const push = (candidate: string): string | null => {
    probed.push(candidate);
    return fs.existsSync(candidate) ? candidate : null;
  };

  const override = env[ENGINE_ENV];
  if (override) {
    const found = push(override);
    return found ? { entry: found, probed } : { entry: null, probed, overrideMissing: override };
  }

  // Both candidates land on `packages/`: two levels up from `dist/` (the bundle, which is what the
  // `nodegx` bin is) and three from `src/cli/` (ts-jest and `npx tsx`, which is what the specs
  // are). Neither is a fact about an install — in `node_modules/@nodegx/export/dist`, two levels
  // up is `node_modules`, which holds no `noodl-preview`.
  const packageDirs = [path.resolve(fromDir, '..', '..'), path.resolve(fromDir, '..', '..', '..')];

  for (const packages of packageDirs) {
    const found = push(path.join(packages, ...ENGINE_RELATIVE));
    if (found) return { entry: found, probed };
  }

  // Nothing built. Was there a checkout at all? The two fixes are different sentences.
  for (const packages of packageDirs) {
    const previewPackage = path.join(packages, 'noodl-preview', 'package.json');
    if (fs.existsSync(previewPackage)) {
      return { entry: null, probed, unbuiltPackage: path.dirname(previewPackage) };
    }
  }
  return { entry: null, probed };
}

/**
 * The sentence a caller with no engine gets. A refusal that cannot say where it looked sends the
 * reader to guess at a layout, and there are three layouts here.
 */
export function describeMissingEngine(resolved: ResolvedEngine): string {
  if (resolved.overrideMissing) {
    return (
      `${ENGINE_ENV} is set to ${resolved.overrideMissing}, and there is nothing there.\n` +
      "Point it at a checkout's packages/noodl-preview/dist/nodegx-deploy.cjs, or unset it.\n"
    );
  }
  if (resolved.unbuiltPackage) {
    return (
      'The deploy engine has not been built in this checkout.\n' +
      '\n' +
      `Found ${resolved.unbuiltPackage}, but not its bundle. It is a build artifact, not\n` +
      'committed. Build it with:\n' +
      '  npm run build --workspace @noodl/preview\n'
    );
  }
  return (
    'This build of nodegx cannot deploy.\n' +
    '\n' +
    'A deploy writes a ready-to-host site that carries the NodeGX interpreter, which needs the\n' +
    "editor's model engine and the viewer runtime — neither is part of the @nodegx/export package\n" +
    'and neither is installed with it. `nodegx export` needs none of it and works here.\n' +
    '\n' +
    'To deploy, either run this from a NodeGX checkout with the engine built, or set\n' +
    `  ${ENGINE_ENV}=/path/to/NodeGX/packages/noodl-preview/dist/nodegx-deploy.cjs\n` +
    '\n' +
    'Looked in:\n' +
    resolved.probed.map((candidate) => `  ${candidate}\n`).join('')
  );
}

/** Written by `packages/noodl-preview/build.mjs` beside the engine: the files it was built from. */
export const ENGINE_INPUTS = 'nodegx-deploy.inputs.json';

/**
 * P109-S5 — why the engine at `entry` is out of date, or null when it is current: its input list exists, and no file
 * on it changed after the engine was built. A list naming a file that is gone is out of date too (a module moved). The
 * same rule as the MCP's kit reader (`noodl-mcp/src/kitExtract/extract.ts` `kitExtractStaleness`, P109 ISL-014).
 *
 * 🔴 Why it matters: the engine carries its own copy of the node catalog, the validator and the kit injector. A
 * checkout's engine bundled on Sep 17 refused a valid project with "Group has no input named scrollIntoView" (exit 2,
 * blaming the project) while every other check passed it; one built Oct 5 loaded kits in the wrong order on Oct 9.
 */
export function engineStaleness(entry: string): string | null {
  return bundleStaleness(entry, path.join(path.dirname(entry), ENGINE_INPUTS), path.dirname(path.dirname(entry)));
}

/** The one rule every list follows: `bundle` is out of date when a file on `listFile` (relative to `root`) is gone or newer. */
export function bundleStaleness(bundle: string, listFile: string, root: string): string | null {
  let inputs: string[];
  try {
    inputs = (JSON.parse(fs.readFileSync(listFile, 'utf8')) as { inputs: string[] }).inputs;
  } catch {
    return `it has no ${path.basename(listFile)} beside it to say what it was built from`;
  }
  const builtAt = fs.statSync(bundle).mtimeMs;
  for (const input of inputs) {
    const file = path.resolve(root, input);
    if (!fs.existsSync(file)) return `${input} is gone`;
    if (fs.statSync(file).mtimeMs > builtAt) return `${input} changed after it was built`;
  }
  return null;
}

/** Written by `noodl-viewer-react/webpack-configs/webpack.deploy.common.js` beside the runtime a deployed site carries. */
export const RUNTIME_INPUTS = 'noodl.deploy.inputs.json';

/**
 * P109-S5 (its second half, P109 s34) — the sentence for a deploy whose viewer runtime is older than its source, or null
 * when it is current or this is not a checkout. The runtime (`noodl-editor/src/external/deploy/noodl.deploy.js`) is a
 * webpack build of the viewer and runtime packages, copied into every deployed site; on 2026-10-09 one two days older
 * than its source made a deployed page throw `Noodl.getModule is not a function` while every loader spec was green.
 * A warning, not a refusal and not a rebuild: the build takes minutes, and the site it writes still runs.
 */
export function runtimeWarning(resolved: ResolvedEngine, env: NodeJS.ProcessEnv = process.env): string | null {
  if (!resolved.entry || env[ENGINE_ENV]) return null;
  const packages = path.dirname(path.dirname(path.dirname(resolved.entry)));
  const runtimeDir = path.join(packages, 'noodl-editor', 'src', 'external', 'deploy');
  const runtime = path.join(runtimeDir, 'noodl.deploy.js');
  if (!fs.existsSync(path.join(packages, 'noodl-viewer-react', 'package.json')) || !fs.existsSync(runtime)) return null;
  const why = bundleStaleness(runtime, path.join(runtimeDir, RUNTIME_INPUTS), runtimeDir);
  if (why === null) return null;
  return (
    `Warning: the viewer runtime this site carries may be older than its source (${why}), so the site may not\n` +
    'run the code in this checkout. Rebuild it with:\n' +
    '  npm run build:editor:_viewer\n'
  );
}

export interface EngineRefresh {
  /** Set when the engine was rebuilt: the sentence to print. */
  rebuilt?: string;
  /** Set when it was out of date and the rebuild failed: the refusal to print. */
  failed?: string;
}

/**
 * P109-S5 — in a checkout, an engine older than its source is rebuilt before it runs (`node build.mjs --deploy-only`,
 * about a second), as the MCP server rebuilds its kit reader (Richard's ISL-014 ruling, 2026-10-02: "Build it
 * automatically"). Nothing happens for an engine named by `NODEGX_DEPLOY_CLI` (a deliberate choice of engine) or one
 * with no `build.mjs` beside its folder (not a checkout).
 */
export function refreshEngine(resolved: ResolvedEngine, env: NodeJS.ProcessEnv = process.env): EngineRefresh {
  if (!resolved.entry || env[ENGINE_ENV]) return {};
  const packageRoot = path.dirname(path.dirname(resolved.entry));
  const builder = path.join(packageRoot, 'build.mjs');
  if (!fs.existsSync(builder)) return {};
  const why = engineStaleness(resolved.entry);
  if (why === null) return {};
  const started = Date.now();
  const run = spawnSync(process.execPath, [builder, '--deploy-only'], { cwd: packageRoot, encoding: 'utf8' });
  if (run.status !== 0) {
    return {
      failed:
        `The deploy engine is out of date (${why}) and rebuilding it failed:\n` +
        `${(run.stderr || run.stdout || String(run.error ?? '')).trim()}\n` +
        'Build it by hand with:\n' +
        '  npm run build --workspace @noodl/preview\n'
    };
  }
  return { rebuilt: `The deploy engine was out of date (${why}); rebuilt it in ${((Date.now() - started) / 1000).toFixed(1)} s.\n` };
}
