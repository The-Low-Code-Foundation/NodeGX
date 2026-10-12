/**
 * P112-S14-UNDEPLOYED — a write that changes a cloud function says, in its own result, that the backend doesn't have
 * it yet.
 *
 * OWN-015's stranger round wrote `#__cloud__/Functions/Speak` through `apply_plan`, wired a Cloud Function to it, ran
 * `validate_project` (0 errors) and reported the app built. It never called `deploy_cloud_functions`, so every tap
 * called a function the backend didn't serve. None of its write results mentioned deploying. In the editor a person
 * presses Deploy; on the agent's path nothing said so, and `render_report` can't see it (the render never presses
 * the button).
 *
 * Every write door adds {@link cloudDeployPayload} after the write: the functions written, the next call, and the
 * deploy tool revealed if the backend group was still deferred.
 *
 * @module noodl-mcp/tools/cloudDeployNote
 */

import type { ProjectStore } from '../project/ProjectStore';
import type { ToolDisclosure } from './disclosure';

/** Where every cloud function component lives, in legacy-name form. */
export const CLOUD_LEGACY_PREFIX = '/#__cloud__/';

export interface CloudDeployNote {
  cloudFunctionsNotDeployed?: {
    functions: string[];
    next: string;
    toolsRevealed?: string[];
  };
}

/** The note for one write, or `{}` when it touched no cloud function. `legacyNames` are the components written. */
export function cloudDeployPayload(
  legacyNames: readonly string[],
  store: Pick<ProjectStore, 'readCloudServices'>,
  disclosure?: Pick<ToolDisclosure, 'revealNames'>
): CloudDeployNote {
  const functions = legacyNames.filter((n) => n.startsWith(CLOUD_LEGACY_PREFIX)).map((n) => n.slice(CLOUD_LEGACY_PREFIX.length));
  if (functions.length === 0) return {};

  const named = functions.map((f) => `"${f}"`).join(', ');
  const bound = Boolean(store.readCloudServices().endpoint);
  const next = bound
    ? `Call deploy_cloud_functions now. This write changed ${named} in the project files only: the backend still ` +
      'runs the version it had before (or none), so the app gets the old function or no answer until you deploy. ' +
      'Then call the function over HTTP to check it answers.'
    : `${named} will not run anywhere yet: this project has no backend. Call provision_backend, then ` +
      'deploy_cloud_functions.';
  const revealed = disclosure?.revealNames(bound ? ['deploy_cloud_functions'] : ['provision_backend', 'deploy_cloud_functions']) ?? [];

  return {
    cloudFunctionsNotDeployed: {
      functions,
      next,
      ...(revealed.length > 0 ? { toolsRevealed: revealed } : {})
    }
  };
}
