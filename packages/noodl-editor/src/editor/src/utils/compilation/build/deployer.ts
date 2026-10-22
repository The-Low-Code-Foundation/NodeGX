import { filesystem } from '@noodl/platform';

import { ProjectModel } from '@noodl-models/projectmodel';

import * as Exporter from '../../exporter';
import { isCloudFunctionComponent } from '../../exporter/cloudFunctions';
import { DeployEnvironment } from '../build-context';
import { copyProjectFilesToFolder, formatCopyReportSummary, ProjectCopyReport } from './copy';
import {
  DEPLOY_CONFIG_FILE,
  DEPLOY_GUIDE_FILE,
  DEPLOY_PACKAGE_FILE,
  renderDeployConfig,
  renderDeployGuide,
  renderDeployPackageJson
} from './deploy-guide';
import { PROJECT_FILES } from './deploy-target';
import { loadDeployIndex, copyDeployFilesToFolder, getExternalFolderPath } from './deploy-index';
import { HtmlProcessor, HtmlProcessorParameters } from './processors/html-processor';

export type DeployToFolderOptions = {
  project: ProjectModel;

  /**
   * The folder that we will publish the files to.
   */
  direntry: string;

  /**
   * The environment we want to publish with.
   */
  environment: DeployEnvironment | undefined;

  baseUrl: string;

  runtimeType?: string;
  envVariables?: Record<string, string>;

  /**
   * This pass writes the top of the deploy: `DEPLOY.md` (how to run it) and `nodegx-config.json`
   * (DEP-001, the backend address a person can change without the editor). Default true. The SSR
   * layout's second pass into `public/` turns it off: one guide and one config per deploy, at its
   * top, where the server reads the config and serves it to the browser.
   */
  deployRoot?: boolean;
};

/**
 * Deployer is handling all the project deploy to a folder logic.
 *
 * This is also used when deploying to the Cloud
 * where it just copies over the built files.
 */
export type DeployToFolderResult = {
  /**
   * What the verbatim project-file copy included and excluded (DEP-008).
   * Surfaced to the user so an ignored asset is distinguishable from a lost one.
   */
  copyReport: ProjectCopyReport;
  /**
   * HLS-014 — every out-dir-relative path this run wrote: the copied project files, the runtime
   * files, the hashed export, `index.html`, and each component bundle.
   *
   * 🔴 **A directory listing is not this list, and on a second deploy the difference is the whole
   * task.** Every generated name here is a content hash, so a redeploy writes `index-<new>.js`
   * beside `index-<old>.js` and a second copy of every bundle whose component changed, and deletes
   * neither. The caller holding this list can remove what its own previous deploy left; a caller
   * reading the folder can only see that there are two of everything and no way to tell which is
   * which.
   */
  written: string[];
};

export async function deployToFolder({
  project,
  direntry,
  environment,
  baseUrl,
  envVariables,
  runtimeType = 'deploy',
  deployRoot = true
}: DeployToFolderOptions): Promise<DeployToFolderResult> {
  // Never into a project. 🔴 P26-V2GUARD: this used to look for `project.json` only, and a v2
  // project has `nodegx.project.json` instead — a deploy into one wrote index.html, the runtime and
  // noodl_bundles/ in among the project's own files, and exited 0.
  if (PROJECT_FILES.some((file) => filesystem.exists(filesystem.join(direntry, file)))) {
    return Promise.reject({ result: 'failure', message: 'Cannot deploy to a project folder.' });
  }

  // Start by copying all files from the project folder to the deploy directory.
  // Everything not excluded by the ignore rules ships — see ./copy.ts.
  const copyReport = await copyProjectFilesToFolder(project._retainedProjectDirectory, direntry);
  logCopyReport(copyReport, direntry);

  // Export project
  const exportJson = Exporter.exportToJSON(project, {
    useBundles: true,
    useBundleHashes: true,
    environment,
    // Remove all the cloud function components. WFA-001: the shared predicate,
    // negated — `exportCloudFunctionsToJSON` keeps exactly what this drops, and
    // a spec asserts the two partition the component set.
    ignoreComponentFilter: (component) => !isCloudFunctionComponent(component)
  });

  if (!exportJson) {
    return Promise.reject({ result: 'failure', message: 'Failed to export project.' });
  }

  // FH-018: the `dbConfigSchema` strip that used to run here is gone with the
  // Config node. It only ever hid *key names* from an exported bundle, never a
  // value — the values were served by a public `GET /config`, which is where the
  // real filter now lives.

  // Read deploy description
  const index = await loadDeployIndex(`${runtimeType}/index.json`);

  // Copy all deploy files
  const runtimeFiles = await copyDeployFilesToFolder({
    project,
    direntry,
    files: index,
    exportJson,
    baseUrl,
    envVariables,
    runtimeType
  });

  //then the export component bundles
  const dir = direntry + '/noodl_bundles/';
  const bundleFiles: string[] = [];
  for (const bundleId in exportJson.componentIndex) {
    if (bundleId !== 'root') {
      const json = JSON.stringify(Exporter.exportComponentBundle(project, bundleId, exportJson.componentIndex));
      if (!filesystem.exists(dir)) {
        await filesystem.makeDirectory(dir);
      }

      await filesystem.writeFile(dir + bundleId + '.json', json);
      bundleFiles.push(`noodl_bundles/${bundleId}.json`);
    }
  }

  // Last, so they win over project files of the same names — both are ours, and rewritten every
  // deploy. The project's own README.md is left alone; see ./deploy-guide.ts.
  const rootFiles: string[] = [];
  if (deployRoot) {
    const guide = renderDeployGuide({
      projectName: project.name,
      runtimeType,
      backendEndpoint: exportJson.metadata?.cloudservices?.endpoint,
      baseUrl
    });
    await filesystem.writeFileOverride(direntry + '/' + DEPLOY_GUIDE_FILE, guide);
    rootFiles.push(DEPLOY_GUIDE_FILE);

    await filesystem.writeFileOverride(direntry + '/' + DEPLOY_CONFIG_FILE, renderDeployConfig(exportJson.metadata));
    rootFiles.push(DEPLOY_CONFIG_FILE);

    // The server layout's package.json comes from its runtime manifest; only the static one needs ours.
    if (runtimeType === 'deploy') {
      await filesystem.writeFileOverride(direntry + '/' + DEPLOY_PACKAGE_FILE, renderDeployPackageJson(project.name));
      rootFiles.push(DEPLOY_PACKAGE_FILE);
    }
  }

  return { copyReport, written: [...copyReport.copiedPaths, ...runtimeFiles, ...bundleFiles, ...rootFiles] };
}

/**
 * DEP-008 criterion 5: the deploy report states the excluded count and the rule
 * that excluded each path. The toast carries the count; the per-path list goes
 * here, where it survives the toast and can be copied out of the console.
 */
function logCopyReport(report: ProjectCopyReport, direntry: string): void {
  console.log(`[deploy] ${direntry}: ${report.copiedCount} project file(s) copied. ${formatCopyReportSummary(report)}`);

  // EXP-017 AC4 — a duplicate that had to ship anyway. Named, with the copy that made it one and
  // the sentence saying why it could not be left out, because the fix is a one-line edit in the
  // editor and nobody makes it while the bytes are invisible.
  for (const kept of report.duplicatesKept) {
    console.warn(
      `[deploy] ! ${kept.path} (${kept.bytes} B) is byte-for-byte the same file as ${kept.keep}, ` +
        `and both were published — ${kept.reason}. Point that reference at ${kept.keep} and the ` +
        'second copy stops shipping.'
    );
  }

  if (report.excluded.length === 0) return;

  if (!report.hasIgnoreFile) {
    console.log('[deploy] No .noodlignore in the project — default rules only. See docs/runtime/DEPLOY-IGNORE.md.');
  }

  if (report.staleExclusions.length > 0) {
    console.warn(
      `[deploy] ${report.staleExclusions.length} excluded path(s) ALREADY EXIST in ${direntry} — left in place, ` +
        'almost certainly copied there by an earlier deploy. Delete them by hand if they must not be public:'
    );
    for (const stale of report.staleExclusions) {
      console.warn(`[deploy]       ${filesystem.join(direntry, stale)}`);
    }
  }

  for (const rule of report.excludedByRule) {
    const why = rule.reason ? ` — ${rule.reason}` : '';
    console.log(`[deploy]   ${rule.count}× excluded by ${rule.source} rule \`${rule.rule}\`${why}`);
    for (const file of report.excluded.filter((f) => f.rule === rule.rule && f.source === rule.source)) {
      console.log(`[deploy]       ${file.path}`);
    }
  }
}

export async function createIndexPage(project: ProjectModel, parameters: HtmlProcessorParameters) {
  // Read deploy description
  const index = await loadDeployIndex('deploy/index.json');

  // Find the "index.html" file
  const indexFile = index.find((entry) => entry.url === 'index.html');
  if (!indexFile) {
    throw new Error('Could not find index.html in deploy index.');
  }

  // Read the index.html file
  const indexFilePath = filesystem.join(getExternalFolderPath(), 'deploy', indexFile.url);
  const indexContent = await filesystem.readFile(indexFilePath);

  const htmlProcessor = new HtmlProcessor(project);
  const content = await htmlProcessor.process(indexContent, parameters);

  return content;
}
