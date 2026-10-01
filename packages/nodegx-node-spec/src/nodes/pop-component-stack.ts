/**
 * Pop Component Stack (`PageStackNavigateBack`) — read from
 * `packages/noodl-viewer-react/src/nodes/navigation/navigate-back.ts` on 2026-10-01 (NSP-015 s18).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: `Navigate` and every `backAction-<name>` signal are presses of one
 * action (:43-50, :180-183), each with its own outcome; all the presses of a frame are answered at the
 * frame's end (:101-121), in press order, by one POP each (:135-169) — so two presses in a frame pop
 * twice, and the stack tells the second what it tells a pop while it is still animating (world.ts STACK:
 * the n-th pop's answer is the script's). A pop:
 *   - takes the back action — the LAST `backAction-<name>` pressed since the last pop, as its full port
 *     name (`backAction-Save`) — and clears it, whether or not anything is popped (:143-144), so only the
 *     first pop of a frame carries one;
 *   - with no stack to pop — the node does not sit in a page a Component Stack pushed (no back callback,
 *     :146-152) — is Failure `pop-component-stack/no-stack-in-scope`, Error "No Component Stack to pop …";
 *   - otherwise hands the stack `{ backAction, results }` (:154-157; `results` is every `result-<name>`
 *     value written so far, by name — the Results parameter only decides which ports the editor draws)
 *     and answers with what the stack returns: Done (`{ ok: true }`, :168), Unchanged (the stack is at its
 *     first page, :164) or Failure with the stack's code and message (still animating, :165).
 * Failure sets Error first (:170-176); Error keeps its last message — nothing clears it.
 * The `result-<name>` and `backAction-<name>` ports are what the editor draws from Results and Back
 * Actions, split on `,`, untrimmed (:211-250), and any such name is registered on first write (:184-200);
 * a result is stored raw (:177-179).
 */

import { defineNode, type InputDecl, type ValueInputDecl } from '../spec';

type Rec = Readonly<Record<string, unknown>>;

const NO_STACK = 'No Component Stack to pop — this node only works inside a component that a Component Stack pushed';

type State = {
  /** :57-59 `_internal.results` — the Results parameter, kept and never read */
  results: unknown;
  /** :67-69 `_internal.backActions` — likewise */
  backActions: unknown;
  /** :98 `_internal.resultValues` — the `result-` values by name */
  resultValues: Rec;
  /** `_internal.backAction` — the last back action pressed, as its port name */
  backAction: string | undefined;
  /** `_internal.lastError` */
  error: string | undefined;
  /** :107-108 `pendingOutcomes` — the port of each press this frame, in press order */
  pending: readonly string[];
};

// :184-200 `registerInputIfNeeded`
const resultPort = (): ValueInputDecl => ({ type: '*', coerce: 'none', group: 'Results', examples: ['x', 2, '', null, { a: 1 }] });
const backActionPort = (name: string): InputDecl => ({ type: 'signal', outcome: true, displayName: name, group: 'Back Actions', description: 'Closes this component with the back action ' + name });

function discover(port: string): InputDecl | undefined {
  if (port.startsWith('result-')) return resultPort();
  if (port.startsWith('backAction-')) return backActionPort(port.slice('backAction-'.length));
  return undefined;
}

const TRANSITIONING = { failure: { code: 'pop-component-stack/transition-in-progress', message: 'Ignored — the Component Stack is still animating the previous navigation' } } as const;

export const PopComponentStack = defineNode({
  type: 'PageStackNavigateBack',
  version: 1,
  source: 'packages/noodl-viewer-react/src/nodes/navigation/navigate-back.ts',
  needs: ['stack'],
  worldPool: {
    stacks: [{}, { back: 'done' }, { back: ['done', TRANSITIONING] }, { back: 'unchanged' }, { back: TRANSITIONING }, { back: ['done', 'done', 'unchanged'] }]
  },

  // :97-99 initialize
  state: { results: undefined, backActions: undefined, resultValues: {}, backAction: undefined, error: undefined, pending: [] } as State,
  // :77-86 outcomeOutputs({ done, unchanged, failure })
  outcomes: ['done', 'unchanged', 'failure'],

  inputs: {
    // :43-50
    navigate: { type: 'signal', outcome: true, displayName: 'Navigate', group: 'Actions', description: 'Pops the enclosing Component Stack back to the component underneath' },
    // :51-60 — a parameter (allowEditOnly), stored and never read
    results: {
      type: 'stringlist',
      coerce: 'none',
      editOnly: true,
      displayName: 'Results',
      group: 'Results',
      description: 'Names of values to hand back to the node that pushed this component, one input port each',
      examples: ['x', 'x,y', 'a, b', '']
    },
    // :61-70 — likewise
    backActions: {
      type: 'stringlist',
      coerce: 'none',
      editOnly: true,
      displayName: 'Back Actions',
      group: 'Back Actions',
      description: 'Names of the ways this component can be closed, one signal input each; the matching signal fires on the node that pushed it',
      examples: ['Save', 'Save,Cancel', '']
    }
  },

  outputs: {
    // :87-95
    error: { type: 'string', from: (s) => s.error, displayName: 'Error', group: 'Error', description: 'Why the stack did not pop, set just before Failure fires' }
  }
}).on(
  {
    results: (_s, v) => ({ set: { results: v }, send: [] }),
    backActions: (_s, v) => ({ set: { backActions: v }, send: [] }),
    // :43-50, :101-121 — answered at the frame's end
    navigate: (s) => ({ set: { pending: [...s.pending, 'navigate'] }, send: [], outcome: 'deferred' })
  },
  {
    // :101-121 — one pop per press, in press order (:118)
    afterInputs: (s, _inputs, world) => {
      if (s.pending.length === 0) return { send: [] };
      const outcomes: Array<{ port: string; outcome: 'done' | 'unchanged' | 'failure'; error?: string }> = [];
      const back: Array<{ action: unknown; results: unknown }> = [];
      let error = s.error;
      s.pending.forEach((port, i) => {
        const action = i === 0 ? s.backAction : undefined; // :143-144 — taken and cleared by the first pop
        const answer = world.backAnswer(back.length);
        if (answer === undefined) {
          error = NO_STACK; // :146-152
          outcomes.push({ port, outcome: 'failure', error: 'pop-component-stack/no-stack-in-scope' });
          return;
        }
        back.push({ action, results: s.resultValues }); // :154-157
        if (answer === 'done') outcomes.push({ port, outcome: 'done' }); // :168
        else if (answer === 'unchanged') outcomes.push({ port, outcome: 'unchanged' }); // :164
        else {
          error = answer.failure.message; // :165, :170-176
          outcomes.push({ port, outcome: 'failure', error: answer.failure.code });
        }
      });
      const failed = outcomes.some((o) => o.outcome === 'failure');
      return { set: { pending: [], backAction: undefined, error }, send: failed ? ['error'] : [], back, outcomes };
    },
    derived: {
      // :211-250 `_updatePorts` — one `result-` per Results name, one `backAction-` signal per Back Actions name
      inputs: (params) => {
        const ports: Record<string, InputDecl> = {};
        if (params.results) for (const p of String(params.results).split(',')) ports['result-' + p] = resultPort();
        if (params.backActions) for (const p of String(params.backActions).split(',')) ports['backAction-' + p] = backActionPort(p);
        return ports;
      },
      // :177-179 — stored raw under the name after the prefix
      on: (s, port, value) => ({ set: { resultValues: { ...s.resultValues, [port.slice('result-'.length)]: value } }, send: [] }),
      // :180-183 — the back action is the PORT's name; a press like Navigate's
      signal: (s, port) => ({ set: { backAction: port, pending: [...s.pending, port] }, send: [], outcome: 'deferred' }),
      discover,
      candidates: ['result-x', 'result-y', 'backAction-Save', 'backAction-Cancel']
    }
  }
);
