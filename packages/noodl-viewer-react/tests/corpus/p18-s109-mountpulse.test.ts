/* eslint-env jest */

/**
 * P18-S109-MOUNTPULSE, measured in a real component (Beta sweep s18, 2026-10-27): it does NOT reproduce in the runtime.
 *
 * The row said a provider error that settled before Sign In With was made reports Failure in `initialize`, before
 * nodescope.ts attaches the wires, so the pulse reaches nothing. In the runtime it does reach them: `sendSignalOnOutput`
 * records the signal for the rest of the update (`_signalsSentThisUpdate`, cleared by `scheduleAfterInputsHaveUpdated`),
 * and `connectInput` replays a recorded signal to a wire attached after it (node.ts). The row's reading came from
 * nodegx-export's differential harness (`the-sign-in-with.test.ts` §C), whose NodeContext logs a signal only once the
 * node is wired; the export's own lib transcribes that (`applyReturn(s, current, false)`), so the exported app is the
 * one that loses the Failure.
 *
 * The control turns the replay off (each source's record is cleared just before a wire attaches) and the same page then
 * gets no Failure: what the first test reads is the replay, not a pulse that happened to arrive some other way.
 */

interface OAuthState {
  inProgress?: boolean;
  succeeded?: boolean;
  error?: string;
}

const mockUserService: Record<string, unknown> & { oauthReturn: OAuthState; listeners: Array<(state: OAuthState) => void> } = {
  oauthReturn: { inProgress: false },
  listeners: [],
  on(_event: string, listener: (state: OAuthState) => void) {
    mockUserService.listeners.push(listener);
  }
};

jest.mock('../../src/nodes/std-library/user/userservice', () => ({
  __esModule: true,
  default: {
    get instance() {
      return mockUserService;
    }
  }
}));

jest.mock('@noodl/runtime', () => ({
  __esModule: true,
  default: { instance: { getMetaData: () => undefined } }
}));

import type { NodeModule } from '@noodl/types';

import { createCorpusGraph, type CorpusGraph } from '../../../noodl-runtime/test/corpus/graph-harness';
import Node = require('../../../noodl-runtime/src/node');

import SignInWithModule from '../../src/nodes/std-library/user/signinwith';

const hits: string[] = [];
const ProbeModule = {
  node: {
    name: 'MountPulseProbe',
    category: 'Test',
    inputs: {
      failed: { type: 'signal', displayName: 'Failed', valueChangedToTrue: () => hits.push('failure') },
      done: { type: 'signal', displayName: 'Done', valueChangedToTrue: () => hits.push('done') }
    }
  }
} as unknown as NodeModule;

/** A page with Sign In With's Failure and Done wired into the probe: nodescope makes both nodes, then the two wires. */
async function page(): Promise<CorpusGraph> {
  const graph = await createCorpusGraph({
    modules: [SignInWithModule as NodeModule, ProbeModule],
    data: {
      components: [
        {
          name: '/root',
          nodes: [
            { id: 'signin', type: 'net.noodl.user.SignInWith', parameters: { provider: 'google' } },
            { id: 'probe', type: 'MountPulseProbe', parameters: {} }
          ],
          connections: [
            { sourceId: 'signin', sourcePort: 'failure', targetId: 'probe', targetPort: 'failed' },
            { sourceId: 'signin', sourcePort: 'done', targetId: 'probe', targetPort: 'done' }
          ]
        }
      ]
    } as never
  });
  await graph.settle(2);
  return graph;
}

const CANCELLED = 'Sign-in was not completed: access_denied';

beforeEach(() => {
  hits.length = 0;
  mockUserService.listeners = [];
  // what consumeAuthReturn leaves when the person pressed Cancel at the provider: settled, announced a tick later
  mockUserService.oauthReturn = { inProgress: false, succeeded: false, error: CANCELLED };
});

test('a provider error settled before the node is made reaches the wired Failure once, and its announcement adds none', async () => {
  const graph = await page();
  expect(hits).toEqual(['failure']);
  expect(graph.node('signin').getOutput('error').value).toBe(CANCELLED);
  expect(graph.errors.map((e) => e.code)).toEqual(['user/sign-in-with-failed']);

  mockUserService.listeners.forEach((l) => l(mockUserService.oauthReturn));
  await graph.settle(2);
  expect(hits).toEqual(['failure']);
  expect(graph.errors).toHaveLength(1);
});

test('(control) with the late-wire replay off, the same page gets no Failure', async () => {
  const proto = Node.prototype as unknown as {
    connectInput: (this: unknown, input: string, source: { _signalsSentThisUpdate: Record<string, boolean> }, port: string) => void;
  };
  const original = proto.connectInput;
  proto.connectInput = function (input, source, port) {
    source._signalsSentThisUpdate = {};
    return original.call(this, input, source, port);
  };
  try {
    const graph = await page();
    expect(graph.errors.map((e) => e.code)).toEqual(['user/sign-in-with-failed']);
    expect(hits).toEqual([]);
  } finally {
    proto.connectInput = original;
  }
});
