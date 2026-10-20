/**
 * P112-OWN021-PUSHTOALL — a save pushes the project's cloud functions to its own backend, and to no other.
 *
 * On 0.4.2 a builder ran the marketplace's backend, opened the community app (no backend yet), and its first save
 * pushed its 15 functions into the marketplace's backend: every save went to every running local backend. This grades
 * the decision `CloudFunctionDeployer.pushToProjectBackend` delegates to (`services/cloudDeployTarget.ts`), against a
 * fake main process holding two running backends.
 */
import { pushToProjectBackend } from '../../src/editor/src/services/cloudDeployTarget';

const MARKETPLACE = { id: 'backend_marketplace', port: 8577 };
const COMMUNITY = { id: 'backend_community', port: 8578 };

function mainProcess(running: Record<string, boolean>) {
  return async <T>(channel: string, id?: unknown): Promise<T> => {
    if (channel === 'backend:list') return [MARKETPLACE, COMMUNITY] as T;
    if (channel === 'backend:status') return { running: Boolean(running[id as string]) } as T;
    throw new Error(`unexpected channel ${channel}`);
  };
}

async function save(endpoint: { endpoint?: string; id?: string } | undefined, running: Record<string, boolean>) {
  const pushed: string[] = [];
  const result = await pushToProjectBackend({
    endpoint,
    invoke: mainProcess(running),
    push: async (id) => {
      pushed.push(id);
      return true;
    }
  });
  return { pushed, result };
}

const bothRunning = { [MARKETPLACE.id]: true, [COMMUNITY.id]: true };

describe('P112-OWN021-PUSHTOALL — two projects, two running backends', () => {
  it("a save in the community app pushes to the community app's backend, and not the marketplace's", async () => {
    const { pushed, result } = await save({ id: COMMUNITY.id, endpoint: 'http://localhost:8578' }, bothRunning);
    expect(pushed).toEqual([COMMUNITY.id]);
    expect(result).toEqual({ backendId: COMMUNITY.id, ok: true });
  });

  it('a save in the marketplace pushes to the marketplace only', async () => {
    const { pushed } = await save({ id: MARKETPLACE.id, endpoint: 'http://localhost:8577' }, bothRunning);
    expect(pushed).toEqual([MARKETPLACE.id]);
  });

  it("S8's case: a project with no backend of its own pushes nothing, whatever else is running", async () => {
    const { pushed, result } = await save({ id: undefined, endpoint: undefined }, bothRunning);
    expect(pushed).toEqual([]);
    expect(result).toBeUndefined();
  });

  it("a project whose own backend is stopped pushes nothing, not to the one that's up", async () => {
    const { pushed } = await save({ id: COMMUNITY.id, endpoint: 'http://localhost:8578' }, { [MARKETPLACE.id]: true });
    expect(pushed).toEqual([]);
  });

  it('a project bound by port alone (an endpoint written before ids) finds its backend', async () => {
    const { pushed } = await save({ endpoint: 'http://127.0.0.1:8578' }, bothRunning);
    expect(pushed).toEqual([COMMUNITY.id]);
  });

  it('an endpoint on another machine is not a local backend: nothing is pushed', async () => {
    const { pushed } = await save({ endpoint: 'https://api.example.com:8578' }, bothRunning);
    expect(pushed).toEqual([]);
  });
});
