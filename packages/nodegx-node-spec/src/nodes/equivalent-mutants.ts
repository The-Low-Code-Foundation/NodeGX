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
/** NSP-016 s41 — the Slider's Value Percent: a sibling whose example stored -0 unsent, handed to a branch that kept 0. */
const SILENT_NEGATIVE_ZERO = 'a Value Percent of -0 stored where 0 was, unsent (`0 !== -0` is false): `!percent` reads both as falsy and every later send of the output follows a recompute that stores the value it sends, so the -0 is never read';
const PLACED_OFF_PAGE = 'a placing on a node placed off the page: its set holds only the page syncs, which nothing reads before the frame end repaints them';

/** NSP-016 s43 — the Text: a patch handed a twin's example that writes only what the state already holds. */
// NSP-023 s46 — the Slider v2: an act's paint on the page, or a mount, that found no word of the graph's waiting (`pending` false —
// a word waiting is drawn by that paint, and the branch would set it), handed its twin's example, which clears the word: it writes
// `pending: false` where it is false already, and keeps this branch's handle (a swap keeps the page's syncs)
const NO_WORD_WAITING = "an act's paint or a mount on the page that found no graph's word waiting, handed the patch of its twin that drew one: it clears a word that is already clear, and the handle is this branch's (a swap keeps the page's syncs)";
const ALREADY_HELD = (what: string) => `${what}: the twin's example writes a value this branch's state already holds, so the state is the same after either`;

export const EQUIVALENT_MUTANTS: Readonly<Record<string, EquivalentMutant[]>> = Object.freeze({
  Text: [
    // a Space that lifts an element that ALREADY holds the keyboard, handed the twin that also took it: `elementFocused` true over true
    { reducer: 'person.key', kind: 'swap-branch', branch: '"set":["inZone","input","isLifted","phase"],"emit":["pickedUp"]', swappedWith: '"set":["elementFocused","inZone","input","isLifted","phase"],"emit":["pickedUp"]', why: ALREADY_HELD('a Space lift of an element that holds the keyboard') },
    // a keyboard cancel outside any zone, handed the in-zone twin: Drag Over false over false, and its send meets a wire already false
    { reducer: 'person.key', kind: 'swap-branch', branch: '"set":["inZone","input","isLifted","phase"],"emit":["dragCancelled"]', swappedWith: '"set":["inZone","input","isDropTarget","isLifted","phase"],"emit":["dragCancelled"]', why: ALREADY_HELD('a cancel outside a zone (Drag Over is false, and was sent false)') },
    // a click that meets nothing (hidden, no swallow waiting), handed the click a waiting swallow ate: `swallow` false over false
    { reducer: 'person.click', kind: 'swap-branch', branch: '"set":[],"emit":[]', swappedWith: '"set":["swallow"],"emit":[]', why: ALREADY_HELD('a click that meets nothing and finds no swallow waiting') },
    // a blur on an element that does not hold the keyboard, handed the blur that gave it up: `elementFocused` false over false
    { reducer: 'person.blur', kind: 'swap-branch', branch: '"set":[],"emit":[]', swappedWith: '"set":["elementFocused"],"emit":[]', why: ALREADY_HELD('a blur of an element that does not hold the keyboard') },
    // a click on a Draggable element starts a pending mouse gesture and its release ends it: phase idle → pending → idle. Dropped,
    // or handed a twin that moves no gesture, the state after the click is the same
    { reducer: 'person.click', kind: 'drop-set', branch: '"set":["inZone","input","phase"],"emit":["pointerDown","pointerUp","onClick"]', why: 'a click whose press starts a pending gesture and whose release ends it: the gesture is idle before and after, so a click that moves none leaves the same state' },
    { reducer: 'person.click', kind: 'swap-branch', branch: '"set":["inZone","input","phase"],"emit":["pointerDown","pointerUp","onClick"]', swappedWith: '"set":[],"emit":["pointerDown","pointerUp","onClick"]', why: 'as the drop-set above: the gesture is idle before and after the click' },
    { reducer: 'person.click', kind: 'swap-branch', branch: '"set":["elementFocused","inZone","input","phase"],"emit":["pointerDown","pointerUp","onClick"]', swappedWith: '"set":["elementFocused"],"emit":["pointerDown","pointerUp","onClick"]', why: 'a click that takes the keyboard and starts and ends a pending gesture, handed the twin that only takes the keyboard: the gesture is idle before and after' },
    // s44: the same two twins over its own zone — a Space lift into the zone of an element that already holds the keyboard; a keyboard
    // cancel outside any zone handed the twin that also took the keyboard back and left a zone (Drag Over false over false)
    { reducer: 'person.key', kind: 'swap-branch', branch: '"set":["inZone","input","isDropTarget","isLifted","phase"],"emit":["pickedUp"]', swappedWith: '"set":["elementFocused","inZone","input","isDropTarget","isLifted","phase"],"emit":["pickedUp"]', why: ALREADY_HELD('a Space lift into its own zone of an element that holds the keyboard') },
    { reducer: 'person.key', kind: 'swap-branch', branch: '"set":["elementFocused","inZone","input","isLifted","phase"],"emit":["dragCancelled"]', swappedWith: '"set":["elementFocused","inZone","input","isDropTarget","isLifted","phase"],"emit":["dragCancelled"]', why: ALREADY_HELD('a cancel outside a zone that takes the keyboard back (Drag Over is false, and was sent false)') },
    // s44: a plain unmount, handed the unmount whose frame start also found the chain's element. Its example puts the attributes on
    // element 1 with the chain at 0: a plain unmount's chain is already 0 (an element on the page with a chain waiting takes it at
    // the frame start), and element 1 — the first made — is at any unmount the one leaving or one already gone; every element after
    // it is a later one. The five-remount scenario kills the swap for any later element's number.
    { reducer: 'afterInputs', kind: 'swap-branch', branch: '"set":["elementFocused","onPage"],"emit":["willUnmount"]', swappedWith: '"set":["attrsOn","chain","elementFocused","onPage"],"emit":["willUnmount"]', why: 'a plain unmount handed the twin that put the attributes on element 1 with the chain at 0: the chain is 0 already, and element 1 is leaving or gone — no later element is element 1' }
  ],
  'net.noodl.controls.button': [
    { reducer: 'world.place', kind: 'drop-set', branch: '"set":[],"emit":[]', why: PLACED_OFF_PAGE },
    ...['hover', 'leave', 'touch', 'lift'].map((act) => ({ reducer: `person.${act}`, kind: 'drop-set' as const, branch: '"set":[],"emit":[]', why: ACT_OFF_PAGE }))
  ],
  'net.noodl.controls.checkbox': [
    { reducer: 'world.place', kind: 'drop-set', branch: '"set":[],"emit":[]', why: PLACED_OFF_PAGE },
    ...['hover', 'leave', 'touch', 'lift'].map((act) => ({ reducer: `person.${act}`, kind: 'drop-set' as const, branch: '"set":[],"emit":[]', why: ACT_OFF_PAGE }))
    // (v2, NSP-023 s45: Enable Label rebuilds nothing — the rebuild family declared here in s37 is gone with it)
  ],
  // NSP-016 s42 — the Radio Button: the Checkbox's page model, so the Checkbox's v1 rebuild family (until NSP-023 step 5) — and a click joins it: a
  // click on a disabled button meets nothing as a press does (the Checkbox's click toggles the box, so its click never had this shape)
  'net.noodl.controls.radiobutton': [
    { reducer: 'world.place', kind: 'drop-set', branch: '"set":[],"emit":[]', why: PLACED_OFF_PAGE },
    ...['hover', 'leave', 'touch', 'lift'].map((act) => ({ reducer: `person.${act}`, kind: 'drop-set' as const, branch: '"set":[],"emit":[]', why: ACT_OFF_PAGE })),
    // a pick that changes Checked and sets nothing else (no keyboard here, no page change, the group already holding the Value — C76),
    // handed a sibling's example that also sets `elementFocused`: every pick branch that sets it sets it FALSE (a rebuild, or the
    // keyboard moving to the sibling), and in this branch it is already false — the keyboard is not on a button whose pick moved none
    { reducer: 'person.pick', kind: 'swap-branch', branch: '"set":[],"emit":["onChange"]', swappedWith: '"set":["elementFocused"],"emit":["onChange"]', why: 'every pick that sets elementFocused sets it false, and a pick that moved no keyboard finds it false already' },
    ...['press', 'release', 'focus', 'click'].flatMap((act) => [
      { reducer: `person.${act}`, kind: 'drop-set' as const, branch: '"set":["elementFocused"],"emit":[]', why: REBUILT_WHILE_DISABLED },
      { reducer: `person.${act}`, kind: 'swap-branch' as const, branch: '"set":["elementFocused"],"emit":[]', swappedWith: '"set":[],"emit":[]', why: REBUILT_WHILE_DISABLED },
      { reducer: `person.${act}`, kind: 'swap-branch' as const, branch: '"set":[],"emit":[]', swappedWith: '"set":["elementFocused"],"emit":[]', why: REBUILT_WHILE_DISABLED }
    ])
  ],
  'net.noodl.controls.textinput': [
    { reducer: 'world.place', kind: 'drop-set', branch: '"set":[],"emit":[]', why: PLACED_OFF_PAGE },
    ...['hover', 'leave', 'touch', 'lift'].map((act) => ({ reducer: `person.${act}`, kind: 'drop-set' as const, branch: '"set":[],"emit":[]', why: ACT_OFF_PAGE })),
    // a frame's end with no callback scheduled and nothing to paint writes nothing (the Button's afterInputs always syncs; this one consumes a queue only when it held something)
    { reducer: 'afterInputs', kind: 'drop-set', branch: '"set":[],"emit":[]', why: 'a frame end with nothing scheduled and nothing to paint: its set is empty, there is nothing to drop' },
    // Clear off the page with the author's Value and the output already empty: every writer of the output writes the start value with
    // it, so the start value is empty too — the three keys it writes already hold the value (text-input.ts :490-497)
    { reducer: 'clear', kind: 'drop-set', branch: '"set":["out","startValue","text","wire"],"emit":[],"outcome":"unchanged"', why: "a Clear off the page that finds the author's Value, the start value and the output already empty writes what is there (s40: the wire's copy too)" }
    // (v2, NSP-023 s45: no label rebuild; the s38 rebuild family and the drain's rebuild twins are gone with it — the Type swap
    // between Text Area and a one-line field still replaces the element, and the deep run says whether it needs any of them back)
  ],
  // NSP-016 s39 — the Dropdown: the placing off the page and the four acts that meet no element (the Button's)
  'net.noodl.controls.options': [
    { reducer: 'world.place', kind: 'drop-set', branch: '"set":[],"emit":[]', why: PLACED_OFF_PAGE },
    ...['hover', 'leave', 'touch', 'lift'].map((act) => ({ reducer: `person.${act}`, kind: 'drop-set' as const, branch: '"set":[],"emit":[]', why: ACT_OFF_PAGE }))
    // (v2, NSP-023 s45: Enable Label rebuilds nothing — the rebuild family declared here in s39 is gone with it)
  ],
  // NSP-016 s41 — the Slider: the placing off the page and the four acts that meet no element (the Button's; the 10,000 run)
  // NSP-016 s43 — Visible is a page sync now: a group placed OFF the page carries only it, as the Button's placing does
  'Radio Button Group': [{ reducer: 'world.place', kind: 'drop-set', branch: '"set":[],"emit":[]', why: PLACED_OFF_PAGE }],
  'net.noodl.controls.range': [
    { reducer: 'world.place', kind: 'drop-set', branch: '"set":[],"emit":[]', why: PLACED_OFF_PAGE },
    ...['hover', 'leave', 'touch', 'lift'].map((act) => ({ reducer: `person.${act}`, kind: 'drop-set' as const, branch: '"set":[],"emit":[]', why: ACT_OFF_PAGE })),
    // the runtime's 10,000 (20730): the sibling's recorded example stores Value Percent -0 where this branch keeps 0, unsent
    { reducer: 'person.release', kind: 'swap-branch', branch: '{"set":["onPage","pressed"],"emit":["didMount","pointerUp"],"outcome":null,"outcomes":[],"request":false}', swappedWith: '{"set":["onPage","percent","pressed"],"emit":["didMount","pointerUp"],"outcome":null,"outcomes":[],"request":false}', why: SILENT_NEGATIVE_ZERO },
    // NSP-023 s46 (v2) — the s46 mutant run at seed 13: the thirteen on-page twins of a drawn word
    { reducer: 'person.slide', kind: 'swap-branch', branch: '"set":["elementFocused","focused"],"emit":["onFocus"]', swappedWith: '"set":["elementFocused","focused","pending"],"emit":["onFocus"]', why: NO_WORD_WAITING },
    { reducer: 'afterInputs', kind: 'swap-branch', branch: '"set":["onPage"],"emit":["didMount"]', swappedWith: '"set":["onPage","pending"],"emit":["didMount"]', why: NO_WORD_WAITING },
    { reducer: 'person.hover', kind: 'swap-branch', branch: '"set":["hover"],"emit":["hoverStart"]', swappedWith: '"set":["hover","pending"],"emit":["hoverStart"]', why: NO_WORD_WAITING },
    { reducer: 'person.touch', kind: 'swap-branch', branch: '"set":["pressed"],"emit":["pointerDown"]', swappedWith: '"set":["pending","pressed"],"emit":["pointerDown"]', why: NO_WORD_WAITING },
    { reducer: 'person.lift', kind: 'swap-branch', branch: '"set":["pressed"],"emit":["pointerUp"]', swappedWith: '"set":["pending","pressed"],"emit":["pointerUp"]', why: NO_WORD_WAITING },
    { reducer: 'person.leave', kind: 'swap-branch', branch: '"set":["hover","pressed"],"emit":["hoverEnd"]', swappedWith: '"set":["hover","pending","pressed"],"emit":["hoverEnd"]', why: NO_WORD_WAITING },
    { reducer: 'person.blur', kind: 'swap-branch', branch: '"set":["elementFocused","focused"],"emit":["onBlur"]', swappedWith: '"set":["elementFocused","focused","pending"],"emit":["onBlur"]', why: NO_WORD_WAITING },
    { reducer: 'person.release', kind: 'swap-branch', branch: '"set":["pressed"],"emit":["pointerUp"]', swappedWith: '"set":["pending","pressed"],"emit":["pointerUp"]', why: NO_WORD_WAITING },
    { reducer: 'person.press', kind: 'swap-branch', branch: '"set":["elementFocused","focused","pressed"],"emit":["pointerDown","onFocus"]', swappedWith: '"set":["elementFocused","focused","pending","pressed"],"emit":["pointerDown","onFocus"]', why: NO_WORD_WAITING },
    { reducer: 'person.click', kind: 'swap-branch', branch: '"set":["elementFocused","focused","pressed"],"emit":["pointerDown","onFocus","pointerUp"]', swappedWith: '"set":["elementFocused","focused","pending","pressed"],"emit":["pointerDown","onFocus","pointerUp"]', why: NO_WORD_WAITING },
    { reducer: 'person.focus', kind: 'swap-branch', branch: '"set":["elementFocused","focused"],"emit":["onFocus"]', swappedWith: '"set":["elementFocused","focused","pending"],"emit":["onFocus"]', why: NO_WORD_WAITING },
    { reducer: 'person.click', kind: 'swap-branch', branch: '"set":["pressed"],"emit":["pointerDown","pointerUp"]', swappedWith: '"set":["pending","pressed"],"emit":["pointerDown","pointerUp"]', why: NO_WORD_WAITING },
    { reducer: 'person.press', kind: 'swap-branch', branch: '"set":["pressed"],"emit":["pointerDown"]', swappedWith: '"set":["pending","pressed"],"emit":["pointerDown"]', why: NO_WORD_WAITING },
    // the s46 runtime batch (seeds 13, 20730): the ten act-paint twins that bring the slider back with no word waiting
    { reducer: 'person.focus', kind: 'swap-branch', branch: '"set":["elementFocused","focused","onPage"],"emit":["didMount","onFocus"]', swappedWith: '"set":["elementFocused","focused","onPage","pending"],"emit":["didMount","onFocus"]', why: NO_WORD_WAITING },
    { reducer: 'person.slide', kind: 'swap-branch', branch: '"set":["elementFocused","focused","onPage"],"emit":["didMount","onFocus"]', swappedWith: '"set":["elementFocused","focused","onPage","pending"],"emit":["didMount","onFocus"]', why: NO_WORD_WAITING },
    { reducer: 'person.hover', kind: 'swap-branch', branch: '"set":["hover","onPage"],"emit":["didMount","hoverStart"]', swappedWith: '"set":["hover","onPage","pending"],"emit":["didMount","hoverStart"]', why: NO_WORD_WAITING },
    { reducer: 'person.leave', kind: 'swap-branch', branch: '"set":["hover","onPage","pressed"],"emit":["didMount","hoverEnd"]', swappedWith: '"set":["hover","onPage","pending","pressed"],"emit":["didMount","hoverEnd"]', why: NO_WORD_WAITING },
    { reducer: 'person.press', kind: 'swap-branch', branch: '"set":["elementFocused","focused","onPage","pressed"],"emit":["didMount","pointerDown","onFocus"]', swappedWith: '"set":["elementFocused","focused","onPage","pending","pressed"],"emit":["didMount","pointerDown","onFocus"]', why: NO_WORD_WAITING },
    { reducer: 'person.release', kind: 'swap-branch', branch: '"set":["onPage","pressed"],"emit":["didMount","pointerUp"]', swappedWith: '"set":["onPage","pending","pressed"],"emit":["didMount","pointerUp"]', why: NO_WORD_WAITING },
    { reducer: 'person.click', kind: 'swap-branch', branch: '"set":["elementFocused","focused","onPage","pressed"],"emit":["didMount","pointerDown","onFocus","pointerUp"]', swappedWith: '"set":["elementFocused","focused","onPage","pending","pressed"],"emit":["didMount","pointerDown","onFocus","pointerUp"]', why: NO_WORD_WAITING },
    { reducer: 'person.touch', kind: 'swap-branch', branch: '"set":["onPage","pressed"],"emit":["didMount","pointerDown"]', swappedWith: '"set":["onPage","pending","pressed"],"emit":["didMount","pointerDown"]', why: NO_WORD_WAITING },
    { reducer: 'person.lift', kind: 'swap-branch', branch: '"set":["onPage","pressed"],"emit":["didMount","pointerUp"]', swappedWith: '"set":["onPage","pending","pressed"],"emit":["didMount","pointerUp"]', why: NO_WORD_WAITING },
    { reducer: 'person.blur', kind: 'swap-branch', branch: '"set":["onPage"],"emit":["didMount"]', swappedWith: '"set":["onPage","pending"],"emit":["didMount"]', why: NO_WORD_WAITING }
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
