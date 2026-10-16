# Gate 1 — the brief, in the person's words

**Who asked:** Richard, 2026-10-16, one message. **Route:** a prototype phase in P118's four-file shape (BRIEF, LOOK,
PLAYTEST, README and a handoff), and a lane-2 artefact: an editor built from the kit (P112, *your own NodeGX*). **Who it
is for:** Richard first (six years of Bubble, every day), then anyone who knows Bubble and would try NodeGX if it looked
like home.

## What was asked for, verbatim

> Now that the node specs are done and the 'make your own editor' concept is nearly upon us, I've had a cheeky idea…
> What if we made an 'Open Bubble' clone of Bubble, the nocode builder. In theory it should be easy given what we've
> already got, just separating the logic into the 'workflows' concept from Bubble, and having a visual element picker
> on the left of the preview. The most challenging part would be with Bubble you can drag and move and resize elements
> directly in the preview live. There's also the question of the database tab, but that should be easy too?
>
> Let's just take a run at it. Let me know if you need screenshots or clarification, I used Bubble non stop for 6 years
> so I can give you any info you need.

## The idea in a paragraph

Bubble is three tabs over one app: **Design** (an element palette on the left, the page in the middle, a property
editor on the right; you click an element on the page, drag it, resize it), **Workflow** (*When Button X is clicked →
Step 1, Step 2, …*, each step an action with settings and values pulled from elements), and **Data** (data types with
fields, and the rows). A NodeGX app already has all three underneath: visual nodes in a tree, signal wires from an
element's event through action nodes, and a backend with collections. Open Bubble is a NodeGX editor that shows those
three things the Bubble way, and nothing else. It is built from the kit only: the format's store for every edit,
`@nodegx/preview` for the page (the real app in the page, with `elementsOf` to point from a node to what it draws), the
runtime's node library and `@nodegx/node-spec` for what a node's ports are. It draws no element and runs no node.

## What the session assumed, for Richard to overturn

- **Bubble's responsive engine, not the old absolute one.** Elements sit in Row and Column containers and dragging
  reorders them or moves them into another container; a Fixed container (`position: absolute` here) moves freely.
  Resizing pulls the east, south and corner handles and writes a px width and height. If he wants the old free-drag
  canvas, that is a different Design tab (every element absolute) and a ruling.
- **An event is an element's signal output** (a Button's Click, a Page's Did Mount), plus a logic node that fires with
  nothing firing it (a query's Fetched). A step is the node a signal wire reaches; the chain follows each node's Done
  (or its first wired signal output); other wired outputs show as *on Failure →* branches.
- **A step's "dynamic data" is a wire** from an element's value output (*Name input: Text*) to the step's input, chosen
  from a list, the way Bubble's "Input Name's value" is picked. The expression composer (`:plus item`, `:filtered`)
  does not exist yet; a Function node would be the NodeGX way.
- **The Data tab's types are the project file's `dbCollections`** (the schema the official editor also reads, and R12
  installs on a backend at start), and the rows come from the project's bound backend over its Parse-wire routes. No
  privacy rules tab yet (`nodegx.security.json` is the place it would read).
- **One page at a time, the page the running app is on.** Bubble draws any page without running it; here the screen is
  the real app, so when a page's own logic redirects (Admin needs a login), the editor follows the app and says so.
