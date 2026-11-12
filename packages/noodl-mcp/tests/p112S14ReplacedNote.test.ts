/**
 * P112-S14-MOVEDDEPLOY's leftover: `deploy_cloud_functions` says when its push replaced the bundle this project
 * deployed under its folder's old name. The backend answers `replaced` (WorkflowRunner.loadWorkflow); the MCP door's
 * transport carries it into the shared deploy core's result, and the tool leads its `next` with the sentence.
 */
import type { BackendClient } from '../src/backend/client';
import { backendTransport, replacedNote } from '../src/cloud/deploy';
import { deployCloudBundle } from '../../noodl-editor/src/editor/src/utils/exporter/cloudDeployCore';

function client(json: unknown): BackendClient {
  return { request: async () => ({ status: 200, json }) } as unknown as BackendClient;
}

const parts = { bundle: { components: [{ name: '/#__cloud__/a' }], settings: {}, metadata: {} }, shipped: ['/#__cloud__/a'], failures: [] };

describe('P112-S14-MOVEDDEPLOY — deploy_cloud_functions says what its push replaced', () => {
  it('the MCP transport carries the backend\'s answer into the result', async () => {
    const result = await deployCloudBundle(parts, 'shop-1234abcd', backendTransport(client({ success: true, replaced: ['shop-9876fedc'] })), {
      force: true
    });
    expect(result.replaced).toEqual(['shop-9876fedc']);
    expect(replacedNote(result)).toBe(
      'This push replaced "shop-9876fedc": the bundle this project deployed under its folder\'s earlier name (it was ' +
        'moved, renamed or copied since). Its functions are served from "shop-1234abcd" now. '
    );
  });

  it('a push that replaced nothing says nothing', async () => {
    const result = await deployCloudBundle(parts, 'shop-1234abcd', backendTransport(client({ success: true })), { force: true });
    expect(result).not.toHaveProperty('replaced');
    expect(replacedNote(result)).toBe('');
  });

  it('two old bundles are both named', () => {
    expect(replacedNote({ bundleName: 'b', replaced: ['x', 'y'] })).toContain('replaced "x", "y": the bundles this project');
  });
});
