# Digital Bricks lesson kit (`dbt-lesson`)

Twenty-five NodeGX nodes. Twenty of them are the LESSON: one per member of Digital Bricks
Training's closed section palette (the 19 kinds its `section.schema.ts` enumerates) and a `Section`
dispatcher that renders any section object by its `kind` — the node a `For Each` over a lesson's
`sections` array places.

Three are the learner's PROGRAMME and two are their DOSSIER: `DossierSegment` is one objective on
the meter, as a button, and `DossierReveal` is the dialog it opens.

Of the programme's three: `TimelineRow` draws one entry of it, folded or open.
`PaceTracker` and `RatingGauge` draw **where they are**: their own line against the pace their own
programme needs, and how far each agreed objective is from its goal. **Neither computes anything** —
every number arrives as a fraction the graph has already worked out (`Logic/Standing` in the
template, carrying the product's `standingView`, `paceView`, `parPoints`, `trajectoryView` and
`ratingGeometry` as ported code naming their source files).

**Why a course node is in the lesson kit and not a second one** (sprint 45 decision 1): two kits
would mean two stylesheets both aliasing the same tokens, two places a trainer looks, and either a
second markdown bundle — breaking the one-markdown-path rule this kit is built on — or a cross-kit
global whose load order nothing guarantees. The module path is identity, not description.

The source is `library/modules/dbt-lesson/src/kit.js`; `index.js` is that file with the
`DbtMarkdown` bundle above it (`build.mjs`, esbuild, deterministic). `styles.css` carries the
product's design-token names as aliases of NodeGX's and the lesson CSS lifted from the product's
`globals.css`. Do not edit the generated files.

## The rules every node follows

- **AI content is DATA.** The only path from a string to the page is `react-markdown` +
  `rehype-sanitize` (+ `remark-gfm`), the product's one markdown path, and DOMPurify's SVG profile
  for the two SVG fields. A `<script>` in a reading never reaches the DOM.
- **Ports are the product; nothing here fetches.** Every field of a kind's schema is a port. The
  kinds that in the product write to a server render their ASK and emit a port the graph wires.
- **Nothing gates, nothing scores, nothing is red.** A wrong quiz answer is warm; `Correct` is a
  port for the graph, never a count on screen. `--warm` is encouragement and a human voice; `--go`
  is done. Every colour is a class the stylesheet owns.
- **Every node takes ONE `copy` input, and English is built in.** A node is handed the whole
  resolved string object rather than eighty string parameters, and it falls back **per call** to
  the English in `kit.js` — so a kit node whose graph forgot to wire `copy` renders English, never
  a blank and never a raw key. `kit.js` is the one place that English is WRITTEN;
  `strings.en.json` is GENERATED from it by `build.mjs` and is what a graph seeds its string table
  from. The kit never calls `t()` itself and never knows what language it is in: it renders the
  object it is given, and the graph decides which language that object is.

- **React is the runtime's global.** The bundle maps `react` and `react/jsx-runtime` onto it and
  carries no React of its own.

## Nodes

| node | ports in | ports out |
|---|---|---|
| `Section` | `copy` (object), `section` (object), `facts`, `done`, `current`, `assetBase` | every lesson output below, forwarded |
| `TimelineRow` | `entry` (object), `kindLabel`, `title`, `when`, `collapsed`, `notes[]`, `comments`, `audience`, `copy`, `assetBase` | Toggled, Opened, Ask requested, Anchor kind, Anchor id |
| `PaceTracker` | `view` (object), `par` (array), `headline`, `legendActual`, `legendPar` | — |
| `RatingGauge` | `gauge` (object) | — |
| `DossierSegment` | `label`, `ariaLabel`, `hasFacts`, `fillPct`, `caption` | Opened |
| `DossierReveal` | `open`, `segment` (object), `lessonConceptId`, `copy` | Closed, Copied, Lesson opened |
| `Reading` | `markdown`, `detail` | — |
| `Callout` | `tone` (jargon / tip / warning / reassurance), `markdown` | — |
| `AnswerCapsule` | `text` | — |
| `CodeBlock` | `language`, `code`, `explanation` | — |
| `Quiz` | `question`, `variant` | Answered, Answer, Correct, Acted |
| `Activity` | `title`, `steps[]`, `capturesProjectFact` | Saved, Field, Value, Acted |
| `Capture` | `prompt`, `field`, `hint`, `initialValue`, `facts` | Saved, Field, Value, Acted |
| `PrepPack` | `title`, `instructions`, `factFields[]`, `facts` | Copied, Pack, Acted |
| `ArtifactChallenge` | `title`, `brief`, `rubric[]`, `acceptedFormats[]` | Submitted, Content, Acted |
| `HandoverPack` | `title`, `intro`, `files[]`, `productName` | Write requested, Acted |
| `CuratedVideo` | `url`, `startSeconds`, `endSeconds`, `whyItMatters` | — |
| `SvgDiagram` | `svg`, `caption` | — |
| `AnnotatedScreenshot` | `storageKey`, `src`, `overlaySvg`, `caption`, `assetBase` | — |
| `HumanRecording` | `storageKey`, `src`, `contextualIntro`, `assetBase` | — |
| `Audio` | `source`, `src`, `assetBase` | Listen requested, Listen Text |
| `VoiceInteraction` | `prompt`, `lang`, `rubric` | Record started, Record stopped, Answered, Answer, Acted |
| `Mermaid` | `source`, `caption` | — (placeholder) |
| `Chart` | `chartType`, `data[]`, `xKey`, `yKeys[]`, `caption` | — (placeholder) |
| `Widget` | `widgetKey`, `params`, `caption` | — (placeholder) |

`Acted` fires whenever the learner did the thing a section asks — answered, ticked, saved, sent —
right or wrong. It is what the product measures progress over (its L60 rule), and it is the port
to wire when a graph wants to know a step was worked.

## `TimelineRow` — what the kit decides and what the graph does

The kit draws a row; **the graph decides what a programme contains, what order it is in, what folds
and what each row is called.** That split is the whole argument for building this in NodeGX: the
readable, changeable part stays in the graph (`Logic/Ordered timeline` in the template, which
carries the product's own `orderEntries`, `previewOf` and `startsCollapsed` as ported code naming
their source files), and only the things a node graph cannot express live here.

What a graph cannot express, measured against the catalogue's 180 node types on 2026-09-20: there
is **no SVG node** (so the six per-kind glyphs cannot be drawn), **no `<details>`** and no way to
say *these children must not exist* rather than *must not be seen* — and the fold's whole guarantee
is the first of those. A folded row's card is not in the tree at all.

- **The fold.** `collapsed` is the graph's answer, derived from the programme and never stored. The
  reader's own clicks own the row after that, keyed on the row's identity — a node mounts before its
  inputs are set, so reading the port once at mount silently opens every row.
- **Two voices, not seven colours.** Three kinds are the coach speaking, three are the learner's own
  work. That is a difference a reader can use, it survives a kind being added, and it does not put a
  categorical palette on somebody's programme.
- **Words and a number, never a badge.** `1 note · 2 comments` on a folded line, in the same
  recessive ink as the date. The count is the `notes` array's LENGTH, never a number sent beside it,
  so a folded line cannot promise a note the open card does not hold.
- **A kind with no glyph or card rule throws by name** rather than drawing nothing. The maps are
  TOTAL over the eight kinds and none of them is `null` any more: `signal` and `message` were, with
  a comment saying neither reaches a learner's programme, and that premise expired the moment a
  coach read the same assembly.
- **`audience` decides what a reader sees, and it has no default that means "whatever you forgot".**
  `learner` or `coach`; anything else throws by name. A coach also sees a `message`; a learner does
  not, because a conversation belongs to the thread. Only a learner gets the **ask control** — it
  posts as whoever is signed in, so on a coach's surface it would write the coach's own question
  into their client's thread.
- **A signal reads as the platform noticing, never as the learner failing.** Their own words, quoted
  as they wrote them, with where it happened above; no red, no warm, no ✗, and no count of them
  anywhere. Its glyph is a pause, not a cross. WHERE it happened is resolved by the graph, which is
  the only place the other entries are — this node is handed the answer, not the lookup.
- **A message's voice is the row's, not the kind's.** `authorRole` says who wrote it; attributing it
  to the kind would paint a coach's reply and a learner's question in the same wash.


## `PaceTracker` and `RatingGauge` — two panels that must be able to not exist

Same split as `TimelineRow`: what a node graph cannot express lives here, and everything else stays
in the graph. The catalogue has **no SVG node and no chart node**, so two polylines and a dashed par
line cannot be Groups, and a gauge's four marks are absolutely positioned against one track.

- **They draw a VIEW and compute none of it.** `parPoints` is passed in rather than rebuilt,
  because a renderer that rebuilt the par rule would be a second owner of it — and the 1–10 scale
  arrives on the gauge object for the same reason.
- **Absence is a rendering path.** No horizon → no pace panel at all, and therefore no trajectory
  panel either: a pace line against a schedule nobody agreed to is a deadline the product invented
  and then measured somebody against. Never an empty pair of axes, never *"set yourself a goal"*.
  The counts block above them is deliberately NOT gated that way — counts of your own finished work
  need no deadline to be true.
- **Colour only ever celebrates.** Ahead of pace may wear `--go`; short of it is the same ink, with
  **no red and no `--warm`** — that token is encouragement and human recording, and being short of
  pace is neither. The gauge's fill ramps from the ordinary series ink to `--go` as the score
  approaches the flag, clamped at the target, so nothing gets greener past the agreement. A literal
  yellow→green ramp is one `color-mix` away and it reverses a decision taken twice.
- **The actual line stops at its last data point**, never the right-hand edge. The dashed par line is
  the only mark that reaches the edge, which is what a hairline is for: it is an agreement, not an
  observation.
- **No percentage, no fraction, no ✗, ever** — not on the fill, not beside it, not in an accessible
  name. The gauge exists so a reader does not do arithmetic; a percentage is the arithmetic back
  with a decimal point.
- **A kit node's root has no width of its own.** `props.style` is empty on every node in this kit,
  so a `width` parameter on a kit-node instance is silently discarded — and the validator cannot
  say so, because a module node is not in the catalogue and its parameter check is skipped rather
  than run. The stylesheet declares `width: 100%` on all three programme roots instead.

## `DossierSegment` and `DossierReveal` — a real dialog, until the runtime has one

The product's `DossierMeter` and `DossierFactsModal`, with every word already resolved by the
graph's `Logic/Dossier` — label, accessible name, caption, bar width, what it asks for, the
markdown. Neither node derives any of it.

- **Why the reveal is a kit node.** NodeGX's `Show Popup` is a plain Group: no `role="dialog"`, no
  Escape, no focus handling, and its `Dismissed` means *replaced by another popup*, never *closed by
  the user*. A graph-native reveal would regress all six of the product's accessibility properties.
  OpenNoodl `HLT-014` makes the popup a dialog for every app; when it lands this node is a
  candidate for replacement.
- **The six properties**: `role="dialog"` + `aria-modal` + `aria-labelledby`; Escape, the overlay and
  Close all emit `Closed` and a click inside does not; focus moves in on open and back to the
  element that had it (captured at open, so the dialog MOUNTS on open rather than toggling); Tab and
  Shift+Tab stay inside; `body.style.overflow` is `hidden` while open and restored to its previous
  value, never to `""`; and it portals to `<body>`.
- **Closed renders nothing, and so does open during a server render.** A kit's script runs in the
  page's SSR, where there is no `document` and the `ReactDOM` global is `ReactDOMServer`, which has
  no `createPortal`.
- **A captured value is text.** Never the markdown path and never raw HTML: an answer is not a
  lesson.
- **An empty segment is still a button** — its label and nothing else, no bar, no caption, no `0`.
  The bar's width is never written as a number, in text or in an accessible name.
- **One submission link, at most.** Work on `lessonConceptId` is a button emitting `Lesson opened`;
  work on any other concept is plain text, because the app has nowhere to send it.

## Four renders are placeholders, and why

- **`Mermaid`** shows the diagram source. Mermaid is ~2 MB minified; whether the template pays that
  is a decision, not a default.
- **`Chart`** shows the data as a table. The product draws with recharts, another large bundle.
- **`Widget`** names the widget and shows its params. The product's five interactive widgets
  (csv-sanitiser, token-counter, json-explorer, prompt-upgrade, concept-diagram) are five React
  components of their own; porting them is its own task.
- **`Audio`'s TTS source** shows a Listen button and the transcript. Speech needs a server. Set `src`
  and the player renders.

Each placeholder carries the data it stands in for, in a dashed ivory box, so the seam is visible
and nothing is silently dropped.

## Licences

react-markdown, rehype-sanitize and remark-gfm are MIT. DOMPurify is Apache-2.0 / MPL-2.0. The
fonts this template ships beside the kit are SIL OFL 1.1 (see the two font modules).
