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

## s2 — the second ask, verbatim (2026-10-16, with eleven screenshots of real Bubble)

> The Open Bubble editor is actually pretty cool. How far can you take things in this session to push it closer to
> something worth showing off how good NodeGX is? Screenshots of real Bubble attached.
>
> Things that would be impressive:
>
> 1. Branching workflows instead of fixed lists using 'Only when' conditions that drive me nuts, more like flutterflow
>    where you can add a conditional step that branches the workflow in two, which Bubble never managed to do
> 2. Option sets. Basically fixed JSON arrays loaded with the app in the browser for fast access
> 3. The expression composer. Yes it kind of sucks, but we could make one with the option to either use the expression
>    composer, or see it in pure JS, or a mix of both, that would blow people away
> 4. 'Custom states', I dunno what they even are, basically a variable or set of variables attached to a visual object,
>    which you can call in the expression editor like 'RepeatingGroup1's someCustomState's someKey'. I guess it was
>    their answer to global page variables, but attached to visual components so you remember where they are??
> 5. Global styles for elements, I think it's the equivalent of our 'Looks'
> 6. A visual guide on element padding / spacing, the red lines with px values you see in the screenshot when I hover
>    the button
>
> Also just another pass over the style to make it presentable, the menus look woeful at the moment, not Fable level
> design.
>
> We can take it seriously this time, do the prep steps and not just jump into dev straight away, like we've done
> when making new templates

### What the screenshots show (read before the mapping was written)

- **Design.** A left icon rail (Design, Workflow, Data, Styles, Settings…), the element tree with eye/lock per row, a
  palette of visual elements below it. The selected Button wears a blue label tab with two quick actions, white
  resize handles, and **red distance lines to the parent's edges with px values** (73px, 48px, 62px). The property
  editor is Visual / Interaction / Conditional tabs, groups Content, Size, Layout, Spacing (padding and margin as
  paired fields with an "all four" expander).
- **Workflow.** A list of workflows on the left (folders, "On this page 1"); the event card, numbered steps
  (*Make changes to thing…*, *Go to page …*, *Send email*) with the step's "Only when" shown greyed in its row; a step's
  properties on the right with Destination, Data to send, toggles, Parameters, Execution options and **Only when** at
  the bottom. The composer is a dropdown: *(Clear selection)*, *This Page*, DATA SOURCES (Current User, Do a search
  for, Get an option, Use global expression, Arbitrary text, Get data from an external API), ELEMENTS (Button A, Icon,
  RepeatingGroup A…), with the expression so far rendered as coloured chips beneath (*Current User's email is not Add*).
- **Custom States** is a small table on an element: Type, Name, Default value, List checkbox.
- **Styles** is a page: Styles / Variables / Expressions tabs; styles grouped by element type (Button → Filled Dark
  Destructive, Filled Light Primary (Default) …), a preview of the style, *Set as default*, *Find elements in use*; the
  property editor for the style with All / Mobile / Web.
- **Data.** App data / Data types / Privacy / Option sets / File manager tabs. An option set is a name, attributes
  (Display is built in, each attribute typed), and options (a row per option).

### What this session assumed, for Richard to overturn

- **A branch is a Condition node, and it does not rejoin.** FlutterFlow's conditional step: *If* with a Yes and a No
  column, each a chain of its own. Bubble's "Only when" on a single step stays readable (a Condition whose No side is
  empty) but is not what the editor adds.
- **An expression is NodeGX's Expression node, which is JavaScript.** The composer writes the same text a person would
  type; a chip is a name in that text, wired from the value it names. There is no second language to translate.
- **A custom state is a Variable node that remembers which element it belongs to.** NodeGX has page variables already;
  what Bubble adds is the address ("RepeatingGroup A's User"), so the variable's name is that address and the node's
  `metadata` says which element it hangs on.
- **An option set is a logic component with one Static Data node.** Defined once in the Data tab, placed where it is
  read; the app loads it with the page as plain JSON, which is what Richard asked for.
- **A global style is a variant in `nodegx.styles.json`** (the Looks of P81, the format's own `variants`), and an
  element wears one through its `variant` field. "Set as default" has no NodeGX meaning yet and is not offered.
- **The red lines measure the element against its parent's content box**, and the padding and margin are drawn as
  the browser's inspector draws them (green inside, orange outside), read from the live element's computed style.
