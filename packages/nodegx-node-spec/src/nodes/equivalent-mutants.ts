/**
 * NSP-012 — mutants a node's OWN ports cannot tell from the original (runner/conformance.ts
 * `ConformanceOptions.equivalent`): counted in every report, never listed as survivors, never
 * hidden. Two kinds:
 *
 *   - a "run scheduled" flag left set on a branch whose re-run is SILENT — Array Map has no
 *     checkbox and no input that changes a run without scheduling one, so a stuck flag re-runs a
 *     silent run silently (Array Filter's stuck flag IS killed: `Enabled` moving with its box
 *     unticked re-runs the mutant and not the original);
 *   - a value a node stores and writes onto a record or array that NO port of its own reads
 *     back — Create New Object's held properties, Set Variable's `Value` and `Set as` — graded by
 *     the graph scenarios in scenarios/graph/s*.json, where a second node reads the record.
 *
 * Kept as narrow as each row; a wider row would eat the next hole (README §9).
 */

import type { EquivalentMutant } from '../runner/conformance';

const STUCK_FLAG = 'a stuck "scheduled" flag re-runs a silent run silently: no port of this node can show it';
const WS_SAME_VALUE = 'a same-value write of URL, Protocols or Auto Connect schedules a rebuild that cannot act (the frame end finds the connection matching, or no URL, or Auto Connect off)';
const SSE_SAME_VALUE = 'a same-value write of URL or Auto Connect schedules a pass that cannot act (the connection was opened against this URL, or there is no URL, or Auto Connect is off)';
const SSE_DEAD = 'a Connect that fails inside the call leaves a dead connection (error, no transport, no timer, 0 retries); which dead one is kept is invisible — a later Connect or pass replaces it, a Disconnect sends closed / false / 0 from either';
const QR_CLEAR = 'a frame end with no reconnect scheduled, handed the patch of its twin that ran a quiet one: it clears two reconnect flags already clear';
const GRAPH = (what: string, scenario: string) => `${what} is written onto the registry and no port of this node reads it back — graded by ${scenario}`;

/**
 * NSP-016 s37 — a visual node placed OFF the page (Mounted false as a parameter): its placing only syncs the page's keys
 * (spec.ts `synced`, left out of the branch), and nothing can read a sync on an element that is not there before the
 * frame's end syncs it again. The branch is the placing's "nothing to draw"; dropping its set drops only that sync.
 */
/** The same for a pointer or a finger meeting no element (these four acts do nothing only when the node is off the page): the act's set holds only the page syncs. */
const ACT_OFF_PAGE = 'a hover, leave, touch or lift on a node off the page: its set holds only the page syncs, which nothing reads before the frame end repaints them';
const REBUILT_WHILE_DISABLED = 'a press or release on a disabled box during an Enable Label rebuild: the rebuild unfocuses the element, which no action can read while it is disabled, and the frame end that paints Enabled paints the rebuild too';
const PLACED_OFF_PAGE = 'a placing on a node placed off the page: its set holds only the page syncs, which nothing reads before the frame end repaints them';

export const EQUIVALENT_MUTANTS: Readonly<Record<string, EquivalentMutant[]>> = Object.freeze({
  'net.noodl.controls.button': [
    { reducer: 'world.place', kind: 'drop-set', branch: '"set":[],"emit":[]', why: PLACED_OFF_PAGE },
    ...['hover', 'leave', 'touch', 'lift'].map((act) => ({ reducer: `person.${act}`, kind: 'drop-set' as const, branch: '"set":[],"emit":[]', why: ACT_OFF_PAGE }))
  ],
  'net.noodl.controls.checkbox': [
    { reducer: 'world.place', kind: 'drop-set', branch: '"set":[],"emit":[]', why: PLACED_OFF_PAGE },
    ...['hover', 'leave', 'touch', 'lift'].map((act) => ({ reducer: `person.${act}`, kind: 'drop-set' as const, branch: '"set":[],"emit":[]', why: ACT_OFF_PAGE })),
    // a press, a release or a Tab onto a DISABLED box while Enable Label is changing: the act's paint rebuilds the input (the keyboard
    // leaves with the old one, `elementFocused` false) and the act itself meets nothing. Dropped or swapped with the act that
    // met nothing on a box not rebuilding, the difference is unreadable: the Focus and Blur actions read a disabled element
    // as nothing to do until the frame's end paints Enabled — and the same paint redoes the rebuild. Measured s37: the
    // runner's own mutant and the original trace the scenario "focused, then disabled; Enable Label changed and a release …"
    // identically.
    ...['press', 'release', 'focus'].flatMap((act) => [
      { reducer: `person.${act}`, kind: 'drop-set' as const, branch: '"set":["elementFocused"],"emit":[]', why: REBUILT_WHILE_DISABLED },
      { reducer: `person.${act}`, kind: 'swap-branch' as const, branch: '"set":["elementFocused"],"emit":[]', swappedWith: '"set":[],"emit":[]', why: REBUILT_WHILE_DISABLED },
      { reducer: `person.${act}`, kind: 'swap-branch' as const, branch: '"set":[],"emit":[]', swappedWith: '"set":["elementFocused"],"emit":[]', why: REBUILT_WHILE_DISABLED }
    ])
  ],
  'Map Collection': [
    { reducer: 'afterInputs', kind: 'drop-set', branch: '"set":["scheduled"],"emit":[]', why: STUCK_FLAG },
    { reducer: 'afterInputs', kind: 'swap-branch', branch: '"set":["scheduled"],"emit":[]', swappedWith: '"set":[],"emit":[]', why: STUCK_FLAG },
    { reducer: 'afterInputs', kind: 'swap-branch', branch: '"set":[],"emit":[]', swappedWith: '"set":["scheduled"],"emit":[]', why: STUCK_FLAG }
  ],
  // NSP-014 s33 — the frame end's quiet reconfigure (Enabled off, or no Class, with no subscription held): nothing to tear
  // down and nothing to open, so re-running it every frame is silent; every input that could change it schedules anyway
  // NSP-014 s35 — Query Records' frame end runs two callbacks; a branch where the reconnect was NOT scheduled handed the patch of
  // its twin where it was and did nothing (a quiet reconnect: Subscribe To Changes off, or no Class, nothing held) clears two
  // flags that are already clear. Exact shapes, both ways the pair is not: the twin handed this one's patch leaves the flag set,
  // and that IS killed (scenario "a filter the translator refuses beside a quiet reconnect …").
  DbCollection2: [
    { reducer: 'afterInputs', kind: 'swap-branch', branch: '{"set":[],"emit":[],"outcome":null,"outcomes":[],"request":false}', swappedWith: '{"set":["rtFirst","rtScheduled"],"emit":[],"outcome":null,"outcomes":[],"request":false}', why: QR_CLEAR },
    { reducer: 'afterInputs', kind: 'swap-branch', branch: '{"set":["bound","error","fetchScheduled"],"emit":["failure"],"outcome":null,"outcomes":[],"request":false}', swappedWith: '{"set":["bound","error","fetchScheduled","rtFirst","rtScheduled"],"emit":["failure"],"outcome":null,"outcomes":[],"request":false}', why: QR_CLEAR }
  ],
  SubscribeToChanges: [
    { reducer: 'afterInputs', kind: 'drop-set', branch: '"set":["scheduled"],"emit":[]', why: STUCK_FLAG },
    { reducer: 'afterInputs', kind: 'swap-branch', branch: '"set":["scheduled"],"emit":[]', swappedWith: '"set":[],"emit":[]', why: STUCK_FLAG },
    { reducer: 'afterInputs', kind: 'swap-branch', branch: '"set":[],"emit":[]', swappedWith: '"set":["scheduled"],"emit":[]', why: STUCK_FLAG }
  ],
  // NSP-014 s34 — the rebuild's flag. A write of URL, Protocols or Auto Connect that changes nothing still schedules a rebuild,
  // and that rebuild cannot act: between frames a live connection always matches the URL and protocols (both setters
  // schedule, and a connection is made from the node's config), and with none there is no URL or Auto Connect is off (both
  // setters schedule). So the flag left set, or set where it already was, re-runs a silent rebuild silently.
  'net.noodl.WebSocket': [
    { reducer: 'afterInputs', kind: 'drop-set', branch: '"set":["scheduled"],"emit":[]', why: STUCK_FLAG },
    { reducer: 'afterInputs', kind: 'swap-branch', branch: '"set":["scheduled"],"emit":[]', swappedWith: '"set":[],"emit":[]', why: STUCK_FLAG },
    { reducer: 'afterInputs', kind: 'swap-branch', branch: '"set":[],"emit":[]', swappedWith: '"set":["scheduled"],"emit":[]', why: STUCK_FLAG },
    ...(['url', 'protocols', 'autoConnect'] as const).flatMap((reducer) => [
      { reducer, kind: 'drop-set' as const, branch: '"set":["scheduled"],"emit":[]', why: WS_SAME_VALUE },
      { reducer, kind: 'swap-branch' as const, branch: '"set":["scheduled"],"emit":[]', swappedWith: '"set":[],"emit":[]', why: WS_SAME_VALUE },
      { reducer, kind: 'swap-branch' as const, branch: '"set":[],"emit":[]', swappedWith: '"set":["scheduled"],"emit":[]', why: WS_SAME_VALUE }
    ]),
    // a constructor the script refuses: the socket id the spec drew for it was never kept, so the counter is all that moved
    { reducer: 'connect', kind: 'drop-set', branch: '"set":["nextId"],"emit":["onError"],"outcome":"failure"', why: 'the spec\'s own id counter is all the branch moves (the refused socket was never kept); ids are not on the wire' },
    // Heartbeat Interval written blank again on a live connection: the connection's copy goes 0 → NaN, and both mean "no heartbeat"
    ...(['drop-set', 'swap-branch'] as const).map((kind) => ({
      reducer: 'heartbeatInterval',
      kind,
      branch: '"set":["conn"],"emit":[]',
      ...(kind === 'swap-branch' ? { swappedWith: '"set":[],"emit":[]' } : {}),
      why: 'the live connection keeps 0 where the original holds NaN — both start no heartbeat (`!interval`), and the next blank write restarts it either way (NaN !== 0, NaN !== NaN); the swap is to the branch that sets nothing, the same drop'
    }))
  ],
  // NSP-014 s34 — Server-Sent Events. The frame end's pass and a same-value URL / Auto Connect write as WebSocket's (between
  // frames a live connection was opened against the URL; with none there is no URL or Auto Connect is off). Two inputs no play
  // can observe. And a Connect that fails inside the call (no URL, an EventSource) leaves a DEAD connection — state error, no
  // transport, no timer, 0 retries — so which dead one the node keeps is invisible: a later Connect or pass replaces it, and a
  // Disconnect on either sends `closed`, false, 0. (A swap that also moves `connectedUrl` is killed by a scenario.)
  'net.noodl.SSE': [
    { reducer: 'afterInputs', kind: 'drop-set', branch: '"set":["scheduled"],"emit":[]', why: STUCK_FLAG },
    { reducer: 'afterInputs', kind: 'swap-branch', branch: '"set":["scheduled"],"emit":[]', swappedWith: '"set":[],"emit":[]', why: STUCK_FLAG },
    { reducer: 'afterInputs', kind: 'swap-branch', branch: '"set":[],"emit":[]', swappedWith: '"set":["scheduled"],"emit":[]', why: STUCK_FLAG },
    ...(['url', 'autoConnect'] as const).flatMap((reducer) => [
      { reducer, kind: 'drop-set' as const, branch: '"set":["scheduled"],"emit":[]', why: SSE_SAME_VALUE },
      { reducer, kind: 'swap-branch' as const, branch: '"set":["scheduled"],"emit":[]', swappedWith: '"set":[],"emit":[]', why: SSE_SAME_VALUE },
      { reducer, kind: 'swap-branch' as const, branch: '"set":[],"emit":[]', swappedWith: '"set":["scheduled"],"emit":[]', why: SSE_SAME_VALUE }
    ]),
    { reducer: 'eventTypes', why: 'Event Types reaches only the EventSource transport (conn :328-334), which no play has (world.ts SOCKET, last line)' },
    { reducer: 'withCredentials', why: "With Credentials is a fetch init's `credentials` (conn :459), which the world's request record does not carry — the world's server is on no other origin" },
    { reducer: 'connect', kind: 'drop-set', branch: '"set":["conn"],"emit":["onError","onClose"],"outcome":"failure"', why: SSE_DEAD },
    ...([
      ['"set":[],"emit":["onError","onClose"],"outcome":"failure"', '"set":["conn","connectionState"],"emit"'],
      ['"set":[],"emit":["onError","onClose"],"outcome":"failure"', '"set":["conn"],"emit"'],
      ['"set":["conn","connectionState"],"emit":["onError","onClose"],"outcome":"failure"', '"set":["conn"],"emit"'],
      ['"set":["conn"],"emit":["onError","onClose"],"outcome":"failure"', '"set":[],"emit"'],
      ['"set":["conn"],"emit":["onError","onClose"],"outcome":"failure"', '"set":["conn","connectionState"],"emit"']
    ] as const).map(([branch, swappedWith]) => ({ reducer: 'connect', kind: 'swap-branch' as const, branch, swappedWith, why: SSE_DEAD }))
  ],
  // NSP-014 s23 — the frame end's two quiet branches: no job, and a bind of a node already bound to nothing. Each sibling's
  // example writes what the state already holds (`jobs: []` on an empty list; `bound: undefined` on an unbound node).
  DbModel2: [
    { reducer: 'afterInputs', kind: 'swap-branch', branch: '"set":[],"emit":[]', swappedWith: '"set":["jobs"],"emit":[]', why: 'the sibling writes `jobs: []` on a frame end whose job list is already empty' },
    { reducer: 'afterInputs', kind: 'swap-branch', branch: '"set":["jobs"],"emit":[]', swappedWith: '"set":["bound","jobs"],"emit":[]', why: 'the sibling (an unbind) writes `bound: undefined` on a node already bound to nothing — the branch is that same unbind' }
  ],
  Model2: [
    {
      reducer: 'afterInputs',
      kind: 'drop-set',
      why:
        "the frame end's bookkeeping left uncleared (jobs, dirty keys, the store flag, the Fetch tokens): the writes the frame did are registry side effects the mutant keeps, and re-running them is silent — " +
        'a store of what the record already holds notifies nothing. Only the Fetch tokens tell, re-reported at the NEXT settle and refused by the interpreter, so a sequence ending at that settle cannot show it (killed by any longer one; scenarios/Model2.json pins the common shape)'
    }
  ],
  NewModel: [
    { reducer: 'derived', why: GRAPH('a held property value or type', 'scenarios/graph/s03-create-new-object-then-read.json') }
  ],
  SetModelProperties: [
    { reducer: 'derived', why: GRAPH('a held property value or type', 'scenarios/graph/s04-set-object-properties-then-read.json') }
  ],
  'Set Variable': [
    { reducer: 'derived', why: GRAPH('the Value to write', 'scenarios/graph/s02-set-variable-then-read.json') },
    { reducer: 'setWith', kind: 'drop-set', why: GRAPH('the Set as choice', 'scenarios/graph/s02-set-variable-then-read.json') }
  ],
  // NSP-013
  'net.noodl.DateParts': [
    {
      reducer: 'input',
      kind: 'drop-set',
      branch: '"set":["input","inputSupplied"],"emit":["failure"]',
      why: 'an unreadable Date stores nothing a later read sees: every part reads as nothing (never sent, so the wire keeps the last readable part) and the next arrival stores afresh before anything reads'
    },
    {
      reducer: 'input',
      kind: 'drop-set',
      branch: '"set":["input","inputSupplied"],"emit":[]',
      why: 'an unsupplied Date (undefined, null, "") stores nothing a later read sees: nothing is sent, and the next arrival stores afresh before anything reads'
    }
  ],
  'net.noodl.ParseCSV': [{ reducer: 'afterInputs', kind: 'drop-set', branch: '"set":["scheduled"],"emit":[]', why: STUCK_FLAG + ' (nothing on CSV yet, or nothing due)' }],
  'net.noodl.ParseXML': [{ reducer: 'afterInputs', kind: 'drop-set', branch: '"set":["scheduled"],"emit":[]', why: STUCK_FLAG + ' (nothing on XML yet, nothing due, or the Always Array that throws)' }],
  'net.noodl.ParseFeed': [{ reducer: 'afterInputs', kind: 'drop-set', branch: '"set":["scheduled"],"emit":[]', why: STUCK_FLAG + ' (nothing on Feed yet, or nothing due)' }],
  'net.noodl.ToCSV': [{ reducer: 'afterInputs', kind: 'drop-set', branch: '"set":["scheduled"],"emit":[]', why: STUCK_FLAG + ' (nothing on Items yet, or nothing due)' }],
  CollectionClear: [
    {
      reducer: 'afterInputs',
      kind: 'swap-branch',
      branch: '"set":["clears"],"emit":[],"outcome":null,"outcomes":["clear:failure"]',
      swappedWith: '"set":["clears","error"]',
      why: 'the two no-array failure branches differ only in whether Error is written, and the one that writes it writes the same constant sentence (collection-failure.ts :149-157) the other branch already holds — found by a 20-seed sweep (NSP-013 s12, T4)'
    }
  ],
  'net.noodl.StreamBuffer': [
    {
      reducer: 'clear',
      kind: 'drop-set',
      branch: '"outcome":"unchanged"',
      why: 'a Clear with nothing to clear writes the reset values every key already holds (stream-buffer.ts :346-350; the timer is only armed while something is buffered, :300)'
    }
  ],
  'net.noodl.TextAccumulator': [
    {
      reducer: 'clear',
      kind: 'drop-set',
      branch: '"outcome":"unchanged"',
      why: 'a Clear with nothing to clear writes the reset values every key already holds (text-accumulator.ts :448-453 — Last Message is only ever set beside a non-empty Messages, which Max Messages > 0 never empties)'
    }
  ],
  // NSP-013 s14
  States: [
    {
      reducer: 'afterInputs',
      kind: 'drop-set',
      why:
        "the frame end sends every output where the runtime flags it (`world.send` from its working copy, node.ts :832-835), so the frame's observations stand without its `set`; only the NEXT settle shows the state it failed to keep — the queue re-run, the move undone. A sequence ending at that settle cannot show it, and the branch keys are combinations of state names, so which branches end a sequence moves with the seed (seed 13: 1, seed 20727: 9). As Model2's frame end; every hand scenario settles again after its moves, and a frame end reached there is killed"
    }
  ],
  // NSP-015 s20 — Close Popup likewise (closepopup.ts :102-121): Results and Close Actions decide only which ports the
  // EDITOR draws; a `result-` / `closeAction-` port works whatever they say
  NavigationClosePopup: [
    { reducer: 'results', kind: 'drop-set', branch: '"set":["results"],"emit":[]', why: 'Results is stored and never read: it names the ports the editor draws, nothing more' },
    { reducer: 'closeActions', kind: 'drop-set', branch: '"set":["closeActions"],"emit":[]', why: 'Close Actions is stored and never read: it names the ports the editor draws, nothing more' }
  ],
  // NSP-015 s18 — Pop Component Stack keeps its two parameters and never reads them (navigate-back.ts :57-59, :67-69):
  // they decide only which ports the EDITOR draws; a `result-` / `backAction-` port works whatever they say
  PageStackNavigateBack: [
    { reducer: 'results', kind: 'drop-set', branch: '"set":["results"],"emit":[]', why: 'Results is stored and never read: it names the ports the editor draws, nothing more' },
    { reducer: 'backActions', kind: 'drop-set', branch: '"set":["backActions"],"emit":[]', why: 'Back Actions is stored and never read: it names the ports the editor draws, nothing more' },
    {
      reducer: 'afterInputs',
      kind: 'drop-set',
      branch: '"set":["backAction","error","pending"]',
      why:
        "the frame end's outcomes and pops stand without its `set`; only the NEXT settle shows the presses it failed to take (they pop again). A sequence ending at that settle cannot show it, and the branch keys are combinations of press ports and answers, so which branches end a sequence moves with the seed — States' frame end exactly. Every hand scenario with two presses in a frame settles again after it, and a frame end reached there is killed"
    }
  ],
  // NSP-014 s28 — Request Magic Link clears Error on a Done (requestmagiclink.ts :158-159) with `undefined`, which a node
  // never SENDS (node.ts :820-822, CONTRACT C3), and the runtime does not dedup a repeated send: a later failure sends its
  // message whether or not the clear happened. Row D25 is exactly this — the clear never reaches the wire.
  'net.noodl.user.RequestMagicLink': [
    { reducer: 'world.backend', kind: 'drop-set', branch: '"set":["error"],"emit":[],"outcome":null,"outcomes":["send:done"]', why: 'the clear is `undefined`, never sent (C3; row D25), and no later send depends on it' }
  ],
});
