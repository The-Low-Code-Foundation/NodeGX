/**
 * Video (`Video`) — read from `packages/noodl-viewer-react/src/nodes/visual/video.ts`, `components/visual/Video/Video.tsx` (the
 * component), `video-embed.ts` (`resolveVideoEmbed` — which Sources play in an embedded player), `media-fragment.ts`
 * (`withMediaFragment` — Start Time and End Time), `nodes/visual/media-source.ts` and `noodl-runtime/src/utils.ts` `getAbsoluteUrl`
 * (what Source becomes), `react-component-node.ts` (`withInnerComponent` :2014-2031, `outcomeOnInnerComponent` :2032-2056, what every
 * visual node shares), `node-shared-port-definitions.ts` (the pointer, file-drop and drag ports — the Text's), `pointerlisteners.ts`
 * and `drag-drop.ts` on 2026-10-07 (NSP-016 s54).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations. A Video is the Image's element (image.ts) drawing a VIDEO: what the Image says of the pointer, the
 * keyboard, the drag, the zone side and the drag from the desktop holds here word for word (the same shared ports, the same opacity
 * rule, Video.tsx :214), and is not repeated. What the Video adds:
 *
 *   - **the element** (Video.tsx :236-305): Source is resolved as the Image's is (`resolveMediaSource`: none for null, nothing or
 *     anything empty as text; else text, after `/` unless absolute, a URL or a data URL). A Source that names a YouTube or Vimeo
 *     video (video-embed.ts `youtubeId` / `vimeoId`) draws an EMBED — an `<iframe>` playing it, which reports nothing back; any other
 *     draws a `<video>` whose `src` is the Source with Start Time and End Time as a `#t=` fragment (media-fragment.ts; `#t=0.01`
 *     with neither). A Source that moves between the two makes a new element without a mount, as the Text's Tag does. **DOM
 *     Element** is the `<video>` while one is on the page (`OWN_ELEMENT`) and nothing (`null`) once it goes; an embed never sets it.
 *   - **the browser's media element** (THE MEDIA ELEMENT below, the face's rules in node-spec-target.ts): a `<video>` LOADS its
 *     source when it is made with one, and again whenever its `src` changes to another (not when it is taken away); a load pauses
 *     it without a word, puts it back to 0 (Playback Position 0 when it had moved), and starts over. The browser then reports the
 *     load (`loaded`: **On Can Play**, **Video Width** and **Video Height**; or `failed`: **Error** and **Playback Failure**), and
 *     while it plays, its progress (`progress`) and its end (`ended`: Loop on goes back to 0 and plays on; else it pauses — **On
 *     Pause** — at the end). **On Play** fires whenever a paused `<video>` starts, by the node or by Autoplay; **Playback
 *     Position** is sent at every `timeupdate` the browser fires. A `<video>` may play only while it is muted, or once a person has
 *     pressed, clicked, lifted a finger or pressed a key other than Escape on the page (the autoplay policy); else the browser
 *     refuses (Error "The browser blocked playback…", then Playback Failure). Autoplay starts a `<video>` that may play when its
 *     load completes, unless the node already played or paused it.
 *   - **the four actions** (video.ts :48-117, Video.tsx :177-201) run on the component when it exists — the node is on the page —
 *     and report Done; else they wait for it (`withInnerComponent`), with Source Object's writes, and run in order at the paint that
 *     puts the Video on the page, each reporting Done then. At most 16 wait; the 17th pushes the oldest out, which reports Failure
 *     when it is an action. **Play** wants the video to play, and plays it now when the component has seen it load (`canPlay`, kept
 *     across a change of Source; a new component at each mount starts without it); **Restart** the same, from 0; **Pause** stops
 *     wanting it, and pauses a `<video>`; **Reset** the same, from 0. The component's first `canplay` plays a video it wants to.
 *     On an embed they do nothing to the player (the Source port says so), and report Done — the runtime throws on Play and
 *     Restart there once the component has seen a `<video>` load: row **C97**, a known row on the runtime target.
 *   - **Source Object** (video.ts :35-47, Video.tsx :129-134) — a camera's stream; no scenario can hold one, so what it is graded on
 *     is what is NOT a stream. Null changes nothing (the element has none). Nothing (`undefined`) is null to the browser, and the
 *     node writes it: the `<video>` loads its Source again, and the component forgets it had loaded. Any other value the browser
 *     refuses, and nothing changes — the runtime throws (row **C99**); on an embed, any value changes nothing — the runtime throws
 *     (row **C96**).
 *   - **Volume, Poster, Controls** are drawn and read by no output. A Volume outside 0 to 1 is look like any other here — the
 *     runtime throws while React draws it and the page goes blank (row **C98**). Face choice: a person using the browser's own
 *     controls is not an act.
 */

import { defineNode, said, type Patch } from '../spec';
import { SELF_REFERENCE } from '../trace';

/**
 * NSP-016 s54 — the canonical form of a node's own DOM element (the Video's `DOM Element`, `type: 'domelement'`): what a wire from it
 * carries is the element, which no trace can hold, so both targets record it as this tag — as a node's reference to itself is
 * `SELF_REFERENCE` (trace.ts).
 */
export const OWN_ELEMENT = Object.freeze({ $element: 'own' });

type Phase = 'idle' | 'pending' | 'holding' | 'lifted';
type Action = 'play' | 'restart' | 'pause' | 'reset';
/** what waits for the component (`_pendingInnerActions`): an action, or a Source Object write with its value */
type Waiting = { readonly op: Action } | { readonly srcObject: unknown };
type Resolved = { port: Action; outcome: 'done' | 'failure'; error?: string };

type State = {
  /** react-component-node.ts :1267 `wantsToBeMounted` */
  mounted: boolean;
  /** the element is on the page: mounted and painted (the component exists) */
  onPage: boolean;
  /** which element is on the page — a new one each time one is made (a mount, or a Source that moves between file and embed) */
  elem: number;
  /** the element that holds the keyboard, or -1 — a new element never does (row C77, P109 s31: so a paint writes nothing about it) */
  focusedElem: number;
  visible: boolean;
  opacityZero: boolean;
  peStyle: 'auto' | 'none' | undefined;
  peEnabled: boolean | undefined;
  draggable: boolean;
  holdToDrag: unknown;
  holdTime: unknown;
  acceptDrops: boolean;
  acceptKind: unknown;
  phase: Phase;
  input: 'mouse' | 'touch' | 'keyboard' | undefined;
  inZone: boolean;
  carry: number;
  carryBy: 'mouse' | 'keyboard' | undefined;
  cardFocused: number;
  swallow: boolean;
  isLifted: boolean;
  isDropTarget: boolean;
  droppedValue: unknown;
  dropIndex: unknown;
  acceptFileDrops: boolean;
  acceptedFileTypes: unknown;
  dragDepth: number;
  /** the element the count belongs to: an enter on another starts it again (C81, fixed in P109); -1: none */
  depthOn: number;
  isDragOver: boolean;
  droppedFiles: unknown;
  droppedFile: unknown;
  fileCarry: readonly FileLike[] | undefined;
  fileOn: number;
  /** video.ts :130-133 — Source as `resolveMediaSource` makes it (none: no source) */
  source: string | undefined;
  /** the inputs a `<video>` is drawn with (`propPath: 'dom'`), as the node holds them */
  startTime: unknown;
  endTime: unknown;
  muted: unknown;
  autoplay: unknown;
  loop: unknown;
  /** what the page draws: an embed or a `<video>`, and the `<video>`'s `src` and flags as last drawn */
  kind: 'video' | 'embed';
  srcAttr: string | undefined;
  elMuted: boolean;
  elAutoplay: boolean;
  elLoop: boolean;
  /** the Start Time the component was last drawn with (Video.tsx `this.props.dom.startTime`): where Restart and Reset seek (v6, row C161) */
  elStart: unknown;
  /** THE MEDIA ELEMENT — the `<video>` on the page */
  paused: boolean;
  position: number;
  ready: boolean;
  loading: boolean;
  failed: string | undefined;
  pending: number;
  canAutoplay: boolean;
  atEnd: boolean;
  width: number;
  height: number;
  /** the component (Video.tsx :115-127) — a new one at each mount */
  wantToPlay: boolean;
  canPlay: boolean;
  /** the page has had a person's activation (the autoplay policy) */
  activated: boolean;
  /** the outputs the component sends, none until it does */
  timeOut: unknown;
  videoWidth: unknown;
  videoHeight: unknown;
  playbackError: unknown;
  domElement: unknown;
  /** what waits for the component (at most 16) */
  waiting: readonly Waiting[];
  /** the outcomes resolved since the frame began and not yet reported (group.ts `ran`) */
  ran: readonly Resolved[];
};

type FileLike = { readonly name?: unknown; readonly type?: unknown; readonly size?: unknown };

type O = typeof Video extends { outputs: infer X } ? X : never;
type Send = Patch<State, O>;
type Pulse =
  | 'onCanPlay'
  | 'onPlay'
  | 'onPause'
  | 'onPlaybackFailure'
  | 'didMount'
  | 'willUnmount'
  | 'onClick'
  | 'pointerDown'
  | 'pointerUp'
  | 'pointerEnter'
  | 'hoverStart'
  | 'hoverEnd'
  | 'pickedUp'
  | 'landed'
  | 'dragCancelled'
  | 'dropped'
  | 'filesDropped'
  | 'filesRejected';
type Val =
  | 'onTimeUpdate'
  | 'videoWidth'
  | 'videoHeight'
  | 'playbackError'
  | 'onVideoElementCreated'
  | 'isLifted'
  | 'isDropTarget'
  | 'droppedValue'
  | 'dropIndex'
  | 'isDragOver'
  | 'droppedFile'
  | 'droppedFiles'
  | 'droppedFileName'
  | 'droppedFileType'
  | 'droppedFileSizeInBytes';
type Act = { set: Partial<State>; send: Val[]; emit: Pulse[]; after?: Array<{ ms: unknown; tag: string }>; cancel?: string[]; outcomes?: Resolved[] };

const NOTHING: Send = { send: [] };
const NONE: Act = { set: {}, send: [], emit: [] };
/** react-component-node.ts :2028 — the most that wait for the component */
const WAIT_CAP = 16;
/** where the video ends, in seconds (the face's MEDIA_END): `ended` puts Playback Position there */
const MEDIA_END = 60;
const KEYS = [' ', 'Enter', 'Escape', 'Tab', 'ArrowRight', 'ArrowDown', 'x'] as const;
const PNG = { $file: { name: 'photo.PNG', type: 'image/png', size: 3 } };
const PDF = { $file: { name: 'notes.pdf', type: 'application/pdf', size: 5 } };
const BARE = { $file: { name: 'README', type: '', size: 0 } };
const FILE_DRAGS = [[PNG], [PDF], [PNG, PDF], [BARE], []] as const;
const CARDS: ReadonlyArray<{ readonly dragValue: unknown; readonly dragKind?: string }> = [{ dragValue: 'card-1', dragKind: 'card' }, { dragValue: 7, dragKind: ' task ' }, { dragValue: 'loose' }];
/** the sizes a load reports: a 640 × 360 video, and a file with no picture (sound only) */
const SIZES = [{ width: 640, height: 360 }, { width: 0, height: 0 }] as const;

/** Video.tsx :159-175 — what the node says when the browser refuses a play */
const NOT_ALLOWED = 'The browser blocked playback: autoplay needs a user gesture, or the video has to be muted';
/** … when the source has failed (the face's NotSupportedError message, after "Playback could not start: ") */
const NOT_SUPPORTED = 'Playback could not start: The element has no supported sources.';
const FAILED_TO_MOUNT = 'visual/action-dropped';

export const Video = defineNode({
  type: 'Video',
  // v1 (NSP-016 s54): the Image's machinery (image.ts) with the element a Source draws (a `<video>` or an embed), the browser's media
  // element, the four actions and what waits for the component
  // v2 (P109 ISL-038, s29): a key during a keyboard carry leaves a zone taken off the page first, so Space cancels (row C83)
  // v3 (P109 ISL-038, s29): a file drop zone tracks itself — an enter on a new element starts the count again, and Accept File Drops off or leaving the page turns Is Dragging Over off (row C81)
  // v4 (P109 ISL-031, s30): a drag never takes its own node as its zone — a keyboard lift does not start in itself, Enter or Space then cancels, and a pointer drag over a new element of its own finds no zone (row C78)
  // v5 (P109 ISL-031, s30–31): every element of a Draggable node takes the keyboard — a remount, a new Tag or a mount however late gets the attributes (row C77); which element is on the page is the paint's sync (`synced`), and the keyboard is held by an element (`focusedElem`), so a paint writes nothing about it
  // v6 (P107 s92, row C161 — R27): Restart and Reset seek to Start Time, not second 0
  version: 6,
  changes: [
    {
      version: 6,
      says: 'Restart and Reset go back to Start Time, as the component was last drawn with it, or to second 0 when there is none. Before, both went to second 0 even with a Start Time set: a Restart played the seconds Start Time was there to skip, and the seek left the #t= fragment, so End Time stopped bounding playback',
      row: 'P107-C161 (R27)',
      migration: {
        none: 'Ruled "Restart and Reset go to Start Time" (R27): the two port descriptions already promised "the beginning". A Video with no Start Time seeks to second 0 as before, and the reach measured on 2026-10-12 was 13 Video nodes in 8 of Richard\'s projects, none with a Start Time'
      }
    }
  ],
  source: 'packages/noodl-viewer-react/src/nodes/visual/video.ts',
  needs: ['person', 'clock'],
  // the page's syncs (spec.ts `synced`): which element is on the page, written only by a paint. Not branches (row C77, P109 s31):
  // with every element of a Draggable taking the keyboard, whether an act's paint or the frame end made the element is not a branch
  synced: ['onPage', 'elem'],
  worldPool: { advances: [0, 1, 499, 500, 1000] },
  // video.ts :341-344 `outcomeOutputs({ done, failure })` — the four actions share them
  outcomes: ['done', 'failure'],

  state: {
    mounted: true,
    onPage: false,
    elem: 0,
    focusedElem: -1,
    visible: true,
    opacityZero: false,
    peStyle: undefined,
    peEnabled: undefined,
    draggable: false,
    holdToDrag: undefined,
    holdTime: undefined,
    acceptDrops: false,
    acceptKind: undefined,
    phase: 'idle',
    input: undefined,
    inZone: false,
    carry: -1,
    carryBy: undefined,
    cardFocused: -1,
    swallow: false,
    isLifted: false,
    isDropTarget: false,
    droppedValue: undefined,
    dropIndex: undefined,
    acceptFileDrops: false,
    acceptedFileTypes: undefined,
    dragDepth: 0,
    depthOn: -1,
    isDragOver: false,
    droppedFiles: undefined,
    droppedFile: undefined,
    fileCarry: undefined,
    fileOn: -1,
    source: undefined,
    startTime: undefined,
    endTime: undefined,
    muted: undefined,
    autoplay: undefined,
    loop: undefined,
    kind: 'video',
    srcAttr: undefined,
    elMuted: false,
    elAutoplay: false,
    elLoop: false,
    elStart: undefined,
    paused: true,
    position: 0,
    ready: false,
    loading: false,
    failed: undefined,
    pending: 0,
    canAutoplay: true,
    atEnd: false,
    width: 0,
    height: 0,
    wantToPlay: false,
    canPlay: false,
    activated: false,
    timeOut: undefined,
    videoWidth: undefined,
    videoHeight: undefined,
    playbackError: undefined,
    domElement: undefined,
    waiting: [],
    ran: []
  } as State,

  acts: {
    hover: { description: 'the pointer moves onto the video' },
    leave: { description: 'the pointer moves off it' },
    press: { description: 'a mouse button goes down on it' },
    release: { description: 'the mouse button comes up' },
    click: { description: 'a press, a release and the click that follows' },
    touch: { description: 'a finger goes down on it' },
    lift: { description: 'the finger comes up' },
    focus: { description: 'the keyboard is put on it — the element takes it only with a tabindex' },
    blur: { description: 'the keyboard is taken off it' },
    key: { description: 'a key is pressed with the keyboard put on it first, if it takes it', values: KEYS },
    move: { description: 'the mouse, or the finger that is down, moves across it by more than a few pixels', values: ['mouse', 'touch'] },
    fileEnter: { description: 'a drag from the desktop moves onto it: a new drag carries these files (none: something that is not a file), one under way keeps its own', values: FILE_DRAGS },
    fileLeave: { description: 'the drag from the desktop moves off it and out of the window' },
    fileDrop: { description: 'the drag from the desktop is let go over it' },
    grab: { description: 'the mouse goes down on the Draggable card beside it that carries this Drag Value and Drag Kind, and moves it past a few pixels', values: CARDS },
    pickUp: { description: 'the keyboard is put on the card beside it that carries this Drag Value and Drag Kind, and Space is pressed', values: CARDS },
    loaded: { description: 'the browser has loaded enough of the source the video element is loading to play it, and knows its size', values: SIZES },
    failed: { description: 'the browser cannot play the source the video element is loading, with the reason it gives (none: no reason)', values: ['', 'MEDIA_ELEMENT_ERROR: Format error'] },
    progress: { description: 'the video playing reaches this second', values: [1, 2.5, 30] },
    ended: { description: 'the video playing reaches its end' },
    away: { description: 'the mouse, or the finger that is down, moves off it onto nothing by more than a few pixels', values: ['mouse', 'touch'] }
  },

  inputs: {
    // ---- logic ----
    mounted: { type: 'boolean', default: true, coerce: 'none', displayName: 'Mounted', group: 'General', description: 'Removes the element from the page entirely when false, unlike Visible which leaves its space behind. Wired, it counts as true until the first value arrives, so set it to false here to start hidden (a lock, a private screen)', portability: 'logic', layout: 'present' },
    scrollIntoView: { type: 'signal', displayName: 'Scroll Into View', group: 'Scroll Into View', description: 'Scrolls the page, or the scrolling Group holding this element, until the element can be seen', portability: 'logic' },
    scrollIntoViewAlign: { type: 'enum', enums: ['nearest', 'start', 'center', 'end'], default: 'nearest', coerce: 'none', displayName: 'Scroll Align', group: 'Scroll Into View', description: 'Where Scroll Into View leaves the element: Nearest edge moves only as far as needed', portability: 'logic' },
    pointerEventsEnabled: { when: (p) => p.pointerEventsMode === 'explicit', type: 'boolean', default: true, coerce: 'none', displayName: 'Pointer Events Enabled', group: 'Pointer Events', description: 'When disabled, mouse and touch events pass through to whatever is behind this element', portability: 'logic' },
    blockTouch: { type: 'boolean', coerce: 'none', displayName: 'Block Pointer Events', group: 'Pointer Events', description: 'Stops every pointer event that lands here from reaching the nodes this one sits inside. Blunt: it takes hover and pointer-down with it, so reach for Click Bubbling first if it is only clicks you want to keep in', portability: 'logic' },
    clickBubbling: { type: 'enum', enums: ['auto', 'always', 'never'], default: 'auto', coerce: 'none', displayName: 'Click Bubbling', group: 'Pointer Events', description: "Whether a click here also fires Click on the nodes this one sits inside. Automatic keeps it here as soon as this node's own Click is connected, so a button inside a clickable card runs the button and not the card; Always is the older behaviour where both run; Never keeps every click here, wired or not. Note that an element at zero opacity takes no pointer events at all", portability: 'logic' },
    draggable: { type: 'boolean', default: false, coerce: 'none', displayName: 'Draggable', group: 'Drag Source', description: 'Lets a person pick this element up and drop it on an element with Accept Drops on. A see-through copy follows the pointer; the element itself stays put until the graph moves it', portability: 'logic' },
    dragValue: { when: (p) => p.draggable === true, type: '*', coerce: 'none', displayName: 'Drag Value', group: 'Drag Source', description: 'What this element carries — usually the id of the item it shows. A drop zone reports it as Dropped Value', portability: 'logic' },
    dragKind: { when: (p) => p.draggable === true, type: 'string', coerce: 'none', displayName: 'Drag Kind', group: 'Drag Source', description: 'Optional name for what this is — "card", "task". A zone with an Accept Kind only takes sources whose Drag Kind matches', portability: 'logic' },
    holdToDrag: { when: (p) => p.draggable === true, type: 'enum', enums: ['touch', 'always', 'never'], default: 'touch', coerce: 'none', displayName: 'Hold To Drag', group: 'Drag Source', description: 'Whether a press must be held before it picks up. On touch (the default) a finger holds for Hold Time while a ring fills, so a moving finger still scrolls; a mouse picks up as soon as it moves', portability: 'logic' },
    holdTime: { when: (p) => p.draggable === true, type: 'number', default: 0.5, coerce: 'none', displayName: 'Hold Time', group: 'Drag Source', description: 'How long a held press takes to pick up, in seconds', portability: 'logic' },
    acceptDrops: { type: 'boolean', default: false, coerce: 'none', displayName: 'Accept Drops', group: 'Drop Zone', description: 'Lets a Draggable element be dropped here, which reveals the Drop Zone outputs. The innermost zone under the pointer takes the drop', portability: 'logic' },
    acceptKind: { when: (p) => p.acceptDrops === true, type: 'string', coerce: 'none', displayName: 'Accept Kind', group: 'Drop Zone', description: 'Comma-separated Drag Kinds this zone takes; leave blank to take any Draggable. A source of another kind never lights this zone up', portability: 'logic', examples: ['card', 'task, card', 'note', ''] },
    makeRoom: { when: (p) => p.acceptDrops === true, type: 'boolean', default: true, coerce: 'none', displayName: 'Make Room', group: 'Drop Zone', description: 'Slides the children apart to open a gap where the drop will land, while it hovers. Off keeps the children still and only reports Drop Index', portability: 'logic' },
    dropZoneName: { when: (p) => p.acceptDrops === true, type: 'string', coerce: 'none', displayName: 'Zone Name', group: 'Drop Zone', description: "What a screen reader hears this zone called while a card is moved with the keyboard — \"Thursday\". Falls back to the element's accessible label", portability: 'logic' },
    acceptFileDrops: { type: 'boolean', default: false, coerce: 'none', displayName: 'Accept File Drops', group: 'File Drop', description: 'Lets a file dragged from the desktop be dropped onto this element, which reveals the File Drop outputs below', portability: 'logic' },
    acceptedFileTypes: { when: (p) => p.acceptFileDrops === true, type: 'string', coerce: 'none', displayName: 'Accepted file types', group: 'File Drop', description: 'Comma-separated extensions or MIME types this element will take — ".png, .jpg" or "image/*"; leave blank to accept every file. A drop of nothing but rejected files fires Files Rejected instead of Files Dropped', portability: 'logic', examples: ['.png', 'image/*', ' .PDF , image/', 'application/pdf', ''] },
    // video.ts :119-146 — `resolveMediaSource`, then the element the frame's end draws (Video.tsx :236-305)
    src: {
      type: 'string',
      coerce: 'none',
      displayName: 'Source',
      group: 'Video',
      description:
        'What to play: an mp4, webm or ogg URL, a file in your project, or a YouTube or Vimeo link. A YouTube or Vimeo link is recognised automatically and plays in an embedded player, where Play, Pause, Reset and the failure outputs do not apply. Leave blank to load nothing rather than fail on a missing source',
      portability: 'logic',
      examples: ['clip.mp4', '/media/b.webm', 'https://youtu.be/dQw4w9WgXcQ', 'https://vimeo.com/76979871', 'youtu.be/abc', '']
    },
    // video.ts :35-47 — on the component (`withInnerComponent`)
    srcObject: { type: 'mediastream', default: null, coerce: 'none', displayName: 'Source Object', group: 'Video', description: 'A live MediaStream to play, from a camera or screen capture, instead of a URL', portability: 'logic' },
    // video.ts :48-117 — on the component, or waiting for it (`outcomeOnInnerComponent`)
    play: { type: 'signal', outcome: true, displayName: 'Play', group: 'Video Actions', description: 'Starts or resumes playback; fired before the element exists, it is held until the element exists rather than dropped', portability: 'logic' },
    restart: { type: 'signal', outcome: true, displayName: 'Restart', group: 'Video Actions', description: 'Seeks to Start Time (the beginning when there is none) and plays, then fires Done', portability: 'logic' },
    pause: { type: 'signal', outcome: true, displayName: 'Pause', group: 'Video Actions', description: 'Pauses playback', portability: 'logic' },
    reset: { type: 'signal', outcome: true, displayName: 'Reset', group: 'Video Actions', description: 'Stops playback and seeks to Start Time (the beginning when there is none)', portability: 'logic' },
    poster: { type: 'image', coerce: 'none', displayName: 'Poster', group: 'Video', description: 'Still image shown until the video has enough data to play; leave blank to show nothing', portability: 'logic' },
    // video.ts :158-231 — on the element (`propPath: 'dom'`), drawn at the frame's end
    autoplay: { type: 'boolean', coerce: 'none', displayName: 'Autoplay', group: 'Video', description: 'Starts playing as soon as the video can; most browsers only allow this while Muted is on. On a YouTube or Vimeo link it is muted automatically for that reason, because an embedded player cannot report that the browser refused', portability: 'logic' },
    startTime: { type: 'number', coerce: 'none', displayName: 'Start Time', group: 'Video', description: 'Seconds into the video to begin at; leave blank to start at the beginning. Works for a video file, for YouTube and for Vimeo', portability: 'logic' },
    endTime: { type: 'number', coerce: 'none', displayName: 'End Time', group: 'Video', description: 'Seconds at which to stop; leave blank to play to the end. Ignored if it is not later than Start Time, and browsers vary in how strictly they honour it while Loop is on. ⚠️ Approximate on YouTube, and ignored entirely on Vimeo, whose embedded player has no end setting', portability: 'logic' },
    controls: { type: 'boolean', coerce: 'none', displayName: 'Controls', group: 'Video', description: "Shows the browser's own play, seek and volume controls", portability: 'logic' },
    volume: { type: 'number', default: 1, coerce: 'none', displayName: 'Volume', group: 'Video', description: 'Playback volume from 0 to 1', portability: 'logic' },
    muted: { type: 'boolean', coerce: 'none', displayName: 'Muted', group: 'Video', description: 'Silences the video without changing Volume, and is what lets Autoplay work', portability: 'logic' },
    loop: { type: 'boolean', coerce: 'none', displayName: 'Loop', group: 'Video', description: 'Restarts the video automatically when it reaches the end', portability: 'logic' },

    // ---- look and layout (R10): stored, written to the style, read by no output; each with its class (visual-params.json) ----
    // (Visible, Opacity and Pointer Events Mode are read by the page: the hit test)
  alignX: { type: "enum", enums: ["left", "center", "right"], coerce: 'none', displayName: "Align X", group: "Alignment", description: "Horizontal alignment of this element within the space its parent gives it", portability: "layout-shared", layout: 'align-x' },
  alignY: { type: "enum", enums: ["top", "center", "bottom"], coerce: 'none', displayName: "Align Y", group: "Alignment", description: "Vertical alignment of this element within the space its parent gives it", portability: "layout-shared", layout: 'align-y' },
  borderBottomColor: { when: (p) => p.borderBottomStyle === 'solid' || p.borderBottomStyle === 'dashed' || p.borderBottomStyle === 'dotted' || p.borderStyle === 'solid' || p.borderStyle === 'dashed' || p.borderStyle === 'dotted', type: "color", coerce: 'none', displayName: "Border Color", group: "Border Style", description: "Colour of the bottom edge only, overriding Border Color", portability: "look-shared" },
  borderBottomLeftRadius: { type: "number", coerce: 'none', displayName: "Corner Radius", group: "Corner Radius", description: "Rounds the bottom-left corner only, overriding Corner Radius", portability: "look-shared" },
  borderBottomRightRadius: { type: "number", coerce: 'none', displayName: "Corner Radius", group: "Corner Radius", description: "Rounds the bottom-right corner only, overriding Corner Radius", portability: "look-shared" },
  borderBottomStyle: { type: "enum", enums: ["none", "solid", "dotted", "dashed"], coerce: 'none', displayName: "Border Style", group: "Border Style", description: "Line style for the bottom edge only, overriding Border Style; None hides that edge", portability: "look-expressible", layout: 'border-bottom-style' },
  borderBottomWidth: { when: (p) => p.borderBottomStyle === 'solid' || p.borderBottomStyle === 'dashed' || p.borderBottomStyle === 'dotted' || p.borderStyle === 'solid' || p.borderStyle === 'dashed' || p.borderStyle === 'dotted', type: "number", coerce: 'none', displayName: "Border Width", group: "Border Style", description: "Thickness of the bottom edge in pixels, and it adds to the element's size", portability: "look-shared", layout: 'border-bottom-width' },
  borderColor: { when: (p) => p.borderStyle === 'solid' || p.borderStyle === 'dashed' || p.borderStyle === 'dotted', type: "color", default: "#000000", coerce: 'none', displayName: "Border Color", group: "Border Style", description: "Colour of the border, which has no effect while Border Style is None", portability: "look-shared" },
  borderLeftColor: { when: (p) => p.borderLeftStyle === 'solid' || p.borderLeftStyle === 'dashed' || p.borderLeftStyle === 'dotted' || p.borderStyle === 'solid' || p.borderStyle === 'dashed' || p.borderStyle === 'dotted', type: "color", coerce: 'none', displayName: "Border Color", group: "Border Style", description: "Colour of the left edge only, overriding Border Color", portability: "look-shared" },
  borderLeftStyle: { type: "enum", enums: ["none", "solid", "dotted", "dashed"], coerce: 'none', displayName: "Border Style", group: "Border Style", description: "Line style for the left edge only, overriding Border Style; None hides that edge", portability: "look-expressible", layout: 'border-left-style' },
  borderLeftWidth: { when: (p) => p.borderLeftStyle === 'solid' || p.borderLeftStyle === 'dashed' || p.borderLeftStyle === 'dotted' || p.borderStyle === 'solid' || p.borderStyle === 'dashed' || p.borderStyle === 'dotted', type: "number", coerce: 'none', displayName: "Border Width", group: "Border Style", description: "Thickness of the left edge in pixels, and it adds to the element's size", portability: "look-shared", layout: 'border-left-width' },
  borderRadius: { type: "number", default: 0, coerce: 'none', displayName: "Corner Radius", group: "Corner Radius", description: "Rounds all four corners, except any corner that sets its own radius", portability: "look-shared" },
  borderRightColor: { when: (p) => p.borderRightStyle === 'solid' || p.borderRightStyle === 'dashed' || p.borderRightStyle === 'dotted' || p.borderStyle === 'solid' || p.borderStyle === 'dashed' || p.borderStyle === 'dotted', type: "color", coerce: 'none', displayName: "Border Color", group: "Border Style", description: "Colour of the right edge only, overriding Border Color", portability: "look-shared" },
  borderRightStyle: { type: "enum", enums: ["none", "solid", "dotted", "dashed"], coerce: 'none', displayName: "Border Style", group: "Border Style", description: "Line style for the right edge only, overriding Border Style; None hides that edge", portability: "look-expressible", layout: 'border-right-style' },
  borderRightWidth: { when: (p) => p.borderRightStyle === 'solid' || p.borderRightStyle === 'dashed' || p.borderRightStyle === 'dotted' || p.borderStyle === 'solid' || p.borderStyle === 'dashed' || p.borderStyle === 'dotted', type: "number", coerce: 'none', displayName: "Border Width", group: "Border Style", description: "Thickness of the right edge in pixels, and it adds to the element's size", portability: "look-shared", layout: 'border-right-width' },
  borderStyle: { type: "enum", enums: ["none", "solid", "dotted", "dashed"], default: "none", coerce: 'none', displayName: "Border Style", group: "Border Style", description: "Line style for all four edges; None hides the border and leaves Border Width and Color inactive", portability: "look-expressible", layout: 'border-style' },
  borderTopColor: { when: (p) => p.borderTopStyle === 'solid' || p.borderTopStyle === 'dashed' || p.borderTopStyle === 'dotted' || p.borderStyle === 'solid' || p.borderStyle === 'dashed' || p.borderStyle === 'dotted', type: "color", coerce: 'none', displayName: "Border Color", group: "Border Style", description: "Colour of the top edge only, overriding Border Color", portability: "look-shared" },
  borderTopLeftRadius: { type: "number", coerce: 'none', displayName: "Corner Radius", group: "Corner Radius", description: "Rounds the top-left corner only, overriding Corner Radius", portability: "look-shared" },
  borderTopRightRadius: { type: "number", coerce: 'none', displayName: "Corner Radius", group: "Corner Radius", description: "Rounds the top-right corner only, overriding Corner Radius", portability: "look-shared" },
  borderTopStyle: { type: "enum", enums: ["none", "solid", "dotted", "dashed"], coerce: 'none', displayName: "Border Style", group: "Border Style", description: "Line style for the top edge only, overriding Border Style; None hides that edge", portability: "look-expressible", layout: 'border-top-style' },
  borderTopWidth: { when: (p) => p.borderTopStyle === 'solid' || p.borderTopStyle === 'dashed' || p.borderTopStyle === 'dotted' || p.borderStyle === 'solid' || p.borderStyle === 'dashed' || p.borderStyle === 'dotted', type: "number", coerce: 'none', displayName: "Border Width", group: "Border Style", description: "Thickness of the top edge in pixels, and it adds to the element's size", portability: "look-shared", layout: 'border-top-width' },
  borderWidth: { when: (p) => p.borderStyle === 'solid' || p.borderStyle === 'dashed' || p.borderStyle === 'dotted', type: "number", default: 2, coerce: 'none', displayName: "Border Width", group: "Border Style", description: "Thickness of the border in pixels, which adds to the element's size unless Box Sizing accounts for it", portability: "look-shared", layout: 'border-width' },
  cssClassName: { type: "string", default: "", coerce: 'none', displayName: "CSS Class", group: "Advanced HTML", description: "Extra CSS class names to put on this element, for styling from a stylesheet you supply", portability: "web-only" },
  dataAttributes: { type: "stringlist", coerce: 'none', editOnly: true, displayName: "Data Attributes", group: "Data Attributes", description: "data-* names (data-testid) for tests and scripts to find this element by; each gets a value input", portability: "web-only" },
  height: { when: (p) => p.sizeMode === 'explicit' || p.sizeMode === 'contentWidth', type: "dimension", default: 100, coerce: 'none', displayName: "Height", group: "Dimensions", description: "Height of the element; how the value is read depends on Size Mode", portability: "layout-shared", layout: 'height' },
  marginBottom: { type: "number", coerce: 'none', displayName: "Margin Bottom", group: "Margin and padding", description: "Space outside the element's bottom edge, between it and its neighbours", portability: "layout-expressible", layout: 'margin-bottom' },
  marginLeft: { type: "number", coerce: 'none', displayName: "Margin Left", group: "Margin and padding", description: "Space outside the element's left edge, between it and its neighbours", portability: "layout-expressible", layout: 'margin-left' },
  marginRight: { type: "number", coerce: 'none', displayName: "Margin Right", group: "Margin and padding", description: "Space outside the element's right edge, between it and its neighbours", portability: "layout-expressible", layout: 'margin-right' },
  marginTop: { type: "number", coerce: 'none', displayName: "Margin Top", group: "Margin and padding", description: "Space outside the element's top edge, between it and its neighbours", portability: "layout-expressible", layout: 'margin-top' },
  maxHeight: { type: "number", coerce: 'none', displayName: "Max Height", group: "Dimension Constraints", description: "Largest height the element may grow to, taking priority over Height", portability: "layout-shared", layout: 'max-height' },
  maxWidth: { type: "number", coerce: 'none', displayName: "Max Width", group: "Dimension Constraints", description: "Largest width the element may grow to, taking priority over Width", portability: "layout-shared", layout: 'max-width' },
  minHeight: { type: "number", coerce: 'none', displayName: "Min Height", group: "Dimension Constraints", description: "Smallest height the element may shrink to, taking priority over Height", portability: "layout-shared", layout: 'min-height' },
  minWidth: { type: "number", coerce: 'none', displayName: "Min Width", group: "Dimension Constraints", description: "Smallest width the element may shrink to, taking priority over Width", portability: "layout-shared", layout: 'min-width' },
  mixBlendMode: { type: "enum", enums: ["normal", "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion", "hue", "saturation", "color", "luminosity"], default: "normal", coerce: 'none', displayName: "Blend Mode", group: "Style", description: "How this element's colours blend with whatever is painted behind it", portability: "look-expressible" },
  opacity: { type: "number", default: 1, coerce: 'none', displayName: "Opacity", group: "Style", description: "How opaque this element is, from 0 for invisible to 1 for solid", portability: "look-shared" },
  pointerEventsMode: { type: "enum", enums: ["inherit", "explicit"], default: "inherit", coerce: 'none', displayName: "Pointer Events Mode", group: "Pointer Events", description: "Whether pointer handling is inherited from the parent or set explicitly on this element", portability: "web-only" },
  position: { type: "enum", enums: ["relative", "absolute", "sticky", "fixed"], default: "relative", coerce: 'none', displayName: "Position", group: "Layout", description: "How the element is placed: In Layout follows its siblings, Absolute ignores them, Sticky pins to the parent edge on overflow, Fixed stays put and takes no space", portability: "layout-expressible", layout: 'place' },
  sizeMode: { type: "enum", enums: ["explicit", "contentWidth", "contentHeight", "contentSize"], default: "contentSize", coerce: 'none', editOnly: true, displayName: "Size Mode", group: "Dimensions", description: "Whether Width and Height are used as given, or the element sizes itself to fit its contents", portability: "layout-shared", layout: 'size-mode' },
  styleCss: { type: "string", default: "/* background-color: red; */", coerce: 'none', editOnly: true, displayName: "CSS Style", group: "Advanced HTML", description: "Raw CSS declarations applied to this element, overriding the styling ports above", portability: "web-only" },
  transformOriginX: { type: "number", default: "50", coerce: 'none', displayName: "Transform Origin X", group: "Placement", description: "Horizontal point the element rotates and scales around, as a fraction of its width", portability: "layout-shared", layout: 'origin-x' },
  transformOriginY: { type: "number", default: "50", coerce: 'none', displayName: "Transform Origin Y", group: "Placement", description: "Vertical point the element rotates and scales around, as a fraction of its height", portability: "layout-shared", layout: 'origin-y' },
  transformRotation: { type: "number", default: 0, coerce: 'none', displayName: "Rotation", group: "Placement", description: "Rotates the element clockwise in degrees, without affecting the layout", portability: "layout-shared", layout: 'rotation' },
  transformScale: { type: "number", default: 1, coerce: 'none', displayName: "Scale", group: "Placement", description: "Scales the element about its transform origin; 1 leaves it unscaled", portability: "layout-shared", layout: 'scale' },
  transformX: { type: "number", default: 0, coerce: 'none', displayName: "Pos X", group: "Placement", description: "Moves the element right after layout, without moving its siblings", portability: "layout-shared", layout: 'translate-x' },
  transformY: { type: "number", default: 0, coerce: 'none', displayName: "Pos Y", group: "Placement", description: "Moves the element down after layout, without moving its siblings", portability: "layout-shared", layout: 'translate-y' },
  variant: { type: "string", coerce: 'none', displayName: "Variant", group: "General", description: "Name of a saved variant of this node type to apply, replacing the styling set here", portability: "look-shared" },
  visible: { type: "boolean", default: true, coerce: 'none', displayName: "Visible", group: "Style", description: "Hides the element while keeping the space it occupies in the layout", portability: "look-shared" },
  width: { when: (p) => p.sizeMode === 'explicit' || p.sizeMode === 'contentHeight', type: "dimension", default: 100, coerce: 'none', displayName: "Width", group: "Dimensions", description: "Width of the element; how the value is read depends on Size Mode", portability: "layout-shared", layout: 'width' },
  zIndex: { type: "number", coerce: 'none', displayName: "zIndex", group: "Style", description: "Paint order among overlapping siblings; higher numbers paint on top", portability: "look-shared" },
  objectFit: { type: "enum", enums: ["contain", "cover", "fill", "none"], default: "contain", coerce: 'none', displayName: "Object Fit", group: "Video Layout", description: "How the video fills its box when the two have different proportions", portability: "look-shared", layout: 'content' },
  objectPositionX: { type: "number", default: 50, coerce: 'none', displayName: "Video Position X", group: "Video Layout", description: "Which part of the video stays visible horizontally when Object Fit crops it", portability: "look-expressible" },
  objectPositionY: { type: "number", default: 50, coerce: 'none', displayName: "Video Position Y", group: "Video Layout", description: "Which part of the video stays visible vertically when Object Fit crops it", portability: "look-expressible" },
  },

  outputs: {
    // video.ts :264-345 — the media element's, through the component
    onCanPlay: { type: 'signal', displayName: 'On Can Play', group: 'Events', description: 'Fires once enough of the video has loaded to start playing' },
    onTimeUpdate: { type: 'number', from: (s: State) => s.timeOut, displayName: 'Playback Position', group: 'Playback', description: 'How far into the video playback has reached, in seconds' },
    onPlay: { type: 'signal', displayName: 'On Play', group: 'Events', description: 'Fires when playback starts or resumes' },
    onPause: { type: 'signal', displayName: 'On Pause', group: 'Events', description: 'Fires when playback pauses' },
    onPlaybackFailure: { type: 'signal', displayName: 'Playback Failure', group: 'Events', description: 'Fires when the video could not be loaded or played, after the reason has been reported on Error' },
    playbackError: { type: 'string', from: (s: State) => s.playbackError, displayName: 'Error', group: 'Error', description: 'Why playback failed — either the browser refused to autoplay, or the source could not be decoded' },
    onVideoElementCreated: { type: 'domelement', from: (s: State) => s.domElement, displayName: 'DOM Element', group: 'Advanced', description: 'The underlying video element, for a Group to scroll to or a script to reach' },
    videoWidth: { type: 'number', from: (s: State) => s.videoWidth, displayName: 'Video Width', group: 'Playback', description: 'Natural width of the video in pixels, known once it has loaded' },
    videoHeight: { type: 'number', from: (s: State) => s.videoHeight, displayName: 'Video Height', group: 'Playback', description: 'Natural height of the video in pixels, known once it has loaded' },
  didMount: { type: "signal", displayName: "Did Mount", group: "Mounted", description: "Fires once this element has been added to the page and can be measured" },
  dragCancelled: { when: (p) => p.draggable === true, type: "signal", displayName: "Cancelled", group: "Drag Source", description: "Fires when a lifted element is let go over nothing that takes it, or Escape puts it back" },
  dropped: { when: (p) => p.acceptDrops === true, type: "signal", displayName: "Dropped", group: "Drop Zone", description: "Fires when a Draggable is dropped here, after Dropped Value and Drop Index are up to date. Move the data here — the engine moves nothing" },
  filesDropped: { when: (p) => p.acceptFileDrops === true, type: "signal", displayName: "Files Dropped", group: "File Drop", description: "Fires when one or more accepted files are dropped here, after every File Drop output is up to date" },
  filesRejected: { when: (p) => p.acceptFileDrops === true, type: "signal", displayName: "Files Rejected", group: "File Drop", description: "Fires when a drop landed here but every file in it was excluded by Accepted file types" },
  hoverEnd: { type: "signal", displayName: "Hover End", group: "Hover Events", description: "Fires when the pointer leaves this element" },
  hoverStart: { type: "signal", displayName: "Hover Start", group: "Hover Events", description: "Fires when the pointer moves over this element or any of its children" },
  landed: { when: (p) => p.draggable === true, type: "signal", displayName: "Landed", group: "Drag Source", description: "Fires when this element is dropped on a zone that took it, after the zone's Dropped" },
  onClick: { type: "signal", displayName: "Click", group: "Events", description: "Fires when this element is clicked or tapped" },
  pickedUp: { when: (p) => p.draggable === true, type: "signal", displayName: "Picked Up", group: "Drag Source", description: "Fires when this element is lifted — after the hold on touch, on the first move with a mouse, on Space from the keyboard" },
  pointerDown: { type: "signal", displayName: "Pointer Down", group: "Pointer Events", description: "Fires when a mouse button is pressed or a finger touches this element" },
  pointerEnter: { type: "signal", displayName: "Pointer Enter", group: "Pointer Events", description: "Fires when the pointer moves onto this element, not counting its children" },
  pointerUp: { type: "signal", displayName: "Pointer Up", group: "Pointer Events", description: "Fires when the mouse button is released or the finger lifts over this element" },
  willUnmount: { type: "signal", displayName: "Will Unmount", group: "Mounted", description: "Fires just before this element is removed from the page, while it still exists" },
    // react-component-node.ts :1428-1444 — no Children Count: `allowChildren` is false (video.ts :29)
    childIndex: { type: 'number', from: () => 0, displayName: 'Child Index', group: 'Advanced', description: "This element's position among its parent's children, counting from 0" },
    this: { type: 'reference', from: () => SELF_REFERENCE, displayName: 'This', group: 'Advanced', description: 'A reference to this node itself, for ports that take a node rather than a value' },
    screenPositionX: { type: 'number', from: () => undefined, displayName: 'Screen Position X', group: 'Bounding Box', description: "Distance in pixels from the left edge of the window to this element's left edge" },
    screenPositionY: { type: 'number', from: () => undefined, displayName: 'Screen Position Y', group: 'Bounding Box', description: "Distance in pixels from the top edge of the window to this element's top edge" },
    boundingWidth: { type: 'number', from: () => undefined, displayName: 'Width', group: 'Bounding Box', description: 'Width this element actually ended up with after layout, in pixels' },
    boundingHeight: { type: 'number', from: () => undefined, displayName: 'Height', group: 'Bounding Box', description: 'Height this element actually ended up with after layout, in pixels' },
    isLifted: { when: (p) => p.draggable === true, type: 'boolean', from: (s: State) => s.isLifted, displayName: 'Is Lifted', group: 'Drag Source', description: 'True while this element is being dragged' },
    droppedValue: { when: (p) => p.acceptDrops === true, type: '*', from: (s: State) => s.droppedValue, displayName: 'Dropped Value', group: 'Drop Zone', description: 'The Drag Value of the element dropped here' },
    dropIndex: { when: (p) => p.acceptDrops === true, type: 'number', from: (s: State) => s.dropIndex, displayName: 'Drop Index', group: 'Drop Zone', description: "Where among this zone's children it landed, counting from 0 and leaving the dropped element itself out — so it is the index to insert at once it is removed from where it was" },
    isDropTarget: { when: (p) => p.acceptDrops === true, type: 'boolean', from: (s: State) => s.isDropTarget, displayName: 'Drag Over', group: 'Drop Zone', description: 'True while something this zone takes is held over it — wire it to a background or border so the zone lights up' },
    droppedFile: { when: (p) => p.acceptFileDrops === true, type: '*', from: (s: State) => s.droppedFile, displayName: 'File', group: 'File Drop', description: 'The first accepted file, in the form an Upload File node takes' },
    droppedFiles: { when: (p) => p.acceptFileDrops === true, type: 'array', from: (s: State) => s.droppedFiles, displayName: 'Files', group: 'File Drop', description: 'Every accepted file in the drop, as an array — a drop can carry more than one' },
    droppedFileName: { when: (p) => p.acceptFileDrops === true, type: 'string', from: (s: State) => firstFile(s, 'name'), displayName: 'File Name', group: 'File Drop', description: 'Name of the first accepted file, extension included' },
    droppedFileType: { when: (p) => p.acceptFileDrops === true, type: 'string', from: (s: State) => firstFile(s, 'type'), displayName: 'File Type', group: 'File Drop', description: 'MIME type the browser reports for the first accepted file, blank for one it does not recognise' },
    droppedFileSizeInBytes: { when: (p) => p.acceptFileDrops === true, type: 'number', from: (s: State) => firstFile(s, 'size'), displayName: 'File Size In Bytes', group: 'File Drop', description: 'Size of the first accepted file, in bytes' },
    isDragOver: { when: (p) => p.acceptFileDrops === true, type: 'boolean', from: (s: State) => s.isDragOver, displayName: 'Is Dragging Over', group: 'File Drop', description: 'True while a file is being dragged over this element — wire it to a border or background so the drop zone reacts' }
  }
}).on(
  {
    // NSP-018 (s77): the words. The fifteen shared visual reducers say what the Image's say (image.ts — the agreed house style), word
    // for word, since the Video holds the Image's pointer, keyboard, drag and drop rules (THE RULE above); only the media and playback
    // ports are the Video's own
    // react-component-node.ts :2283-2294 — what the node wants; the page follows at the next paint. The value it holds already: nothing
    mounted: (s, v) =>
      !!v !== s.mounted
        ? { says: 'a change: the element is put on the page, or taken off it, at the next paint', set: { mounted: !!v }, send: [] }
        : { says: 'the value it already holds: nothing', send: [] },
    // react-component-node.ts :1380-1395 — scrolls; nothing on the wire
    scrollIntoView: () => ({ says: 'always: the page, or the scrolling Group holding it, scrolls until the element can be seen', send: [] }),
    visible: (_s, v) => ({ says: 'always: shown or hidden at the next paint, its space kept; hidden, it takes no pointer', set: { visible: !!v }, send: [] }),
    // Video.tsx :214 — the style holds the value as written; compared with the number 0
    opacity: (_s, v) => ({ says: 'always: how see-through it is; at exactly 0 it takes no pointer, and an act goes to what is behind it', set: { opacityZero: v === 0 }, send: [] }),
    // react-component-node.ts :772-781 — `inherit` removes the style; anything else writes it from the last Enabled (`auto` before one)
    pointerEventsMode: (s, v) =>
      v === 'inherit'
        ? { says: 'Inherit: its own pointer style comes off', set: { peStyle: undefined }, send: [] }
        : { says: 'Explicit: the last Pointer Events Enabled is written back (on, before one was set)', set: { peStyle: s.peEnabled === false ? 'none' : 'auto' }, send: [] },
    pointerEventsEnabled: (_s, v) => ({ says: 'always, whatever the mode: off, the pointer passes through to what is behind it', set: { peEnabled: !!v, peStyle: v ? 'auto' : 'none' }, send: [] }),
    // drag-drop.ts `setDraggable`, `elementChanged` — the attributes go on every element the node has while Draggable is on (a
    // remount, a new Tag, a mount however late), and come off the one on the page with it (row C77, fixed in P109 ISL-031)
    draggable: (_s, v) => ({ says: 'always: on, every element it draws can be picked up, by pointer or keyboard; off, the one on the page cannot', set: { draggable: !!v }, send: [] }),
    // read by the zone it is dropped on: this page's only zone is itself, and a drag never takes its own node (C78, fixed in P109 ISL-031)
    dragValue: () => ({ says: 'always: read by the zone it is dropped on, which reports it as Dropped Value', send: [] }),
    dragKind: () => ({ says: 'always: read by a zone with an Accept Kind as it is dragged over one', send: [] }),
    holdToDrag: (_s, v) => ({ says: 'always: read at the next press — whether it must be held before it picks up', set: { holdToDrag: v }, send: [] }),
    holdTime: (_s, v) => ({ says: 'always: read at the next held press — how many seconds it is held before it picks up', set: { holdTime: v }, send: [] }),
    // drag-drop.ts :112-120 — off while the gesture is over this zone: it leaves it (`leaveZone` :489-512)
    acceptDrops: (s, v) => {
      if (v) return { says: 'on: a Draggable can be dropped here', set: { acceptDrops: true }, send: [] };
      if (s.inZone) return { says: 'off while a drag is over it: the drag leaves it — Is Drop Target goes false', set: { acceptDrops: false, inZone: false, isDropTarget: false }, send: ['isDropTarget'] };
      return { says: 'off: nothing can be dropped here', set: { acceptDrops: false }, send: [] };
    },
    acceptKind: (_s, v) => ({ says: 'always: read as a drag comes over it — a source of another kind does not light it up', set: { acceptKind: v }, send: [] }),
    // C81 (fixed in P109 ISL-038): switched off, the zone forgets the count and goes dark — it could not hear the leave
    acceptFileDrops: (s, v) =>
      v
        ? { says: 'on: a file dragged from the desktop can be dropped here', set: { acceptFileDrops: true }, send: [] }
        : {
            says: 'off: no file can be dropped here, and a drag over it is forgotten — Is Dragging Over goes false if it was true',
            set: { acceptFileDrops: false, dragDepth: 0, isDragOver: false },
            send: s.isDragOver ? ['isDragOver'] : []
          },
    acceptedFileTypes: (_s, v) => ({ says: 'always: read at a drop — which files count as accepted', set: { acceptedFileTypes: v }, send: [] }),
    // video.ts :130-133 — `resolveMediaSource`; the frame's end draws it (`paintedElement`: a new file address loads again, one taken
    // away loads nothing, a move between a file and an embed makes a new element)
    src: (_s, v) => ({ says: 'always: what is drawn at the end of the frame — a project file or a URL as a video, a YouTube or Vimeo link in an embedded player, or nothing; a different file loads afresh, paused and back at the start', set: { source: mediaSource(v) }, send: [] }),
    // :158-231 — held by the node; the frame's end draws them. Start Time and End Time go into the address the video loads from
    // (media-fragment.ts `#t=`), so a change that moves it is a new address: a load (paused, back at the start)
    startTime: (_s, v) => ({ says: 'always: where the video begins, put into the address it loads from (blank: the start; below 0 is 0); a change that moves it loads the video again at the next paint, paused', set: { startTime: v }, send: [] }),
    endTime: (_s, v) => ({ says: 'always: where the first play-through stops, put into the address with Start Time (ignored unless later than Start Time; approximate on YouTube, ignored on Vimeo); a change that moves it loads the video again at the next paint, paused', set: { endTime: v }, send: [] }),
    muted: (_s, v) => ({ says: 'always: drawn at the next paint — on, the video is silent, and Play or Autoplay may start it before a person has pressed, clicked or typed on the page', set: { muted: v }, send: [] }),
    autoplay: (_s, v) => ({ says: 'always: drawn at the next paint, and read as a load completes — on, a video that may play (Muted, or a person has acted on the page) and that Pause or Reset has not stopped since the load began starts by itself: On Can Play, then On Play', set: { autoplay: v }, send: [] }),
    loop: (_s, v) => ({ says: 'always: drawn at the next paint, and read as the video reaches its end — on, it goes back to the start and plays on; off, it pauses there (On Pause)', set: { loop: v }, send: [] }),
    // :35-47 — on the component, or waiting for it with the actions (`sourceObject`: only a `<video>` takes one, and only nothing is
    // seen to change it; C96, C99 on the runtime)
    srcObject: (s, v) => {
      if (!s.onPage) return said('off the page: waits for the element behind the actions already waiting, in order, and is written at the paint that puts the video there (at most 16 wait, and the oldest is pushed out)', toPatch(waitFor(s, { srcObject: v })));
      if (s.kind !== 'video' || v !== undefined) return { says: 'null (what it already has), a value that is not a stream, or anything on an embedded player: nothing changes — a live stream itself plays in place of Source, and no scenario holds one', set: {}, send: [], emit: [] };
      return said('nothing (undefined) on a video: the browser is handed null, so it loads Source again — paused, back at the start (Playback Position 0 when it had moved) — and Play waits for the new On Can Play before it can start it', toPatch(sourceObject(s, v)));
    },
    // video.ts :48-117, Video.tsx :177-201 — the four actions: on the component now, or waiting for it (react-component-node.ts :2060-2101)
    play: (s) =>
      s.onPage
        ? said('on the page: wants the video playing and, once it has loaded, starts it — On Play if it was paused (from the start again after its end); Error then Playback Failure if the browser refuses (not Muted and no person has acted on the page) or the load failed; an embedded player is not reached — Done, in its turn after outcomes the frame has already resolved', acted(s, 'play'))
        : said('off the page: waits for the element (at most 16 wait, and the oldest pushed out reports Failure) and plays at the paint that puts the video there — Done then', waits(s, 'play')),
    restart: (s) =>
      s.onPage
        ? said('on the page: wants the video playing and, once it has loaded, goes back to Start Time as last drawn (Playback Position; second 0 when there is none) and starts it as Play does; before the load, only the wanting; an embedded player is not reached — Done, in its turn after outcomes the frame has already resolved', acted(s, 'restart'))
        : said('off the page: waits for the element (at most 16 wait, and the oldest pushed out reports Failure) and restarts at the paint that puts the video there — Done then', waits(s, 'restart')),
    pause: (s) =>
      s.onPage
        ? said('on the page: stops wanting the video playing, and pauses one that is playing — Playback Position, then On Pause; one already paused stays so; Autoplay no longer starts it on this load; an embedded player is not reached — Done, in its turn after outcomes the frame has already resolved', acted(s, 'pause'))
        : said('off the page: waits for the element (at most 16 wait, and the oldest pushed out reports Failure) and pauses at the paint that puts the video there — Done then', waits(s, 'pause')),
    reset: (s) =>
      s.onPage
        ? said('on the page: stops wanting the video playing, goes back to Start Time as last drawn (Playback Position, once loaded; second 0 when there is none) and pauses it — On Pause if it was playing; Autoplay no longer starts it on this load; an embedded player is not reached — Done, in its turn after outcomes the frame has already resolved', acted(s, 'reset'))
        : said('off the page: waits for the element (at most 16 wait, and the oldest pushed out reports Failure) and resets at the paint that puts the video there — Done then', waits(s, 'reset'))
  },
  {
    world: {
      // placed on the page with its params set — the first render: the element the Source names, Did Mount
      place: (s) => {
        const p = painted(s);
        return { set: p.set, send: p.send, emit: p.emit };
      },
      timer: (s, _i, tag) => {
        if (tag === 'unswallow') return { set: { swallow: false }, send: [] };
        if (tag === 'hold' && s.phase === 'holding') return toPatch(lifted(s) as Act);
        return NOTHING;
      }
    },
    // the frame's end: the paint (which runs what waited, at a mount); the frame's outcomes in the order they were resolved (`ran` first)
    afterInputs: (s) => {
      const p = painted(s);
      return toPatch({ set: { ...p.set, ran: [] }, send: p.send, emit: p.emit, outcomes: [...s.ran, ...(p.outcomes ?? [])] });
    },
    person: {
      hover: (s) => pointerAct(s, (p) => (inEmbed(p) ? NONE : hits(p) ? { ...NONE, emit: ['hoverStart', 'pointerEnter'] } : NONE)),
      leave: (s) => pointerAct(s, (p) => (inEmbed(p) ? NONE : hits(p) ? { ...NONE, emit: ['hoverEnd'] } : NONE)),
      // a mouse button down anywhere on the page is a person's activation (the autoplay policy)
      press: (s) => keepsActivation(s, pointerAct(s, (p) => {
        if (inEmbed(p)) return join(activation(p), { ...NONE, set: takesKeyboard(p) });
        const down = pointerDown(p, 'mouse');
        if (!hits(p)) return join(activation(p), down);
        const after = { ...p, ...down.set };
        return join(activation(p), { ...down, set: { ...down.set, ...takesKeyboard(after) }, emit: [...down.emit, 'pointerDown'] });
      })),
      release: (s) => pointerAct(s, (p) => {
        if (inEmbed(p)) return NONE;
        const up = pointerUp(p, 'mouse');
        return hits(p) ? { ...up, emit: [...up.emit, 'pointerUp'] } : up;
      }),
      click: (s) => keepsActivation(s, pointerAct(s, (p) => {
        if (inEmbed(p)) return join(activation(p), { ...NONE, set: takesKeyboard(p) });
        const down = pointerDown(p, 'mouse');
        const pressedOn: Act = hits(p) ? { ...down, set: { ...down.set, ...takesKeyboard({ ...p, ...down.set }) }, emit: [...down.emit, 'pointerDown'] } : down;
        const mid = { ...p, ...pressedOn.set };
        const up = pointerUp(mid, 'mouse');
        const eaten = { ...mid, ...up.set }.swallow;
        const on: Pulse[] = hits(p) ? (eaten ? ['pointerUp'] : ['pointerUp', 'onClick']) : [];
        return join(activation(p), join(pressedOn, { ...up, set: { ...up.set, ...(eaten ? { swallow: false } : {}) }, emit: [...up.emit, ...on] }));
      })),
      touch: (s) => pointerAct(s, (p) => {
        if (inEmbed(p)) return NONE;
        const down = pointerDown(p, 'touch');
        return hits(p) ? { ...down, emit: [...down.emit, 'pointerDown'] } : down;
      }),
      // a finger lifted is an activation
      lift: (s) => keepsActivation(s, pointerAct(s, (p) => {
        if (inEmbed(p)) return activation(p);
        const up = pointerUp(p, 'touch');
        return join(activation(p), hits(p) ? { ...up, emit: [...up.emit, 'pointerUp'] } : up);
      })),
      focus: (s) => onPainted(s, (p) => ({ ...NONE, set: takesKeyboard(p) })),
      blur: (s) => onPainted(s, (p) => (holdsKeyboard(p) ? { ...NONE, set: { focusedElem: -1 } } : NONE)),
      // a key other than Escape is an activation
      key: (s, _i, value) => keepsActivation(s, onPainted(s, (p) => {
        const f = takesKeyboard(p);
        // the keyboard on an embed: the key goes into the embedded page
        const act = activation(p, value !== 'Escape');
        if (p.kind === 'embed' && holdsKeyboard({ ...p, ...f })) return join(act, { ...NONE, set: f });
        const k = keyDown({ ...p, ...f }, String(value));
        return join(act, { ...k, set: { ...f, ...k.set } });
      })),
      move: (s, _i, value) => pointerAct(s, (p) => (inEmbed(p) ? NONE : pointerMove(p, value === 'touch' ? 'touch' : 'mouse', hits(p)))),
      away: (s, _i, value) => paintedThen(s, (p) => pointerMove(p, value === 'touch' ? 'touch' : 'mouse', false)),
      // the press on a card is an activation, wherever the Video is
      grab: (s, _i, value) => paintedThen(s, (p) => {
        const i = cardIndex(value);
        if (i < 0) return activation(p, false);
        const off: Partial<State> = cardTakesKeyboard(p, i);
        const at = { ...p, ...off };
        const a = busy(at) ? pointerMove(at, 'mouse', false) : { ...NONE, set: { carry: i, carryBy: 'mouse' as const } };
        return join(activation(p), { ...a, set: { ...off, ...a.set } });
      }),
      // … and Space on a card
      pickUp: (s, _i, value) => paintedThen(s, (p) => {
        const i = cardIndex(value);
        if (i < 0) return activation(p, false);
        const off = cardTakesKeyboard(p, i);
        const at = { ...p, ...off };
        const a = busy(at) ? keyDuringGesture(at, ' ') : cardLifted(at, i);
        return join(activation(p), { ...a, set: { ...off, ...a.set } });
      }),
      fileEnter: (s, _i, value) => paintedThen(s, (p) => {
        const carry = p.fileCarry ?? (Array.isArray(value) ? (value as FileLike[]) : []);
        return dragTo({ ...p, fileCarry: carry }, under(p), { fileCarry: carry });
      }),
      fileLeave: (s) => paintedThen(s, (p) => (p.fileCarry === undefined ? NONE : join(dragTo(p, -1), { ...NONE, set: { fileCarry: undefined } }))),
      fileDrop: (s) => paintedThen(s, (p) => {
        if (p.fileCarry === undefined) return NONE;
        const here = under(p);
        const moved = dragTo(p, here);
        const at = { ...p, ...moved.set };
        const end: Act = { ...NONE, set: { fileCarry: undefined, fileOn: -1 } };
        if (here === -1) return join(moved, end);
        return join(join(moved, armed(at) ? fileDropped(at) : fileLeft(at)), end);
      }),
      // THE MEDIA ELEMENT — the browser's side, on the `<video>` on the page, whatever can be seen of it
      loaded: (s, _i, value) => onPainted(s, (p) => (p.kind === 'video' && p.loading ? loaded(p, value) : NONE)),
      failed: (s, _i, value) => onPainted(s, (p) => (p.kind === 'video' && p.loading ? failedLoad(p, value) : NONE)),
      progress: (s, _i, value) => onPainted(s, (p) => (playing(p) ? timeUpdate({ ...NONE, set: { position: Number(value), atEnd: false } }, Number(value)) : NONE)),
      ended: (s) => onPainted(s, (p) => (playing(p) ? endedPlayback(p) : NONE))
    }
  }
);

// ---------------------------------------------------------------------------------------------
// THE ELEMENT — what a Source draws (Video.tsx :236-305)
// ---------------------------------------------------------------------------------------------

/** `resolveMediaSource` (media-source.ts :29-32) then `getAbsoluteUrl` (utils.ts :9-19), the app's base URL `/` (image.ts `mediaSource`). */
function mediaSource(v: unknown): string | undefined {
  if (v === null || v === undefined || v === '') return undefined;
  const url = String(v);
  if (url === '') return undefined;
  return url[0] === '/' || url.includes('://') || url.startsWith('data:') ? url : '/' + url;
}

/** video-embed.ts `youtubeId` / `vimeoId`: a Source that names a YouTube or Vimeo video plays in an embed. */
function kindOf(source: string | undefined): 'video' | 'embed' {
  if (source === undefined) return 'video';
  const youtube = [
    /(?:youtube\.com|youtube-nocookie\.com)\/watch\?(?:[^#]*&)?v=([A-Za-z0-9_-]{6,})/i,
    /youtu\.be\/([A-Za-z0-9_-]{6,})/i,
    /(?:youtube\.com|youtube-nocookie\.com)\/(?:embed|v|shorts)\/([A-Za-z0-9_-]{6,})/i
  ];
  const vimeo = [/player\.vimeo\.com\/video\/(\d+)/i, /vimeo\.com\/(?:channels\/[^/]+\/)?(\d+)/i];
  return [...youtube, ...vimeo].some((p) => p.test(source)) ? 'embed' : 'video';
}

/** media-fragment.ts `seconds`: a finite number of seconds, not below 0, or none. */
function fragmentSeconds(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  if (!isFinite(n)) return undefined;
  return Math.max(0, n);
}

/** Video.tsx :89 — the `<video>`'s `src`: the Source with Start Time and End Time as `#t=` (media-fragment.ts `withMediaFragment`). */
function srcAttrOf(s: Readonly<State>): string | undefined {
  if (s.source === undefined) return undefined;
  const src = s.source;
  const start = fragmentSeconds(s.startTime);
  let end = fragmentSeconds(s.endTime);
  const effectiveStart = start ?? 0.01;
  if (end !== undefined && end <= effectiveStart) end = undefined;
  const existing = src.indexOf('#t=');
  if (start === undefined && end === undefined) return existing === -1 ? `${src}#t=0.01` : src;
  const base = existing === -1 ? src : src.substring(0, existing);
  return end === undefined ? `${base}#t=${effectiveStart}` : `${base}#t=${effectiveStart},${end}`;
}

/** The `<video>`'s flags as drawn (React's `muted`, and `autoplay` / `loop`, Video.tsx :69-77): what each input says, as a truth. */
function drawnFlags(s: Readonly<State>): Partial<State> {
  return { elMuted: !!s.muted, elAutoplay: !!s.autoplay, elLoop: !!s.loop, elStart: s.startTime };
}

/** A new `<video>`: nothing played, at 0, loading its `src` when it has one. */
function freshMedia(srcAttr: string | undefined): Partial<State> {
  return { srcAttr, paused: true, position: 0, ready: false, loading: srcAttr !== undefined, failed: undefined, pending: 0, canAutoplay: true, atEnd: false, width: 0, height: 0 };
}

/**
 * THE MEDIA ELEMENT's load (HTML's media element load algorithm): the pending play() promises rejected (AbortError — the node says
 * nothing), paused without an event, back to 0 (`timeupdate` when it had moved), then loading the source when there is one.
 */
function reload(s: Readonly<State>, srcAttr: string | undefined): Act {
  const moved = s.position !== 0;
  const fresh: Act = { ...NONE, set: freshMedia(srcAttr) };
  return moved ? join(fresh, { ...NONE, set: { timeOut: 0 }, send: ['onTimeUpdate'] }) : fresh;
}

/**
 * A paint: the page follows what the node wants (the flags written always, then the element: `paintedElement`). A mount makes a new component and a new element of the kind the Source names, and
 * runs what waited for the component; leaving the page takes both away. On the page, a Source that moves between file and embed makes
 * a new element (DOM Element follows); on a `<video>`, its flags are drawn and a new `src` loads (one taken away loads nothing).
 */
function painted(s: Readonly<State>): Act {
  // s51's lesson: what the paint always does, it always writes — the `<video>`'s flags as the node holds them, and the element and
  // its media as they stand (`heldElement`), on every path; only what the paint changes differs. A write made only when a paint
  // changes something split every act's branch by what its paint did (nothing, a load, a src taken away, an embed in its place):
  // s54's matrices reached each split and each brought its own survivors (5,000 mutants)
  return join({ ...NONE, set: { ...drawnFlags(s), ...heldElement(s) } }, paintedElement(s));
}

/** The element and its media as they stand: what every paint writes before what it changes. */
function heldElement(s: Readonly<State>): Partial<State> {
  const { kind, elem, domElement, srcAttr, paused, position, ready, loading, failed, pending, canAutoplay, atEnd, width, height } = s;
  return { kind, elem, domElement, srcAttr, paused, position, ready, loading, failed, pending, canAutoplay, atEnd, width, height };
}

function paintedElement(s: Readonly<State>): Act {
  if (s.mounted && !s.onPage) {
    const made = madeElement(s, { onPage: true, elem: s.elem + 1, wantToPlay: false, canPlay: false });
    const at = { ...s, ...made.set };
    const f = flushed(at);
    return { set: { ...made.set, ...f.set }, send: [...made.send, ...f.send], emit: ['didMount', ...f.emit], outcomes: f.outcomes };
  }
  if (!s.mounted && s.onPage) {
    const gone: Act = s.kind === 'video' ? { ...NONE, set: { domElement: null }, send: ['onVideoElementCreated'] } : NONE;
    const dark = fileDark(s);
    return { ...gone, set: { onPage: false, ...gone.set, ...dark.set }, send: [...gone.send, ...dark.send], emit: ['willUnmount'] };
  }
  if (!s.onPage) return NONE;
  const kind = kindOf(s.source);
  if (kind !== s.kind) {
    // the component stays; the old element goes (a `<video>`'s ref is called with null) and a new one is made
    const gone: Act = s.kind === 'video' ? { ...NONE, set: { domElement: null }, send: ['onVideoElementCreated'] } : NONE;
    return join(gone, madeElement(s, { elem: s.elem + 1 }));
  }
  if (kind === 'embed') return NONE;
  const srcAttr = srcAttrOf(s);
  if (srcAttr === s.srcAttr) return NONE;
  // a `src` taken away loads nothing (HTML: removing the attribute does not run the load algorithm)
  if (srcAttr === undefined) return { ...NONE, set: { srcAttr: undefined } };
  return reload(s, srcAttr);
}

/** The element a paint makes (with `extra`): an embed, or a `<video>` drawn with its flags, loading its `src` — DOM Element. */
function madeElement(s: Readonly<State>, extra: Partial<State>): Act {
  const kind = kindOf(s.source);
  if (kind === 'embed') return { ...NONE, set: { ...extra, kind } };
  return { set: { ...extra, kind, ...drawnFlags(s), ...freshMedia(srcAttrOf(s)), domElement: OWN_ELEMENT }, send: ['onVideoElementCreated'], emit: [] };
}

/** The act on the painted page: nothing to act on when the element is not there; what the paint ran is held for the frame's end. */
function onPainted(s: Readonly<State>, then: (painted: Readonly<State>) => Act): Act {
  const p = painted(s);
  const after: State = { ...s, ...p.set };
  const a = after.onPage ? then(after) : NONE;
  return heldOver(s, join(p, a));
}

/** The act on the painted page, whether or not the element is there. */
function paintedThen(s: Readonly<State>, then: (painted: Readonly<State>) => Act): Act {
  const p = painted(s);
  return heldOver(s, join(p, then({ ...s, ...p.set })));
}

/** What an act resolved, held for the frame's end in the order resolved (group.ts `heldOver`); written every time. */
function heldOver(s: Readonly<State>, a: Act): Act {
  const { outcomes, ...rest } = a;
  return { ...rest, set: { ...rest.set, ran: [...s.ran, ...(outcomes ?? [])] } };
}

/** An act's or a reducer's patch: `outcomes` only when there are some. */
function toPatch(a: Act): Act {
  if (a.outcomes && a.outcomes.length === 0) {
    const { outcomes: _o, ...rest } = a;
    void _o;
    return rest;
  }
  return a;
}

/** Two acts in order, as one. */
function join(a: Act, b: Act): Act {
  const outcomes = [...(a.outcomes ?? []), ...(b.outcomes ?? [])];
  return {
    set: { ...a.set, ...b.set },
    send: [...a.send, ...b.send],
    emit: [...a.emit, ...b.emit],
    ...(a.after || b.after ? { after: [...(a.after ?? []), ...(b.after ?? [])] } : {}),
    ...(a.cancel || b.cancel ? { cancel: [...(a.cancel ?? []), ...(b.cancel ?? [])] } : {}),
    ...(outcomes.length > 0 ? { outcomes } : {})
  };
}

/**
 * The pointer lands on an embed: another page inside this one, which takes what lands on it — nothing here hears it. A press there
 * puts the keyboard on the `<iframe>`; a press, a click, a lifted finger or a key is still this page's activation (HTML).
 */
function inEmbed(p: Readonly<State>): boolean {
  return p.kind === 'embed' && hits(p);
}

/** A person's activation (the autoplay policy): from now on, a `<video>` may play with its sound on. */
/** An act that can give an activation writes it on every path — off the page, as it was (nothing there to act on). */
function keepsActivation(s: Readonly<State>, a: Act): Act {
  return { ...a, set: { activated: s.activated, ...a.set } };
}

function activation(s: Readonly<State>, given = true): Act {
  // written on every path of an act that can give one (a key that is Escape, a card not found: as it was)
  return { ...NONE, set: { activated: given || s.activated } };
}

// ---------------------------------------------------------------------------------------------
// THE ACTIONS — on the component, or waiting for it (react-component-node.ts :2014-2056)
// ---------------------------------------------------------------------------------------------

/** An action before the Video is on the page: it waits for the component (`withInnerComponent`), its outcome pending until then. */
function waits(s: Readonly<State>, op: Action) {
  return { ...toPatch(waitFor(s, { op })), outcome: 'pending' as const };
}

/** An action on the component now: Done — after what the frame has already resolved (`ran`), when there is any. */
function acted(s: Readonly<State>, op: Action) {
  const a = ran(s, op);
  if (s.ran.length === 0) return { ...a, outcome: 'done' as const };
  return { ...a, set: { ...a.set, ran: [...s.ran, { port: op, outcome: 'done' as const }] }, outcome: 'pending' as const };
}

/** `withInnerComponent` with no component: the entry waits; the 17th pushes the oldest out, which fails when it is an action. */
function waitFor(s: Readonly<State>, entry: Waiting): Act {
  if (s.waiting.length < WAIT_CAP) return { ...NONE, set: { waiting: [...s.waiting, entry] } };
  const [dropped, ...rest] = s.waiting;
  const failed: Resolved[] = 'op' in dropped ? [{ port: dropped.op, outcome: 'failure', error: FAILED_TO_MOUNT }] : [];
  return { ...NONE, set: { waiting: [...rest, entry], ran: [...s.ran, ...failed] } };
}

/** What waited, run in order on the new component at the paint that puts the Video on the page: each action reports Done. */
function flushed(s: Readonly<State>): Act {
  if (s.waiting.length === 0) return { ...NONE, set: { waiting: [] } };
  let at: State = { ...s, waiting: [] };
  let acc: Act = { ...NONE, set: { waiting: [] } };
  for (const w of s.waiting) {
    const a = 'op' in w ? ran(at, w.op) : sourceObject(at, w.srcObject);
    acc = join(acc, 'op' in w ? { ...a, outcomes: [{ port: w.op, outcome: 'done' }] } : a);
    at = { ...at, ...a.set };
  }
  return acc;
}

/** Video.tsx :177-201 — the four actions on the component. On an embed, nothing reaches the player (C97: the runtime throws). */
function ran(s: Readonly<State>, op: Action): Act {
  const stop = op === 'pause' || op === 'reset';
  const want: Act = { ...NONE, set: { wantToPlay: !stop, ...(stop ? { canAutoplay: s.kind === 'video' ? false : s.canAutoplay } : {}) } };
  const at = { ...s, ...want.set };
  // s51's lesson, on the actions: the playback as it stands, then what the action changes — a seek or a pause written only when it
  // moved something split every action's branch (and a mount's, which runs the actions that waited) by where the video was, and by
  // whether there was a `<video>` at all
  return join({ ...NONE, set: heldPlayback(s) }, s.kind === 'video' ? ranOnVideo(at, op, want) : want);
}

/** The playback as it stands: what every action writes before what it changes. */
function heldPlayback(s: Readonly<State>): Partial<State> {
  const { position, atEnd, timeOut, paused, pending } = s;
  return { position, atEnd, timeOut, paused, pending };
}

function ranOnVideo(at: Readonly<State>, op: Action, want: Act): Act {
  const s = at;
  switch (op) {
    case 'play':
      return s.canPlay ? join(want, mediaPlay(at)) : want;
    case 'restart': {
      if (!s.canPlay) return want;
      const seek = seekToStart(at);
      return join(join(want, seek), mediaPlay({ ...at, ...seek.set }));
    }
    case 'pause':
      return join(want, mediaPause(at));
    case 'reset': {
      const seek = seekToStart(at);
      return join(join(want, seek), mediaPause({ ...at, ...seek.set }));
    }
  }
}

/**
 * Video.tsx :129-134 `setSourceObject`. Only a `<video>` takes one (C96: the runtime throws on an embed); null is what it has; nothing
 * is null to the browser, so it loads its Source again and the component forgets it had loaded; any other value the browser refuses
 * (C99: the runtime throws).
 */
function sourceObject(s: Readonly<State>, v: unknown): Act {
  if (s.kind !== 'video' || v !== undefined) return NONE;
  return join({ ...NONE, set: { canPlay: false } }, reload(s, s.srcAttr));
}

// ---------------------------------------------------------------------------------------------
// THE MEDIA ELEMENT — the browser's `<video>` (the face's rules, node-spec-target.ts)
// ---------------------------------------------------------------------------------------------

/** A `<video>` that plays: it has loaded and is not paused. */
function playing(s: Readonly<State>): boolean {
  return s.kind === 'video' && s.ready && !s.paused;
}

/** Playback Position, as a `timeupdate` sends it (`event.target.currentTime`, video.ts :271-279). */
function timeUpdate(a: Act, position: number): Act {
  return join(a, { ...NONE, set: { timeOut: position }, send: ['onTimeUpdate'] });
}

/** Video.tsx :144-150 `reportFailure`: Error, then Playback Failure. */
function failure(message: string): Act {
  return { set: { playbackError: message }, send: ['playbackError'], emit: ['onPlaybackFailure'] };
}

/**
 * `play()` by the node (Video.tsx :159-175 `startPlayback`): refused while the element may not play (the autoplay policy), or after its
 * load failed — Error and Playback Failure; else it starts when paused (On Play; at its end, back to 0 first), and the promise waits
 * for the element to be ready.
 */
function mediaPlay(s: Readonly<State>): Act {
  if (!(s.elMuted || s.activated)) return failure(NOT_ALLOWED);
  if (s.failed !== undefined) return failure(NOT_SUPPORTED);
  let a: Act = { ...NONE, set: { canAutoplay: false, pending: s.ready ? 0 : s.pending + 1 } };
  if (s.atEnd) a = timeUpdate(join(a, { ...NONE, set: { atEnd: false, position: 0 } }), 0);
  if (s.paused) a = join(a, { ...NONE, set: { paused: false }, emit: ['onPlay'] });
  return a;
}

/** `pause()`: a playing element pauses (Playback Position, On Pause); the pending promises are rejected without a word (AbortError). */
function mediaPause(s: Readonly<State>): Act {
  if (s.paused) return { ...NONE, set: { canAutoplay: false } };
  return timeUpdate({ ...NONE, set: { canAutoplay: false, paused: true, pending: 0 }, emit: ['onPause'] }, s.position);
}

/**
 * `currentTime = startSeconds(startTime)` (v6, row C161 — R27): a seek on an element that has loaded, to the Start Time it was drawn with
 * (media-fragment.ts `startSeconds`: as the fragment reads it, or second 0 when there is none); on one that has not, nothing to see.
 */
function seekToStart(s: Readonly<State>): Act {
  if (!s.ready) return NONE;
  const to = fragmentSeconds(s.elStart) ?? 0;
  return timeUpdate({ ...NONE, set: { position: to, atEnd: false } }, to);
}

/**
 * `loaded`: the size, then `canplay` (Video.tsx :277-292) — the component may play, plays when it wants to, On Can Play, Video Width and
 * Height — and the pending promises resolve. Autoplay is decided as the load completes (before `canplay`): a paused element that has
 * not been played or paused since the load, may play, and has Autoplay, starts — On Play after On Can Play.
 */
function loaded(s: Readonly<State>, value: unknown): Act {
  const size = (value ?? {}) as { width?: unknown; height?: unknown };
  const autoplays = s.paused && s.canAutoplay && s.elAutoplay && (s.elMuted || s.activated);
  // Autoplay is decided here, and only here: after the load nothing reads its chance again until a new load gives it back
  const base: Act = { ...NONE, set: { loading: false, ready: true, pending: 0, canAutoplay: false, width: Number(size.width ?? 0), height: Number(size.height ?? 0), ...(autoplays ? { paused: false } : {}) } };
  const at = { ...s, ...base.set, canPlay: true };
  const played = s.wantToPlay ? mediaPlay(at) : NONE;
  const handler: Act = {
    set: { canPlay: true, videoWidth: at.width, videoHeight: at.height },
    send: ['videoWidth', 'videoHeight'],
    emit: ['onCanPlay']
  };
  // the play() the handler made lands after the handler (a task, or the promise's rejection); Autoplay's `play` after that
  return join(join(join(base, handler), played), autoplays ? { ...NONE, emit: ['onPlay'] } : NONE);
}

/** `failed`: the element's `error` (Video.tsx :293-304) — Error and Playback Failure — then each pending promise rejected (NotSupportedError). */
function failedLoad(s: Readonly<State>, value: unknown): Act {
  const reason = String(value ?? '');
  const message = reason ? 'The video could not be loaded: ' + reason : 'The video could not be loaded — check the Source URL and format';
  let a: Act = join({ ...NONE, set: { loading: false, failed: reason, pending: 0 } }, failure(message));
  for (let i = 0; i < s.pending; i++) a = join(a, failure(NOT_SUPPORTED));
  return a;
}

/** `ended`: Loop on goes back to 0 and plays on; else Playback Position at the end, paused (On Pause), the pending promises rejected. */
function endedPlayback(s: Readonly<State>): Act {
  if (s.elLoop) return timeUpdate({ ...NONE, set: { position: 0 } }, 0);
  return join(timeUpdate({ ...NONE, set: { position: MEDIA_END, atEnd: true } }, MEDIA_END), { ...NONE, set: { paused: true, pending: 0 }, emit: ['onPause'] });
}

/** The element is under the pointer: on the page, not hidden, not `pointer-events: none` (Video.tsx :214 beats the style). */
function hits(s: Readonly<State>): boolean {
  return s.onPage && s.visible && !s.opacityZero && s.peStyle !== 'none';
}

/** The element on the page holds the keyboard: the one that took it is still there. */
function holdsKeyboard(s: Readonly<State>): boolean {
  return s.onPage && s.focusedElem === s.elem;
}

/** `el.focus()` — the element takes the keyboard when it has the module's tabindex and can be seen; it keeps it once it has it. */
function takesKeyboard(s: Readonly<State>): Partial<State> {
  if (holdsKeyboard(s)) return {};
  return s.onPage && s.visible && (s.kind === 'embed' || s.draggable) ? { focusedElem: s.elem, cardFocused: -1 } : {};
}

/** The card's element takes the keyboard (it has drag-drop.ts's tabindex): off the Video, onto card `i`. */
function cardTakesKeyboard(s: Readonly<State>, i: number): Partial<State> {
  return { focusedElem: -1, cardFocused: i };
}

/** A pointer act on the painted page. */
function pointerAct(s: Readonly<State>, then: (painted: Readonly<State>) => Act): Act {
  return onPainted(s, then);
}

/** The element a pointer here lands on, if it is this node's (`hits`); -1, something else. */
function under(s: Readonly<State>): number {
  return hits(s) ? s.elem : -1;
}

/**
 * `onPointerMove` (drag-drop.ts :285-306) — the same pointer only: a held press cancels quietly, a pending one lifts; a lifted one of
 * the Video's own finds no zone (a zone inside the source never takes it); a card's tracks the Video (`over`: the pointer lands on it).
 */
function pointerMove(s: Readonly<State>, input: 'mouse' | 'touch', over: boolean): Act {
  if (s.carry >= 0) return s.carryBy === input ? track(s, over) : NONE;
  if (s.phase === 'idle' || s.input !== input) return NONE;
  if (s.phase === 'holding') return cancelled(s);
  // the node's own lifted drag finds no zone wherever the pointer is (C78, fixed in P109 ISL-031)
  if (s.phase === 'pending') return lifted(s) as Act;
  return NONE;
}

/** One gesture at a time (drag-drop.ts :199-225): the Video's own, or a card's. */
function busy(s: Readonly<State>): boolean {
  return s.phase !== 'idle' || s.carry >= 0;
}

/** The card an act names, by what it carries (its index in `CARDS`), or -1. */
function cardIndex(value: unknown): number {
  const named = JSON.stringify(value);
  return CARDS.findIndex((c) => JSON.stringify(c) === named);
}

/** `track` (:472-484) for a card's gesture: the Video is the zone under the pointer when the pointer lands on it and it is the card's zone. */
function track(s: Readonly<State>, over: boolean): Act {
  const here = over && zoneFor(s);
  if (here === s.inZone) return NONE;
  return { ...NONE, set: { inZone: here, isDropTarget: here }, send: ['isDropTarget'] };
}

/** `keyboardLift` (:841-878) of a card: into the first zone that takes it — the Video, when it is one. */
function cardLifted(s: Readonly<State>, i: number): Act {
  const zone = zoneFor({ ...s, carry: i });
  return { set: { carry: i, carryBy: 'keyboard', ...(zone ? { inZone: true, isDropTarget: true } : {}) }, send: zone ? ['isDropTarget'] : [], emit: [] };
}

/** `fileDropArmed` (:253-261): Accept File Drops on, and the drag carries files. */
function armed(s: Readonly<State>): boolean {
  return s.acceptFileDrops && (s.fileCarry?.length ?? 0) > 0;
}

/** C81 (P109): what a file act always does it always writes — the count, its element and Is Dragging Over as they end up, sent only
 * when they change. A write made only when one changes split each act's branch by whether it did (0 over 0 after a clear). */
function heldDrag(s: Readonly<State>): Partial<State> {
  return { dragDepth: s.dragDepth, depthOn: s.depthOn, isDragOver: s.isDragOver };
}

/** The browser moves the drag's target to `here`: a leave at the element it was over, if that is this node's element on the page, then an enter at `here`. */
function dragTo(s: Readonly<State>, here: number, extra: Partial<State> = {}): Act {
  if (s.fileOn === here) return { ...NONE, set: { ...extra, fileOn: here, ...heldDrag(s) } };
  const left = s.onPage && s.fileOn === s.elem ? fileLeft(s) : NONE;
  const mid = { ...s, ...left.set };
  const entered = here === -1 ? NONE : fileEntered(mid, here);
  const after = { ...mid, ...entered.set };
  return join(join(left, entered), { ...NONE, set: { ...extra, fileOn: here, ...heldDrag(after) } });
}

/** `onDragEnter` (:1009-1019) */
function fileEntered(s: Readonly<State>, here: number): Act {
  if (!armed(s)) return NONE;
  const over = dragOver(s, true);
  // C81 (fixed in P109 ISL-038): the count belongs to the element it counted; an enter on a new one starts it again
  return { ...over, set: { ...over.set, dragDepth: (s.depthOn === here ? s.dragDepth : 0) + 1, depthOn: here } };
}

/** C81 (fixed in P109 ISL-038): the element leaving the page takes the drag with it — the count forgotten, Is Dragging Over false
 * (node-shared-port-definitions.ts `fileDropDark`, from `_fileDropLeftPage`). Written at every leave; sent only when it changes. */
function fileDark(s: Readonly<State>): { set: Partial<State>; send: Val[] } {
  return { set: { dragDepth: 0, isDragOver: false }, send: s.isDragOver ? ['isDragOver'] : [] };
}

/** `onDragLeave` (:1030-1035) */
function fileLeft(s: Readonly<State>): Act {
  if (!armed(s)) return NONE;
  const depth = Math.max(0, s.dragDepth - 1);
  const over = depth === 0 ? dragOver(s, false) : NONE;
  return { ...over, set: { ...over.set, dragDepth: depth } };
}

/** `setDragOver` (:264-269): sent only when it changes. */
function dragOver(s: Readonly<State>, value: boolean): Act {
  return s.isDragOver === value ? NONE : { ...NONE, set: { isDragOver: value }, send: ['isDragOver'] };
}

const FILE_VALUES: Val[] = ['droppedFile', 'droppedFiles', 'droppedFileName', 'droppedFileType', 'droppedFileSizeInBytes'];

/** `onDrop` (:1036-1068) — the count to 0, Is Dragging Over false, the files that pass the filter, then one of the two signals. */
function fileDropped(s: Readonly<State>): Act {
  const over = dragOver(s, false);
  const accepted = (s.fileCarry ?? []).filter((f) => matchesType(f, s.acceptedFileTypes));
  const files: Partial<State> = accepted.length === 0 ? { droppedFiles: [], droppedFile: undefined } : { droppedFiles: accepted, droppedFile: accepted[0] };
  return { set: { ...over.set, dragDepth: 0, ...files }, send: [...over.send, ...FILE_VALUES], emit: [accepted.length === 0 ? 'filesRejected' : 'filesDropped'] };
}

/** `fileMatchesAcceptedTypes` (:293-311) */
function matchesType(file: FileLike, accept: unknown): boolean {
  const patterns = String(accept || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (patterns.length === 0) return true;
  const name = String(file.name || '').toLowerCase();
  const mime = String(file.type || '').toLowerCase();
  return patterns.some((p) => (p.startsWith('.') ? name.endsWith(p) : p.endsWith('/*') ? mime.startsWith(p.slice(0, -1)) : mime === p));
}

/** The File Drop outputs' getters (:1080-1134): a field of the first accepted file, none without one. */
function firstFile(s: Readonly<State>, key: 'name' | 'type' | 'size'): unknown {
  const f = s.droppedFile as FileLike | undefined;
  return f && f[key];
}

/** drag-drop.ts :173-183 */
function holds(s: Readonly<State>, input: 'mouse' | 'touch'): boolean {
  const mode = s.holdToDrag || 'touch';
  if (mode === 'always') return true;
  if (mode === 'never') return false;
  return input !== 'mouse';
}
function holdMs(s: Readonly<State>): number {
  const seconds = Number(s.holdTime);
  return (Number.isFinite(seconds) && seconds >= 0 ? seconds : 0.5) * 1000;
}

/** `onPointerDown` (drag-drop.ts :232-271): a gesture starts on this element when none is under way and it is Draggable. */
function pointerDown(s: Readonly<State>, input: 'mouse' | 'touch'): Act {
  if (busy(s) || !s.draggable || !hits(s)) return NONE;
  if (holds(s, input)) return { set: { phase: 'holding', input }, send: [], emit: [], after: [{ tag: 'hold', ms: holdMs(s) }] };
  return { set: { phase: 'pending', input }, send: [], emit: [] };
}

/** `onPointerUp` (:308-323) — the same pointer only; the window hears it wherever it lands. */
function pointerUp(s: Readonly<State>, input: 'mouse' | 'touch'): Act {
  if (s.carry >= 0) {
    // a card's: tracked where the mouse came up (over the Video, when the hit test finds it), then dropped there
    if (s.carryBy !== input) return NONE;
    const t = track(s, hits(s));
    const d = cardDrop({ ...s, ...t.set });
    return join(t, { ...d, set: { ...d.set, swallow: true }, after: [{ tag: 'unswallow', ms: 0 }] });
  }
  if (s.phase === 'idle' || s.input !== input) return NONE;
  if (s.phase !== 'lifted') return { set: ended(), send: [], emit: [], cancel: ['hold'] };
  // let go of its own lifted drag: never over a zone that takes it — its own node is not one (C78, fixed in P109 ISL-031) — so a cancel
  const c = cancelled(s);
  return { ...c, set: { ...c.set, swallow: true }, after: [{ tag: 'unswallow', ms: 0 }] };
}

/** `drop` (:379-399) of a card: on the Video, its Drag Value and Drop Index 0, then Dropped, and the zone left; over none, the card's cancel. */
function cardDrop(s: Readonly<State>): Act {
  if (!s.inZone) return { ...NONE, set: { carry: -1, carryBy: undefined } };
  return {
    set: { carry: -1, carryBy: undefined, inZone: false, droppedValue: CARDS[s.carry].dragValue, dropIndex: 0, isDropTarget: false },
    send: ['droppedValue', 'dropIndex', 'isDropTarget'],
    emit: ['dropped']
  };
}

/** `cancel` (:401-409) of a card's gesture: the zone left; the Cancelled is the card's. */
function cardCancelled(s: Readonly<State>): Act {
  return { set: { carry: -1, carryBy: undefined, ...(s.inZone ? { inZone: false, isDropTarget: false } : {}) }, send: s.inZone ? ['isDropTarget'] : [], emit: [] };
}

/** What `finish` (:418-436) leaves of the gesture. */
function ended(): Partial<State> {
  return { phase: 'idle', input: undefined };
}

/** `lift` (:355-376): Is Lifted, then Picked Up. */
function lifted(_s: Readonly<State>): Send {
  return { set: { phase: 'lifted', isLifted: true }, send: ['isLifted'], emit: ['pickedUp'] };
}

/** `cancel` (:401-409): the gesture ends; a lifted one says Cancelled. */
function cancelled(s: Readonly<State>): Act {
  // its own drag is never in a zone (C78, fixed in P109 ISL-031)
  if (s.phase !== 'lifted') return { set: ended(), send: [], emit: [], cancel: ['hold'] };
  return { set: { ...ended(), isLifted: false }, send: ['isLifted'], emit: ['dragCancelled'], cancel: ['hold'] };
}

/** `accepts` (:166-171): no Accept Kind takes anything; else the source's Drag Kind — the card's, or its own — trimmed, among the kinds. */
function acceptsSource(s: Readonly<State>): boolean {
  const wanted = String(s.acceptKind || '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);
  if (wanted.length === 0) return true;
  const kind = CARDS[s.carry].dragKind;
  return wanted.includes(String(kind || '').trim());
}

/** This node is an armed zone on the page that takes the gesture's source — itself, or the card (`orderedZones` :753-766, `zoneAt` :446-464). */
function zoneFor(s: Readonly<State>): boolean {
  // a card's: never its own gesture — a drag never takes its own node as its zone (C78, fixed in P109 ISL-031)
  return s.carry >= 0 && s.acceptDrops && s.onPage && acceptsSource(s);
}

/** `onKeyDown` (:768-839) — a key reaches the document wherever the keyboard is. */
function keyDown(s: Readonly<State>, key: string): Act {
  if (!busy(s)) {
    // Space on a card that holds the keyboard (the Video did not take it): the card's `keyboardLift`
    if (key === ' ' && !holdsKeyboard(s) && s.cardFocused >= 0) return cardLifted(s, s.cardFocused);
    if (key !== ' ' || !holdsKeyboard(s) || !s.draggable) return NONE;
    // Space on the live, Draggable element that holds the keyboard: `keyboardLift` — never into itself (C78, fixed in P109 ISL-031),
    // and no other zone on this page takes it
    // it holds the keyboard: written whether the key act just put it there or it was there (one branch either way)
    return { set: { phase: 'lifted', input: 'keyboard', isLifted: true, focusedElem: s.elem, cardFocused: -1 }, send: ['isLifted'], emit: ['pickedUp'] };
  }
  return keyDuringGesture(s, key);
}

/** A key while a gesture is under way — the Video's own or a card's (`onKeyDown` :783-839). */
function keyDuringGesture(s: Readonly<State>, key: string): Act {
  const card = s.carry >= 0;
  const input = card ? s.carryBy : s.input;
  const lifted = card || s.phase === 'lifted';
  if (input !== 'keyboard') return key === 'Escape' && lifted ? (card ? cardCancelled(s) : cancelled(s)) : NONE;
  // C83 (fixed in P109 ISL-038): a zone taken off the page under the carried card is left at the next key (drag-drop.ts
  // `onKeyDown`, `liveElement`) — Drag Over false — so Enter or Space cancels and an arrow key looks only at the zones on the page
  if (s.inZone && !s.onPage) {
    const gone: Act = { set: { inZone: false, isDropTarget: false }, send: ['isDropTarget'], emit: [] };
    return join(gone, keyDuringGesture({ ...s, ...gone.set }, key));
  }
  switch (key) {
    case 'Enter':
    case ' ':
      return card ? cardDrop(s) : cancelled(s);
    case 'Escape':
    case 'Tab':
      return card ? cardCancelled(s) : cancelled(s);
    case 'ArrowRight':
    case 'ArrowLeft':
      // the zones in reading order: the Video, if it takes the source now (a zone switched on mid-drag is entered)
      return !s.inZone && zoneFor(s) ? { set: { inZone: true, isDropTarget: true }, send: ['isDropTarget'], emit: [] } : NONE;
    default:
      return NONE;
  }
}
