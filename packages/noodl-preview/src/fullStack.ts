/**
 * P26 DEP-002 — `nodegx-deploy --full-stack`: the app AND its backend, as one folder a person runs
 * with one command, here or on a server.
 *
 *   my-app/
 *     app/                    the client-side deploy, as `nodegx-deploy` writes it without the flag
 *     backend/cli.js          the backend this installation ships (`resolveServiceEntry`)
 *     backend/workflows/      the project's cloud functions, built by the editor's own builder
 *     backend/nodegx.security.json   the project's access rules, when it has them
 *     start.js, start.sh, start.cmd  the launcher (nodegx-backend `deploy/folder/`)
 *     MANIFEST.json           every file above, with its checksum (`package-deploy.js`)
 *     DEPLOY.md, package.json
 *     data/                   made by the first start; NEVER written by a deploy
 *
 * 🔴 **One packaging path.** Everything under `app/` and `backend/`, and the launcher, goes through
 * `packageDeploy` — the script that makes the Docker artifact — so the folder gets the same
 * credential scan (a key pasted into a cloud function refuses the deploy, OWN-016 AC3's finding
 * made a gate) and the same manifest. This module only decides what goes in and where it lands.
 *
 * 🔴 **A redeploy replaces `app/` and `backend/` wholesale and never touches `data/`.** That is what
 * lets a person deploy over a running app's folder: the records, the uploads and the admin
 * credential are in `data/`, and nothing a deploy writes is.
 *
 * @module noodl-preview/fullStack
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import type { ProjectModel } from '@noodl-models/projectmodel';
import {
  renderFullStackGuide,
  renderFullStackPackageJson,
  type BackendUse
} from '@noodl-utils/compilation/build/deploy-guide';
import { PROJECT_FILES } from '@noodl-utils/compilation/build/deploy-target';
import { hashCloudExport } from '@noodl-utils/exporter/cloudDeployCore';
import { prepareProjectForCloudExport } from '@noodl-utils/exporter/cloudDeployEnvironment';
import {
  buildCloudBundlePartsWithKits,
  CLOUD_COMPONENT_PREFIX,
  cloudBundleName,
  isCloudFunctionComponent
} from '@noodl-utils/exporter/cloudFunctions';

import { backendRequirementFor } from '../../noodl-editor/src/editor/src/validation/backendRequirement';
import { resolveServiceEntry } from './ownBackend';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { packageDeploy, LAUNCHER_FILES } = require('../../nodegx-backend/scripts/package-deploy.js');

export const FULL_STACK_FLAG = '--full-stack';

/** The project's access rules: `nodegx.security.json` at its root (SB-015). */
const POLICY_FILE = 'nodegx.security.json';

/** What a full-stack deploy reports beside the usual outcome. */
export interface FullStackReading {
  /** The backend bundle that was packaged, as found in this installation. */
  backend: string;
  /** What the project asks of its backend, read off its graph. */
  uses: BackendUse;
  /** Cloud functions that could not be built, with why. They are NOT in the folder. */
  functionFailures: { name: string; reason: string }[];
  /** The project ships its own access rules, and they are in `backend/`. */
  rules: boolean;
  buildId: string;
  artifactDigest: string;
}

/** The folder a full-stack deploy was given is not one it may write. Nothing was written. */
export class FullStackTargetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FullStackTargetError';
  }
}

/** This installation lacks the backend or its launcher. Nothing was written. */
export class FullStackInstallError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FullStackInstallError';
  }
}

/** Everything resolved before a byte is written. */
export interface FullStackPlan {
  outDir: string;
  cliPath: string;
  launcherDir: string;
}

/** A temporary folder the app is deployed into and the package is made in, then removed. */
export interface FullStackStage extends FullStackPlan {
  stage: string;
  appStage: string;
}

export function openFullStackStage(plan: FullStackPlan): FullStackStage {
  const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-full-stack-'));
  return { ...plan, stage, appStage: path.join(stage, 'app') };
}

/** The launcher: shipped beside the backend in a package, else in a checkout's nodegx-backend. */
export function resolveLauncherDir(cliPath: string): string | null {
  const candidates = [
    process.env.NODEGX_BACKEND_LAUNCHER,
    path.join(path.dirname(cliPath), 'folder'),
    path.resolve(__dirname, '..', '..', 'nodegx-backend', 'deploy', 'folder')
  ];
  for (const c of candidates) {
    if (c && (LAUNCHER_FILES as string[]).every((f) => fs.existsSync(path.join(c, f)))) return c;
  }
  return null;
}

/**
 * Whether `outDir` may be written: missing, empty, or a previous full-stack deploy.
 *
 * 🔴 A deploy deletes `app/` and `backend/` in the folder it is given. A folder that is anything
 * else — a project, somebody's own `app/`, a static deploy — is refused, by name, before anything
 * is written.
 */
export function refuseFullStackTarget(outDir: string): string | null {
  if (!fs.existsSync(outDir)) return null;
  if (!fs.statSync(outDir).isDirectory()) return `${outDir} is a file, not a folder.`;
  if (PROJECT_FILES.some((file) => fs.existsSync(path.join(outDir, file)))) return 'Cannot deploy to a project folder.';
  const entries = fs.readdirSync(outDir).filter((name) => name !== '.DS_Store');
  if (entries.length === 0) return null;
  try {
    const manifest = JSON.parse(fs.readFileSync(path.join(outDir, 'MANIFEST.json'), 'utf8'));
    if (manifest && manifest.layout === 'full-stack') return null;
  } catch {
    // Not one of ours; refused below.
  }
  return (
    `${outDir} already holds files, and it is not a full-stack deploy (no MANIFEST.json saying so). ` +
    'A full-stack deploy replaces app/ and backend/ in its folder, so it only writes into an empty folder ' +
    'or one an earlier full-stack deploy made. Choose an empty folder.'
  );
}

/** Resolve the backend and the launcher and check the folder. Throws a sentence; writes nothing. */
export function planFullStack(outDir: string): FullStackPlan {
  const refusal = refuseFullStackTarget(outDir);
  if (refusal) throw new FullStackTargetError(refusal);
  const cliPath = resolveServiceEntry();
  if (!cliPath) {
    throw new FullStackInstallError(
      'This installation has no backend to put in the folder (no dist/backend/cli.js beside this program, and no ' +
        'packages/nodegx-backend/dist/cli.js beside it). Install a current @nodegx/preview, or set ' +
        'NODEGX_BACKEND_ENTRY to a built nodegx-backend cli.js.'
    );
  }
  const launcherDir = resolveLauncherDir(cliPath);
  if (!launcherDir) {
    throw new FullStackInstallError(
      `This installation has a backend (${cliPath}) but not the start.js that runs it beside the app. ` +
        'Install a current @nodegx/preview, or set NODEGX_BACKEND_LAUNCHER to nodegx-backend/deploy/folder.'
    );
  }
  return { outDir, cliPath, launcherDir };
}

/** Upload File, Sign File URL, Cloud File: the rows of the requirement table that are about files. */
const FILE_TYPES = new Set(['Upload File', 'Sign File URL', 'Cloud File']);
const FUNCTION_CALL_TYPES = new Set(['Cloud Function', 'CloudFunction2']);

/** What the app's own pages ask of a backend, from the same table the editor's diagnostic reads. */
export function readBackendUse(project: ProjectModel): Omit<BackendUse, 'functions'> {
  const use = { records: false, users: false, files: false };
  for (const component of project.getComponents()) {
    if (isCloudFunctionComponent(component)) continue;
    component.graph.forEachNode((node) => {
      const type = node.typename;
      const needs = backendRequirementFor(type);
      if (needs === 'backend:auth') use.users = true;
      else if (FILE_TYPES.has(type)) use.files = true;
      else if (needs === 'backend' && !FUNCTION_CALL_TYPES.has(type)) use.records = true;
      // 🔴 `forEachNode` stops at a truthy return; this callback returns nothing on purpose.
    });
  }
  return use;
}

function listFiles(root: string, prefix = ''): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(path.join(root, prefix), { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...listFiles(root, rel));
    else if (entry.isFile()) out.push(rel);
  }
  return out;
}

/**
 * After the app is written to `plan.appStage`: build the functions, package, and put the result in
 * `plan.outDir`. `cloudProject` is a SECOND model read of the project: preparing it for the cloud
 * export loads the cloud node library and mutates the model, and the app's model must not see that.
 */
export async function finishFullStack(
  plan: FullStackStage,
  options: {
    project: ProjectModel;
    cloudProject: ProjectModel;
    projectDir: string;
    projectName: string;
    baseUrl?: string;
  }
): Promise<{ written: string[]; reading: FullStackReading }> {
  const backendFiles: Record<string, string> = {};
  const inputs = path.join(plan.stage, 'inputs');
  fs.mkdirSync(inputs, { recursive: true });

  // The project's access rules.
  const policy = path.join(options.projectDir, POLICY_FILE);
  const rules = fs.existsSync(policy);
  if (rules) backendFiles[POLICY_FILE] = policy;

  // The cloud functions: the bundle the editor's Deploy button and `deploy_cloud_functions` push,
  // written as the file the backend writes when it is pushed (`<name>.workflow.json`, with its
  // `deployFingerprint`), so the backend that starts from it cannot tell the difference.
  const appUse = readBackendUse(options.project);
  prepareProjectForCloudExport(options.cloudProject);
  const parts = await buildCloudBundlePartsWithKits(options.cloudProject);
  if (parts.bundle) {
    const name = `${cloudBundleName(options.cloudProject)}.workflow.json`;
    const file = path.join(inputs, name);
    fs.writeFileSync(
      file,
      JSON.stringify({ ...parts.bundle, deployFingerprint: hashCloudExport(parts.bundle) }, null, 2)
    );
    backendFiles[`workflows/${name}`] = file;
  }
  // By the name a person gives the function (the Cloud Functions panel's), not the component path.
  const functionName = (component: string) =>
    component.startsWith(CLOUD_COMPONENT_PREFIX) ? component.slice(CLOUD_COMPONENT_PREFIX.length) : component;
  const uses: BackendUse = { ...appUse, functions: parts.shipped.map(functionName).sort() };

  const packaged = path.join(plan.stage, 'package');
  const { manifest } = packageDeploy({
    appDir: plan.appStage,
    outDir: packaged,
    cliPath: plan.cliPath,
    launcherDir: plan.launcherDir,
    backendFiles,
    fullStack: true,
    backendVersion: null
  });

  // Into the folder: what the package holds replaces what is there, entry by entry. `data/` is not
  // in the package, so it is never named here.
  fs.mkdirSync(plan.outDir, { recursive: true });
  for (const entry of fs.readdirSync(packaged)) {
    const to = path.join(plan.outDir, entry);
    fs.rmSync(to, { recursive: true, force: true });
    fs.cpSync(path.join(packaged, entry), to, { recursive: true });
  }
  // NPMAUDIT-LICENCE — the backend's MIT licence beside it: next to the cli.js this installation ships
  // (dist/backend/LICENSE, build-backend-copy.mjs), or the package's own in a checkout (dist/cli.js's parent).
  const backendLicence = [path.dirname(plan.cliPath), path.dirname(path.dirname(plan.cliPath))]
    .map((dir) => path.join(dir, 'LICENSE'))
    .find((file) => fs.existsSync(file));
  if (backendLicence) fs.copyFileSync(backendLicence, path.join(plan.outDir, 'backend', 'LICENSE'));
  fs.writeFileSync(
    path.join(plan.outDir, 'DEPLOY.md'),
    renderFullStackGuide({ projectName: options.projectName, baseUrl: options.baseUrl, uses, hasRules: rules })
  );
  fs.writeFileSync(path.join(plan.outDir, 'package.json'), renderFullStackPackageJson(options.projectName));

  return {
    written: listFiles(plan.outDir).filter((rel) => !rel.startsWith('data/')),
    reading: {
      backend: plan.cliPath,
      uses,
      functionFailures: parts.failures.map((failure) => ({ ...failure, name: functionName(failure.name) })),
      rules,
      buildId: manifest.buildId,
      artifactDigest: manifest.artifactDigest
    }
  };
}
