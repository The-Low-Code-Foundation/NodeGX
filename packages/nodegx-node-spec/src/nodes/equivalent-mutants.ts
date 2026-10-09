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
/** NSP-016 s57 — the Page Router. */
const ROUTER_PLACED_OFF_PAGE = 'a Page Router placed off the page: its placing does nothing — the set it drops is the state it was handed';
const ROUTER_REFUSED_AT_TIMER =
  "a navigate the router answers at the handler's millisecond without a build (refused, Unchanged, a new tab): its set spends the handed tag (never asked for again) and leaves the queue freeing (`hops`), which the advance's yield — asked for by the same patch — frees before the clock moves; no other request reaches the router in between";
const PLACED_OFF_PAGE = 'a placing on a node placed off the page: its set holds only the page syncs, which nothing reads before the frame end repaints them';

/** NSP-016 s43 — the Text: a patch handed a twin's example that writes only what the state already holds. */
// P109 ISL-031 (the Slider v3) — a frame's end or an act on a slider off the page: the paint off the page writes only the page syncs
// (Enabled, Visible), which nothing reads while there is no element; the paint that puts the slider back writes them again
const SLIDER_OFF_PAGE = "a frame's end or an act on a slider off the page: its set holds only the page syncs, which nothing reads while there is no element, and the paint that mounts it writes them again";
const ALREADY_HELD = (what: string) => `${what}: the twin's example writes a value this branch's state already holds, so the state is the same after either`;

/** NSP-016 s43 … s51 — the Text's rows (text.ts): patches handed a twin's example that writes only what the state already holds. */
const TEXT: EquivalentMutant[] = [
    // NSP-016 s51, the zone side — a card's carry ended outside the zone (a cancel, a drop over nothing), handed the twin that also
    // left the zone: Drag Over and the zone go false where they are false (they move together), and the send meets a wire already false
    { reducer: 'person.key', kind: 'swap-branch', branch: '"set":["carry","carryBy"],"emit":[]', swappedWith: '"set":["carry","carryBy","inZone","isDropTarget"],"emit":[]', why: ALREADY_HELD("a card's carry ended outside a zone (Drag Over is false, and was sent false)") },
    // a click the swallow ate, and the twin that also started and ended a pending press of its own: the gesture is idle before and after
    { reducer: 'person.release', kind: 'swap-branch', branch: '"set":["carry","carryBy","swallow"],"emit":[]', swappedWith: '"set":["carry","carryBy","inZone","isDropTarget","swallow"],"emit":[]', why: ALREADY_HELD("a card let go outside a zone (Drag Over is false, and was sent false)") },
    // a Space that lifts an element that ALREADY holds the keyboard, handed the twin that also took it: `focusedElem` the element's over the element's
    { reducer: 'person.key', kind: 'swap-branch', branch: '"set":["inZone","input","isLifted","phase"],"emit":["pickedUp"]', swappedWith: '"set":["cardFocused","focusedElem","inZone","input","isLifted","phase"],"emit":["pickedUp"]', why: ALREADY_HELD('a Space lift of an element that holds the keyboard') },
    // a keyboard cancel outside any zone, handed the in-zone twin: Drag Over false over false, and its send meets a wire already false
    { reducer: 'person.key', kind: 'swap-branch', branch: '"set":["inZone","input","isLifted","phase"],"emit":["dragCancelled"]', swappedWith: '"set":["inZone","input","isDropTarget","isLifted","phase"],"emit":["dragCancelled"]', why: ALREADY_HELD('a cancel outside a zone (Drag Over is false, and was sent false)') },
    // a click that meets nothing (hidden, no swallow waiting), handed the click a waiting swallow ate: `swallow` false over false
    { reducer: 'person.click', kind: 'swap-branch', branch: '"set":[],"emit":[]', swappedWith: '"set":["swallow"],"emit":[]', why: ALREADY_HELD('a click that meets nothing and finds no swallow waiting') },
    // a blur on an element that does not hold the keyboard, handed the blur that gave it up: `focusedElem` none over none
    { reducer: 'person.blur', kind: 'swap-branch', branch: '"set":[],"emit":[]', swappedWith: '"set":["focusedElem"],"emit":[]', why: ALREADY_HELD('a blur of an element that does not hold the keyboard') },
    // a click on a Draggable element starts a pending mouse gesture and its release ends it: phase idle → pending → idle. Dropped,
    // or handed a twin that moves no gesture, the state after the click is the same
    // s44: the same two twins over its own zone — a Space lift into the zone of an element that already holds the keyboard; a keyboard
    // cancel outside any zone handed the twin that also took the keyboard back and left a zone (Drag Over false over false)
    { reducer: 'person.key', kind: 'swap-branch', branch: '"set":["inZone","input","isDropTarget","isLifted","phase"],"emit":["pickedUp"]', swappedWith: '"set":["cardFocused","focusedElem","inZone","input","isDropTarget","isLifted","phase"],"emit":["pickedUp"]', why: ALREADY_HELD('a Space lift into its own zone of an element that holds the keyboard') },
    { reducer: 'person.key', kind: 'swap-branch', branch: '"set":["cardFocused","focusedElem","inZone","input","isLifted","phase"],"emit":["dragCancelled"]', swappedWith: '"set":["cardFocused","focusedElem","inZone","input","isDropTarget","isLifted","phase"],"emit":["dragCancelled"]', why: ALREADY_HELD('a cancel outside a zone that takes the keyboard back (Drag Over is false, and was sent false)') },
    // s50, from the 10,000 run (seed 20731): a leave or a let go with no drag whose paint takes the element away, handed the one that
    // also ends a drag over nothing of this node's. P109 s29 (C81): the paint clears the count on both, so the count's element the twin
    // writes is never read (an enter reads it only beside a count above 0), and the files and the target are none already. (s50's
    // other rows here — a drop with Is Dragging Over already false, a leave writing the files or the target alone — went with
    // write-always: every file act through `dragTo` now writes the target, the count, its element and Is Dragging Over.)
    ...['fileLeave', 'fileDrop'].map((act) => ({ reducer: `person.${act}`, kind: 'swap-branch' as const, branch: '"set":["dragDepth","isDragOver"],"emit":["willUnmount"]', swappedWith: '"set":["depthOn","dragDepth","fileCarry","fileOn","isDragOver"],"emit":["willUnmount"]', why: ALREADY_HELD(`a ${act === 'fileDrop' ? 'let go' : 'leave'} with no drag whose paint takes the element away (no files, no target)`) })),
    // a click on an element its paint makes: a press that starts a pending gesture and a release that ends it, or neither — the
    // gesture is idle before and after (the s43 pair above, with the mount paint)
    // NSP-016 s51 — the zone side's clicks: the twins differ only in what a click leaves as it found (the gesture's start and end)
    // and a source element no reader reaches before the next press writes it
    // a key that ends a card's carry outside a zone and takes the keyboard, handed the twin that also left the zone: false over false
    { reducer: 'person.key', kind: 'swap-branch', branch: '"set":["cardFocused","carry","carryBy","focusedElem"],"emit":[]', swappedWith: '"set":["cardFocused","carry","carryBy","focusedElem","inZone","isDropTarget"],"emit":[]', why: ALREADY_HELD("a card's carry ended outside a zone by a key that takes the keyboard (Drag Over is false, and was sent false)") },
    // s30 (P109 ISL-031, C78): an arrow that walks a carried card into the Text while the Text already holds the keyboard, handed
    // the twin whose key act also put the keyboard on it — `focusedElem` the element's over the element's, `cardFocused` -1 over -1
    { reducer: 'person.key', kind: 'swap-branch', branch: '"set":["inZone","isDropTarget"],"emit":[]', swappedWith: '"set":["cardFocused","focusedElem","inZone","isDropTarget"],"emit":[]', why: ALREADY_HELD('an arrow that walks a carried card into it while it already holds the keyboard') },
    // P109 s31 (C77): a leave or a let go with no drag from the desktop whose paint MOUNTS the element, handed the twin that also ends
    // a drag over nothing of this node's. The element was off the page, and the unmount that took it there (or a placing with
    // Mounted off) left the count 0 and Is Dragging Over false (`fileDark`); with no drag there are no files and no target. The twin
    // writes those as they stand, and a count's element that is never read (an enter reads it only beside a count above 0)
    ...['fileLeave', 'fileDrop'].map((act) => ({ reducer: `person.${act}`, kind: 'swap-branch' as const, branch: '"set":[],"emit":["didMount"]', swappedWith: '"set":["depthOn","dragDepth","fileCarry","fileOn","isDragOver"],"emit":["didMount"]', why: ALREADY_HELD(`a ${act === 'fileDrop' ? 'let go' : 'leave'} with no drag from the desktop whose paint mounts the element (the unmount left nothing counted)`) })),
];

/**
 * NSP-016 s52 — the Group runs the Text's machinery (group.ts), so each Text row holds on the Group's shape of the same patch. That
 * shape also writes the gesture's index wherever it writes the zone (`inZone`), drops the focus list at an unmount (`listed`), marks
 * the element the component mounted with at a mount (`stampOn`), writes the scrolls' lists and the outcomes held for the frame's end (`ran`) at every frame end and every act, and resolves no
 * scroll — the row is made exact on that last point,
 * so a twin that also drained the frame's scrolls is never covered by it.
 */
function onGroupShape(shape: string | undefined, frameEnd: boolean, actRow = false): string | undefined {
  const m = shape === undefined ? null : /^"set":\[(.*?)\],"emit":\[(.*?)\]$/.exec(shape);
  if (!m) return shape;
  const keys = new Set<string>(m[1] ? (JSON.parse(`[${m[1]}]`) as string[]) : []);
  if (frameEnd) for (const k of ['ran', 'scheduled', 'waiting']) keys.add(k);
  if (keys.has('inZone')) keys.add('index');
  // P109 s31 (C77): `onPage`, `elem`, `shownTag` and `stampOn` are the page's syncs (group.ts `synced`), never in a shape
  if (m[2].includes('"willUnmount"')) keys.add('listed');
  // an act's row is exact (no outcomes); a frame end's holds whatever the frame reports, its scrolls' outcomes being read from the
  // state before its paint and its chain, and touching neither
  return `"set":${JSON.stringify([...keys].sort())},"emit":[${m[2]}]${frameEnd && !actRow ? '' : ',"outcome":null,"outcomes":[]'}`;
}
/**
 * A Text click row whose twins both reach Click, as the Group's first click on an element it carries the node on: the focus tracker
 * lists it (`listed`) and Focused fires before Click — the same on both twins, so the row's reason holds unchanged.
 */
function listedFirst(row: EquivalentMutant, pulse: 'focused' | 'focusLost' = 'focused'): EquivalentMutant | undefined {
  const both = [row.branch, row.swappedWith ?? row.branch];
  if (row.reducer !== 'person.click' || !both.every((b) => b !== undefined && b.includes('"onClick"'))) return undefined;
  const add = (shape: string | undefined) => {
    const m = shape === undefined ? null : /^"set":\[(.*?)\],"emit":\[(.*?)\]$/.exec(shape);
    if (!m) return shape;
    const keys = [...(m[1] ? (JSON.parse(`[${m[1]}]`) as string[]) : []), 'listed'].sort();
    return `"set":${JSON.stringify(keys)},"emit":[${m[2].replace('"onClick"', `"${pulse}","onClick"`)}]`;
  };
  return { ...row, branch: add(row.branch), ...(row.swappedWith !== undefined ? { swappedWith: add(row.swappedWith) } : {}) };
}
function onGroupRows(row: EquivalentMutant): EquivalentMutant[] {
  // and the click after a new Tag (C86) that drops the Group from the list: Focus Lost before Click, on both twins
  const twins = [listedFirst(row), listedFirst(row, 'focusLost')].filter((r): r is EquivalentMutant => r !== undefined);
  return [onGroup(row), ...twins.map(onGroup)];
}
function onGroup(row: EquivalentMutant): EquivalentMutant {
  // the frame's end and every act write the scrolls' two lists (group.ts `frameWork`, `withDrain`)
  const frameEnd = row.reducer === 'afterInputs' || row.reducer.startsWith('person.');
  const actRow = row.reducer.startsWith('person.');
  return { ...row, branch: onGroupShape(row.branch, frameEnd, actRow), ...(row.swappedWith !== undefined ? { swappedWith: onGroupShape(row.swappedWith, frameEnd, actRow) } : {}) };
}

/**
 * NSP-016 s53 — the Shape (`Circle`) runs the Text's machinery with no Tag (circle.ts), so each Text row holds on the same patch
 * without the element type a paint records (`shownTag`).
 */
function onCircle(row: EquivalentMutant): EquivalentMutant {
  const shape = (b: string | undefined) => b?.replace(/,?"shownTag"/, '');
  return { ...row, branch: shape(row.branch), ...(row.swappedWith !== undefined ? { swappedWith: shape(row.swappedWith) } : {}) };
}

/**
 * NSP-016 s54 — the Video runs the Image's machinery (video.ts), so each Text row (on the Shape's patch, `onCircle`) holds on the
 * Video's shape of the same patch: every paint writes the `<video>`'s three flags as the node holds them, and every act and frame end
 * writes the outcomes held for the frame's end (`ran`). The row is made exact on outcomes, so a twin that resolved one is never covered.
 */
function onVideo(row: EquivalentMutant): EquivalentMutant[] {
  const always = row.reducer === 'afterInputs' || row.reducer.startsWith('person.');
  const activates = ['press', 'click', 'lift', 'key', 'grab', 'pickUp'].some((a) => row.reducer === `person.${a}`);
  // the component a mount makes (its element and media are among what every paint writes)
  const MOUNT = ['canPlay', 'waiting', 'wantToPlay'];
  const shape = (b: string | undefined) => {
    const m = b === undefined ? null : /^"set":\[(.*?)\],"emit":\[(.*?)\]$/.exec(b);
    if (!m || !always) return b;
    const keys = new Set<string>(m[1] ? (JSON.parse(`[${m[1]}]`) as string[]) : []);
    for (const k of [...VIDEO_PAINT, 'ran']) keys.add(k);
    if (activates) keys.add('activated');
    if (m[2].includes('"didMount"')) for (const k of MOUNT) keys.add(k);
    return `"set":${JSON.stringify([...keys].sort())},"emit":[${m[2]}],"outcome":null,"outcomes":[]`;
  };
  const c = onCircle(row);
  return [{ ...c, branch: shape(c.branch), ...(c.swappedWith !== undefined ? { swappedWith: shape(c.swappedWith) } : {}) }];
}

/** What every paint of the Video writes (video.ts `painted`): the `<video>`'s three flags, and the element and its media as they stand. */
const VIDEO_PAINT = ['atEnd', 'canAutoplay', 'domElement', 'elAutoplay', 'elLoop', 'elMuted', 'failed', 'height', 'kind', 'loading', 'paused', 'pending', 'position', 'ready', 'srcAttr', 'width'];

// P109 ISL-031 (P107-D30) — the paint that takes a control's element off the page resets Focused, Hover and Pressed. A leave
// that was not pressed, handed its twin's example that was: the twin fires the same pulses (Blurred with Focused, Hover End with
// Hover — so those twins differ in what they fire and are killed), and its one extra write is Pressed false where it is false
// already; Pressed has no pulse of its own. Narrow: the same pulses on both sides, Pressed the only key between them.
const LEFT_UNPRESSED = "a control leaving the page that was not pressed, handed its twin's example that was: it fires the same pulses, and writes Pressed false where it is false already";
const LEAVE_PULSES = ['"willUnmount"]', '"willUnmount","onBlur"]', '"willUnmount","hoverEnd"]', '"willUnmount","onBlur","hoverEnd"]'];
function leftUnpressed(acts: readonly string[]): EquivalentMutant[] {
  const reducers = ['afterInputs', ...['hover', 'leave', 'press', 'release', 'click', 'touch', 'lift', 'focus', 'blur', ...acts].map((a) => `person.${a}`)];
  return reducers.flatMap((reducer) =>
    LEAVE_PULSES.map((pulses) => ({ reducer, kind: 'swap-branch' as const, branch: `"onPage"],"emit":[${pulses}`, swappedWith: `"onPage","pressed"],"emit":[${pulses}`, why: LEFT_UNPRESSED }))
  );
}

/**
 * P109 s29 (C81) — a node with no Tag (the Shape, the Image) makes a new element only by a remount, whose unmount clears the file drag.
 * So with no drag under way the count is 0 and Is Dragging Over false, always. A leave or a let go with no drag, handed the twin that
 * ends a drag over nothing of this node's: the twin writes no files, no target, the count 0 and Is Dragging Over false as they stand,
 * and an element for the count that is never read (an enter reads it only beside a count above 0). Not on the Text, the Group or the
 * Video: a new Tag or a new kind of element under a drag leaves the old element's leave unheard, so a zone can stay lit with no drag.
 */
const NO_DRAG_WITHOUT_A_TAG: EquivalentMutant[] = ['fileLeave', 'fileDrop'].map((act) => ({
  reducer: `person.${act}`,
  kind: 'swap-branch' as const,
  branch: '"set":[],"emit":[]',
  swappedWith: '"set":["depthOn","dragDepth","fileCarry","fileOn","isDragOver"],"emit":[]',
  why: ALREADY_HELD(`a ${act === 'fileDrop' ? 'let go' : 'leave'} with no drag from the desktop on a node with no Tag (no files, no target, nothing counted)`)
}));

export const EQUIVALENT_MUTANTS: Readonly<Record<string, EquivalentMutant[]>> = Object.freeze({
  // NSP-016 s55 — the Drag writes its whole held state on every path (drag.ts `toPatch`); placed off the page, its paint records the
  // props with no component to read them, and the next paint (an act's, or the frame's end) records them again before anything does
  Drag: [{ reducer: 'world.place', kind: 'drop-set', branch: '"emit":[],"outcome":null', why: PLACED_OFF_PAGE }],
  // NSP-016 s56 — the Component Stack: placed with Mounted off, nothing is painted and nothing registers — the whole state as it was
  'Page Stack': [{ reducer: 'world.place', kind: 'drop-set', branch: '"emit":[],"outcome":null,"outcomes":[],"request":false}', why: PLACED_OFF_PAGE }],
  // NSP-016 s57 — the Page Router
  Router: [
    { reducer: 'world.place', kind: 'drop-set', branch: '"emit":[],"outcome":null,"outcomes":[],"request":false}', why: ROUTER_PLACED_OFF_PAGE },
    ...(['["navigate:failure"]', '["navigate:done","open:undefined"]', '["navigate:unchanged"]'] as const).map((answers) => ({
      reducer: 'world.timer',
      kind: 'drop-set' as const,
      branch: `"emit":[],"outcome":null,"outcomes":[],"request":false,"answers":${answers}}`,
      why: ROUTER_REFUSED_AT_TIMER
    }))
  ],
  Text: TEXT,
  // P109 ISL-049 (s32) — the Repeater v3: with no queue that stops for good (row C128), a yield that pulses nothing and answers
  // nothing finds the queue idle. Its set clears `afterFrame` and `owed` (every later step sets both before reading them) and, after a
  // settle's frame, empties `pending` of signals the drain did not hear — a row the Repeater deleted, or an output the PLACED Template
  // lacks, so never heard later either. A row let go at a drain was let go by the frame's drain before it. v2's stuck yield was the one
  // this branch could show (the C128 scenarios killed it there)
  'For Each': [{ reducer: 'world.resume', kind: 'drop-set', branch: '"emit":[],"outcome":null,"outcomes":[],"request":false}', why: 'a yield that finds the queue idle: its set clears two flags every later step sets before reading, and signals no drain can hear' }],
  // NSP-016 s53 — the Shape runs the Text's machinery with no Tag
  Circle: [...TEXT.map(onCircle), ...NO_DRAG_WITHOUT_A_TAG],
  // NSP-016 s53 — the Image runs the Shape's machinery (no Tag), and its fetch
  Image: [...TEXT.map(onCircle), ...NO_DRAG_WITHOUT_A_TAG],
  // NSP-016 s54 — the Video runs the Image's machinery, on its own shapes (`onVideo`)
  Video: [
    ...TEXT.flatMap(onVideo),
    // s54 — a Play before the component has seen a load, handed the patch of a Play on a video already playing: it spends Autoplay's
    // chance (canAutoplay false) and settles no promise (none is pending before a load). The Play it wants starts at the load what
    // Autoplay would have — On Play once, after On Can Play — and whatever stops wanting it (Pause, Reset) spends that chance too,
    // while a new element or a reload gives it back
    { reducer: 'play', kind: 'swap-branch', branch: '"set":["atEnd","paused","pending","position","timeOut","wantToPlay"],"emit":[],"outcome":"done"', swappedWith: '"set":["atEnd","canAutoplay","paused","pending","position","timeOut","wantToPlay"],"emit":[],"outcome":"done"', why: "a Play before a load, handed a playing video's patch: at the load the wanted Play starts what Autoplay would have" },
    // the Group's row: a frame end that reports outcomes — they stand without its set, and only the next settle shows what it failed
    // to keep; a sequence ending at that settle cannot show it
    { reducer: 'afterInputs', kind: 'drop-set', branch: '"outcomes":["', why: 'a frame end that reports outcomes: they stand without its set, and only the next settle shows what it failed to keep; a sequence ending at that settle cannot show it' },
    // a Source Object write on the page (null, an embed's, a value that is not a stream: nothing), handed the patch of one that waited
    // off the page: the list it writes holds Source Object writes only (the twin's), which run at the next mount on a new `<video>`,
    // where a reload changes nothing, and are the oldest in the list, so the cap pushes them out first, without a word
    // a placing off the page draws the flags with no element to draw them on; the mount draws them again (PLACED_OFF_PAGE)
    { reducer: 'world.place', kind: 'drop-set', branch: `"set":${JSON.stringify(VIDEO_PAINT)},"emit":[]`, why: 'a placing on a node placed off the page: its set holds the flags, which nothing reads before the frame end repaints them, and the element and media as they already stand' },
    // a drag from the desktop entering in the frame Mounted comes back, its paint making the element (and running what waited), handed a
    // twin that makes none: the frame's end mounts it instead and runs what waited there, reporting at the same frame end; the element it
    // makes is numbered one more, so the file bookkeeping the twin wrote names an element no longer there, and the next drag over the
    // new one enters it as it would have (element numbers are only ever compared with each other)
    { reducer: 'person.fileEnter', kind: 'swap-branch', branch: `"set":${JSON.stringify([...VIDEO_PAINT, 'canPlay', 'depthOn', 'dragDepth', 'fileCarry', 'fileOn', 'isDragOver', 'ran', 'timeOut', 'waiting', 'wantToPlay'].sort())},"emit":["didMount"]`, swappedWith: '"emit":[],"outcome":null,"outcomes":[]', why: 'a drag entering in the frame the Video mounts, handed a twin that does not mount: the frame end mounts it, and the twin names an element no longer there' },
    // … and a card grabbed in that frame, handed a twin that grabs the SAME card without mounting (a twin that carries another card is
    // killed: the card let go over the Video is the one dropped)
    { reducer: 'person.grab', kind: 'swap-branch', branch: `"set":${JSON.stringify([...VIDEO_PAINT, 'activated', 'canPlay', 'cardFocused', 'carry', 'carryBy', 'focusedElem', 'ran', 'timeOut', 'waiting', 'wantToPlay'].sort())},"emit":["didMount"]`, swappedWith: `"set":${JSON.stringify([...VIDEO_PAINT, 'activated', 'cardFocused', 'carry', 'carryBy', 'focusedElem', 'ran'].sort())},"emit":[]`, why: 'a card grabbed in the frame the Video mounts, handed a twin that grabs the same card without mounting: the frame end mounts it' },
    { reducer: 'srcObject', kind: 'swap-branch', branch: '"set":[],"emit":[]', swappedWith: '"set":["waiting"],"emit":[]', why: 'an on-page Source Object write handed a twin that left Source Object writes waiting: they run on a fresh element and are pushed out first, silently' }
  ],
  // NSP-016 s52 — the Group runs the Text's machinery (group.ts docblock): the Text's rows, on the Group's shapes
  Group: [
    ...TEXT.flatMap(onGroupRows),
    // s52 — an act that moved nothing writes the scroll lists and the held outcomes as it found them (group.ts `withDrain`,
    // `heldOver`): dropping that set leaves the same state
    // s30 (P109 ISL-031, C78): a pointer act that meets nothing does the same — it wrote where the pointer is (`pointerAt`), which only
    // the Group's own drag over a new element of its own read, and that drag never finds a zone now
    ...['hover', 'press', 'release', 'click', 'touch', 'lift', 'leave', 'away'].map((act) => ({
      reducer: `person.${act}`,
      kind: 'drop-set' as const,
      branch: '"set":["ran","scheduled","waiting"],"emit":[],"outcome":null,"outcomes":[]',
      why: ALREADY_HELD(`a ${act} that meets nothing: it writes the scroll lists and the held outcomes it found`)
    })),
    ...['click', 'focus', 'blur', 'key', 'fileDrop', 'fileLeave', 'tap'].map((act) => ({
      reducer: `person.${act}`,
      kind: 'drop-set' as const,
      branch: `"set":["ran","scheduled","waiting"],"emit":[${act === 'click' ? '"pointerDown","pointerUp","onClick"' : ''}],"outcome":null,"outcomes":[]`,
      why: ALREADY_HELD(`a ${act} that moved nothing: it writes the scroll lists and the held outcomes it found`)
    })),
    // a tap or a click beside it whose release ends a card's mouse carry outside a zone, handed the twin that ended one inside it: the
    // zone, its index and Drag Over written where they are already none, -1 and false (the Text's row for a key or a let go)
    ...['tap', 'clickAway'].flatMap((act) =>
      ['', '"pointerDown","pointerUp"'].map((emit) => ({
        reducer: `person.${act}`,
        kind: 'swap-branch' as const,
        branch: `"set":["cardFocused","carry","carryBy","focusedElem","ran","scheduled","swallow","waiting"],"emit":[${emit}],`,
        swappedWith: '"set":["cardFocused","carry","carryBy","focusedElem","inZone","index","isDropTarget","ran","scheduled","swallow","waiting"],',
        why: ALREADY_HELD(`a ${act === 'tap' ? 'tap' : 'click beside it'} ending a card's carry outside a zone (Drag Over is false, and was sent false)`)
      }))
    ),
    // a tap whose press starts the Group's own pending gesture and whose release ends it, beside the twin whose press finds one pending
    // and only ends it — the Text's click row: the gesture is idle before and after, and the source the first records is written
    // again by the next press before anything reads it
    ...[
      ['"set":["cardFocused","focusedElem","inZone","index","input","listed","phase","ran","scheduled","sourceElem","waiting"],', '"set":["cardFocused","focusedElem","inZone","index","input","listed","phase","ran","scheduled","waiting"],'],
      ['"set":["cardFocused","focusedElem","inZone","index","input","listed","phase","ran","scheduled","waiting"],', '"set":["cardFocused","focusedElem","inZone","index","input","listed","phase","ran","scheduled","sourceElem","waiting"],'],
      ['"set":["cardFocused","focusedElem","inZone","index","input","phase","ran","scheduled","sourceElem","waiting"],', '"set":["cardFocused","focusedElem","inZone","index","input","phase","ran","scheduled","waiting"],'],
      ['"set":["cardFocused","focusedElem","inZone","index","input","phase","ran","scheduled","waiting"],', '"set":["cardFocused","focusedElem","inZone","index","input","phase","ran","scheduled","sourceElem","waiting"],']
    ].map(([branch, swappedWith]) => ({ reducer: 'person.tap', kind: 'swap-branch' as const, branch, swappedWith, why: "a tap whose press starts its own pending gesture and whose release ends it, beside a twin that differs only there: the gesture is idle before and after" })),
    // a click beside it nothing eats, handed the twin a waiting swallow ate: that twin writes the swallow false, where it already is
    { reducer: 'person.clickAway', kind: 'swap-branch', branch: '"set":["cardFocused","focusedElem","ran","scheduled","waiting"],"emit":[],', swappedWith: '"set":["cardFocused","focusedElem","ran","scheduled","swallow","waiting"],"emit":[],', why: ALREADY_HELD('a click beside it that nothing ate, handed the click a waiting swallow ate (the swallow false over false)') },
    // the frame end that reports outcomes — States' and Pop Component Stack's frame end exactly: its outcomes stand without its
    // `set`, and only the NEXT settle shows what it failed to keep (the held outcomes and the scrolls reported again, which the
    // interpreter refuses, or a paint not kept). The branch keys are combinations of outcome ports and answers, so which of them end a
    // sequence moves with the seed (seed 13: 0, seeds 20729 / 20730 / 7: 2, 3, 2; the 10,000: more). Every hand scenario and every
    // matrix segment with outcomes in a frame settles again after it, and a frame end reached there is killed
    {
      reducer: 'afterInputs',
      kind: 'drop-set',
      branch: '"outcomes":["',
      why: "a frame end that reports outcomes: they stand without its set, and only the next settle shows what it failed to keep; a sequence ending at that settle cannot show it"
    }
  ],
  'net.noodl.controls.button': [
    ...leftUnpressed([]),
    { reducer: 'world.place', kind: 'drop-set', branch: '"set":[],"emit":[]', why: PLACED_OFF_PAGE },
    ...['hover', 'leave', 'touch', 'lift'].map((act) => ({ reducer: `person.${act}`, kind: 'drop-set' as const, branch: '"set":[],"emit":[]', why: ACT_OFF_PAGE }))
  ],
  'net.noodl.controls.checkbox': [
    ...leftUnpressed([]),
    { reducer: 'world.place', kind: 'drop-set', branch: '"set":[],"emit":[]', why: PLACED_OFF_PAGE },
    ...['hover', 'leave', 'touch', 'lift'].map((act) => ({ reducer: `person.${act}`, kind: 'drop-set' as const, branch: '"set":[],"emit":[]', why: ACT_OFF_PAGE }))
    // (v2, NSP-023 s45: Enable Label rebuilds nothing — the rebuild family declared here in s37 is gone with it)
  ],
  // NSP-016 s42 — the Radio Button: the Checkbox's page model, so the Checkbox's v1 rebuild family (until NSP-023 step 5) — and a click joins it: a
  // click on a disabled button meets nothing as a press does (the Checkbox's click toggles the box, so its click never had this shape)
  'net.noodl.controls.radiobutton': [
    ...leftUnpressed(['pick']),
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
    ...leftUnpressed(['type', 'key']),
    { reducer: 'world.place', kind: 'drop-set', branch: '"set":[],"emit":[]', why: PLACED_OFF_PAGE },
    ...['hover', 'leave', 'touch', 'lift'].map((act) => ({ reducer: `person.${act}`, kind: 'drop-set' as const, branch: '"set":[],"emit":[]', why: ACT_OFF_PAGE })),
    // a frame's end with no callback scheduled and nothing to paint writes nothing (the Button's afterInputs always syncs; this one consumes a queue only when it held something)
    { reducer: 'afterInputs', kind: 'drop-set', branch: '"set":[],"emit":[]', why: 'a frame end with nothing scheduled and nothing to paint: its set is empty, there is nothing to drop' },
    // Clear off the page with the author's Value and the output already empty: every writer of the output writes the start value with
    // it, so the start value is empty too — the three keys it writes already hold the value (text-input.ts :490-497)
    { reducer: 'clear', kind: 'drop-set', branch: '"set":["out","startValue","text","wire"],"emit":[],"outcome":"unchanged"', why: "a Clear off the page that finds the author's Value, the start value and the output already empty writes what is there (s40: the wire's copy too)" },
    // v4 (P109 ISL-031, D33): its twin ON the page answers Unchanged only when the field is empty too, so the component's write puts
    // back what is there — the field and its cursor (an empty field does not move it), the output and the wire's copy, the
    // announcement (every write on the page announces the output); the start value differs at most as null for '', and every
    // reader of it makes it text first
    { reducer: 'clear', kind: 'drop-set', branch: '"set":["announced","field","hasAnnounced","out","startValue","text","wire"],"emit":["textChanged"],"outcome":"unchanged"', why: "a Clear on the page that finds the author's Value, the output and the field already empty writes what is there" }
    // (v2, NSP-023 s45: no label rebuild; the s38 rebuild family and the drain's rebuild twins are gone with it — the Type swap
    // between Text Area and a one-line field still replaces the element, and the deep run says whether it needs any of them back)
  ],
  // NSP-016 s39 — the Dropdown: the placing off the page and the four acts that meet no element (the Button's)
  'net.noodl.controls.options': [
    ...leftUnpressed(['choose']),
    { reducer: 'world.place', kind: 'drop-set', branch: '"set":[],"emit":[]', why: PLACED_OFF_PAGE },
    ...['hover', 'leave', 'touch', 'lift'].map((act) => ({ reducer: `person.${act}`, kind: 'drop-set' as const, branch: '"set":[],"emit":[]', why: ACT_OFF_PAGE }))
    // (v2, NSP-023 s45: Enable Label rebuilds nothing — the rebuild family declared here in s39 is gone with it)
  ],
  // NSP-016 s41 — the Slider: the placing off the page and the four acts that meet no element (the Button's; the 10,000 run)
  // NSP-016 s43 — Visible is a page sync now: a group placed OFF the page carries only it, as the Button's placing does
  'Radio Button Group': [
    { reducer: 'world.place', kind: 'drop-set', branch: '"set":[],"emit":[]', why: PLACED_OFF_PAGE },
    // NSP-023 step 5 (v2, s47) — with the selection the node's own Value, a paint that changes no mount writes only the painted
    // visibility, and the one reader of that is a pick, whose own paint writes it first
    { reducer: 'afterInputs', kind: 'drop-set', branch: '"set":[],"emit":[]', why: 'a frame end that only syncs the painted visibility: its one reader, a pick, paints the page itself first' },
    { reducer: 'person.pick', kind: 'drop-set', branch: '"set":[],"emit":[]', why: 'a pick that reaches no button and only syncs the painted visibility: its one reader, the next pick, paints the page itself first' }
  ],
  'net.noodl.controls.range': [
    ...leftUnpressed(['slide']),
    { reducer: 'world.place', kind: 'drop-set', branch: '"set":[],"emit":[]', why: PLACED_OFF_PAGE },
    // v3 (P109 ISL-031, C74): every paint on the page writes the node's value, Value Percent and the word's flag, so a paint that moved
    // nothing is the branch of one that did (v2's thirty "no word waiting" twins are gone with it); what is left meets no element
    ...['afterInputs', ...['hover', 'leave', 'press', 'release', 'click', 'touch', 'lift', 'focus', 'blur', 'slide'].map((act) => `person.${act}`)].map((reducer) => ({ reducer, kind: 'drop-set' as const, branch: '"set":[],"emit":[]', why: SLIDER_OFF_PAGE }))
  ],
  // NSP-017 s65 — the Function: a frame end with no script and no Run (an input arrived before any code) does nothing but
  // clear its flag; left set, it does nothing again every frame, and the Script or a Run that could change it schedules anyway
  JavaScriptFunction: [
    { reducer: 'afterInputs', kind: 'drop-set', branch: '"set":["scheduled","tokens"],"emit":[],"outcome":null,"outcomes":[]', why: STUCK_FLAG },
    { reducer: 'afterInputs', kind: 'swap-branch', branch: '"set":["scheduled","tokens"],"emit":[],"outcome":null,"outcomes":[]', swappedWith: '"set":[],"emit":[]', why: STUCK_FLAG },
    { reducer: 'afterInputs', kind: 'swap-branch', branch: '"set":[],"emit":[]', swappedWith: '"set":["scheduled","tokens"],"emit":[],"outcome":null,"outcomes":[]', why: STUCK_FLAG }
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
  'net.noodl.ParseXML': [{ reducer: 'afterInputs', kind: 'drop-set', branch: '"set":["scheduled"],"emit":[]', why: STUCK_FLAG + ' (nothing on XML yet, or nothing due)' }],
  // P109 ISL-026 (C8 fixed): the frame end with no Fetch due writes `scheduled: false, pendingTokens: 0` over the same two values —
  // a Fetch sets both and every run drains both, so nothing is pending while nothing is scheduled. Until C8 this branch was shared
  // with the throw that lost the outcomes, and that path killed the mutant.
  'net.noodl.HTTP': [
    { reducer: 'afterInputs', kind: 'drop-set', branch: '"set":["pendingTokens","scheduled"],"emit":[]', why: 'a frame end with no Fetch due clears a scheduled flag and a token count that are already false and 0' },
    // v5 (P109 ISL-030, D12): only Cancel aborts a request without a timeout, and Cancel has already emptied the list it aborts
    { reducer: 'world.response', kind: 'drop-set', branch: '"set":["abortable","inFlight"],"emit":["canceled"],"outcome":null,"outcomes":["fetch:unchanged"],"request":false', why: 'a cancelled request landing: Cancel already emptied the list it aborted, and the request it removes from in-flight has no timer left to read it' }
  ],
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
  // P109 ISL-032 — Delay v2 (row D10): Stop's `unchanged` branch is reached only with the timer neither running nor queued,
  // and `started` is set only while running and cleared wherever running ends — so the three flags it writes are already false.
  Timer: [{ reducer: 'stop', kind: 'drop-set', branch: '"outcome":"unchanged"', why: 'a Stop on a timer neither running nor queued: its set writes queued, running and started false, which they already are' }],
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
});
