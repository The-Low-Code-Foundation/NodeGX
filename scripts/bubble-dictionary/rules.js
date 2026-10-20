/**
 * The Bubble → NodeGX dictionary's rule tables, read from the P123 converter
 * (`dev-docs/tasks/phase-123-open-bubble/import/bubble2nodegx.mjs`, as committed) and its notes (IMPORT.md §3, §9).
 *
 * `{{Type name}}` in `nodegx` is a node type, rendered as a link to its page in the node reference. build.js fails
 * on a type the catalog does not have, so a renamed node cannot leave a dead name here.
 *
 * When the converter learns a row, add it here in the same commit: the examples on the page are regenerated from
 * the converter, but these tables are written by hand.
 */

const sections = [
  {
    id: 'elements',
    title: 'Elements',
    rows: [
      { bubble: 'a page (`type: "Page"`)', nodegx: 'a `/Pages/<name>` component: a {{Page}} (`title`, `urlPath`; the `index` page gets `""`) over a root {{Group}}', how: "The page's own layout, gaps, padding and background go on the root Group." },
      { bubble: '`Group`, `Shape`, `Popup`, `FloatingGroup`, `GroupFocus`, `Alert`', nodegx: '{{Group}}', how: 'A Popup or GroupFocus starts with `mounted: false`. A Floating Group does not float yet: it scrolls with the page. A Shape keeps its box, but its shape type (ellipse, triangle) is not read yet.' },
      { bubble: '`Text`', nodegx: '{{Text}}', how: 'BBCode such as `[b]` and `[sup]` is stripped. A Text with a background or a border becomes a Group carrying the box around a Text, because a NodeGX Text has no box.' },
      { bubble: '`Link`', nodegx: '{{Text}}, plus a {{RouterNavigate}} wired from its `onClick` when it links to a page', how: 'A Link to an external URL is not wired yet. An icon-only Link gets `text: ""`.' },
      { bubble: '`Button`', nodegx: '{{net.noodl.controls.button}}', how: '`text` becomes `label`, with `useLabel: true`.' },
      { bubble: '`Input`, `MultiLineInput`', nodegx: '{{net.noodl.controls.textinput}}', how: '`placeholder` carries over. `content_format` password, email, number, phone or url sets `type`. A MultiLineInput gets `type: "textArea"`.' },
      { bubble: '`Checkbox`', nodegx: '{{net.noodl.controls.checkbox}}', how: '`text` becomes `label`.' },
      { bubble: '`Dropdown`, `RadioButtons`, `AutocompleteDropdown`', nodegx: '{{net.noodl.controls.options}}', how: 'The data source becomes an Expression wired to `items`.' },
      { bubble: '`Image`', nodegx: '{{Image}}', how: '`src` gains `https:` when Bubble wrote it protocol-relative (`//s3…`). `objectFit` is `contain`, which is how Bubble shows an image. A fixed-width image with an aspect ratio takes its height from the ratio.' },
      { bubble: '`Icon`, and the Material Icons plugin element', nodegx: 'a {{Group}} holding an {{net.noodl.visual.icon}}', how: 'A Material icon becomes `iconIconSource: { class: "material-icons", code: "<name>" }`, and the project links the Material Icons font in its head code.' },
      { bubble: '`RepeatingGroup`', nodegx: 'a {{Group}} holding a {{For Each}} whose template is a row component `/Rows/<page> <name>`', how: "The cell's elements go into the row component. A {{Component Inputs}} node gets one port per field the cell reads, and the data source becomes an Expression wired to `items`." },
      { bubble: 'a reusable element', nodegx: 'a `/Reusable/<name>` component, placed where the element was used', how: 'The instance keeps only its position and size.' },
      { bubble: 'a custom state', nodegx: 'a {{Variable2}} named `<element>.<state>`', how: 'Its default value carries over.' },
      { bubble: '`HTML`, `Video`, `GoogleMap`, `SliderInput`, `DateInput`, `FileInput`, `PictureInput`, any other plugin element', nodegx: 'a labelled {{Group}} placeholder', how: 'Not in the dictionary yet. The page still opens, and the placeholder says what stood there.' }
    ]
  },
  {
    id: 'layout',
    title: 'Layout',
    blurb: "Bubble's responsive engine is flexbox underneath, so most of it maps one property to one parameter.",
    rows: [
      { bubble: '`container_layout` row or column, `row_gap` / `column_gap`, `container_horiz_alignment` / `container_vert_alignment`', nodegx: '`flexDirection`, `rowGap` / `columnGap`, `alignItems` / `justifyContent`', how: '' },
      { bubble: '`single_width` / `single_height` (fixed), `fit_width` / `fit_height`, `min_width_css` / `max_width_css`, `horiz_alignment`', nodegx: '`width` / `height` in px, `sizeMode`, `minWidth` / `maxWidth`, `alignX`', how: '*Stretch* becomes `width: 100%`. `fixed_width` is ignored on a new-engine page, where `single_width` is the flag.' },
      { bubble: '`vert_alignment` of a child in a row', nodegx: '`alignY`', how: '' },
      { bubble: '`container_layout: "relative"` (*Align to parent*) with `nonant_alignment`', nodegx: 'the biggest child stays in flow and gives the container its height; the others are `position: absolute` with `alignX` / `alignY` from the nonant', how: "The nonant's letter order is a guess: every example so far reads the same either way." },
      { bubble: 'a *fixed* container, or a page with no `container_layout` (the pre-2021 engine)', nodegx: 'children `position: absolute`, placed by `marginLeft` / `marginTop` from `left` / `top`, inside a `position: relative` parent', how: 'It renders the same and edits badly. Re-flowing it into rows and columns is a judgement for a person or an AI.' },
      { bubble: '`rotation_angle`', nodegx: '`transformRotation`', how: '' },
      { bubble: "how a row shares its width among children that are not fixed", nodegx: 'equal shares', how: "Not in the dictionary yet: Bubble's rule is not known, so columns with different minimum widths come out a different size." }
    ]
  },
  {
    id: 'style',
    title: 'Style',
    rows: [
      { bubble: '`bgcolor`, `background_style` (gradient or none), `border_*`, `border_roundness`, `boxshadow_*`, `opacity`', nodegx: '`backgroundColor`, `backgroundGradient`, `borderStyle` / `borderWidth` / `borderColor`, `borderRadius`, `boxShadow*`, `opacity`', how: '' },
      { bubble: '`font_color`, `font_size`, `font_family` / `font_face: "Inter:::600"`, `line_height`, `letter_spacing`, `font_alignment`', nodegx: '`color`, `fontSize`, `fontFamily` + `fontWeight`, `lineHeight`, `letterSpacing`, `textAlignX`', how: "Every family that is not built into the browser is added to one Google Fonts link in the project's head code, with the weights the page uses." },
      { bubble: '`padding_*`, `margin_*`', nodegx: '`padding*`, `margin*`', how: '' },
      { bubble: '`settings.client_safe.color_tokens` / `font_tokens`', nodegx: "custom design tokens with Bubble's own names (`--color_primary_default`), plus an `_rgb` triple for each colour", how: "Bubble's `rgba(var(--color_primary_default_rgb), 0.8)` keeps working unchanged." },
      { bubble: 'a style (`styles.<id>`)', nodegx: 'a variant `{ name, typename, parameters, stateParameters }` in `nodegx.styles.json`, which the element wears as `variant`', how: 'The element drops every parameter the variant already sets.' },
      { bubble: 'a condition *This element is hovered / focused / pressed*', nodegx: '`stateParameters.hover` / `focused` / `pressed`', how: "A style's `transitions` become the variant's `stateTransitions`. An element's own `transitions` are not carried yet, so its hover change is instant." },
      { bubble: 'any other condition', nodegx: 'one {{Expression}} per changed property: `(<condition>) ? <state value> : <base value>`', how: '`is_visible` drives `mounted`, or `visible` when the element keeps its space while hidden. *This input is (not) valid* has no NodeGX state yet.' }
    ]
  },
  {
    id: 'workflows',
    title: 'Workflows',
    rows: [
      { bubble: '`ButtonClicked`, `ElementClicked`', nodegx: "the element's `onClick`", how: '' },
      { bubble: '`PageLoaded`', nodegx: "the {{Page}}'s `didMount`", how: '' },
      { bubble: '`InputValueChanged`', nodegx: "the input's `onTextChanged`", how: '' },
      { bubble: '`CustomEvent`', nodegx: '{{Event Receiver}} on a channel named after the event', how: '' },
      { bubble: 'the action chain', nodegx: 'one node per action: the event triggers the first, and each action\'s `done` triggers the next', how: "An action's *Only when* becomes a {{Condition}} between them, fed by an Expression." },
      { bubble: '`TriggerCustomEvent`', nodegx: '{{Event Sender}}', how: '' },
      { bubble: '`NewThing`, `MakeChanges`, `DeleteThing`', nodegx: '{{NewDbModelProperties}}, {{SetDbModelProperties}}, {{DeleteDbModelProperties}}', how: 'Each value becomes a `prop-<field>` input: a direct wire when it is one input\'s value, an Expression otherwise.' },
      { bubble: '`ChangePage`', nodegx: '{{RouterNavigate}} to `/Pages/<name>`', how: 'Page parameters are not carried yet.' },
      { bubble: '`GoPrevious`', nodegx: '{{PageStackNavigateBack}}', how: '' },
      { bubble: '`OpenURL`', nodegx: '{{net.noodl.externallink}}', how: '' },
      { bubble: '`LogIn`, `SignUp`, `LogOut`, `ResetPassword`', nodegx: '{{net.noodl.user.LogIn}}, {{net.noodl.user.SignUp}}, {{net.noodl.user.LogOut}}, {{net.noodl.user.ResetPassword}}', how: 'Reset Password takes its token from the URL.' },
      { bubble: '`SetCustomState`, `DisplayGroupData`', nodegx: '{{Set Variable}}', how: '' },
      { bubble: '`ShowElement`, `HideElement`', nodegx: "a {{Set Variable}} on `<element>.mounted`, which the element's `mounted` reads", how: '' },
      { bubble: '`ScrollToElement`, `SetFocusToElement`', nodegx: "an {{Expression}} that passes the signal on to the element's `scrollIntoView` or `focus`", how: 'Other one-signal actions (`ResetInputs`, `AnimateElement`, …) keep their place in the chain with nothing on the end yet.' },
      { bubble: '`ScheduleAPIWorkflow`, `SendEmail`, plugin actions, any other action', nodegx: 'an {{Expression}} placeholder carrying the action\'s settings in a comment', how: 'Not in the dictionary yet. The chain stays whole, so the workflow still runs past it.' }
    ]
  },
  {
    id: 'expressions',
    title: 'Dynamic expressions',
    blurb:
      "A Bubble expression (*Input A's value :count > 3*) becomes one {{Expression}} node. Each value it reads is an input wired from the node that holds it; each operator is a line of JavaScript. For the operators one by one, see [Coming from Bubble](./coming-from-bubble.md).",
    rows: [
      { bubble: "*Input A's value*, *Checkbox B's value*", nodegx: "a wire from that element's value output", how: '' },
      { bubble: '*Current User*, *Current User is logged in*', nodegx: "a {{net.noodl.user.User}} node's `id`, `email` or `authenticated`", how: '' },
      { bubble: '*Get data from page URL*', nodegx: '{{PageInputs}}, one `pm-<name>` output per parameter', how: '' },
      { bubble: "*Current page width / height*", nodegx: '{{Screen Resolution}}', how: '' },
      { bubble: '*Get data from an external API* (API Connector)', nodegx: 'one {{net.noodl.HTTP}} node per call, fetched when the page mounts', how: "The call's parsed `types` give the field paths. Auth headers and keys are not carried." },
      { bubble: '*Parent group\'s thing* inside a repeating group', nodegx: "the row component's {{Component Inputs}}", how: '' },
      { bubble: 'an operator not in the table', nodegx: '`__bubble("<name>", …)` in the Expression', how: 'Not in the dictionary yet. The page opens and the expression says what it was.' }
    ]
  },
  {
    id: 'data',
    title: 'Data',
    rows: [
      { bubble: '`user_types` (data types)', nodegx: 'backend collections in the project (`metadata.dbCollections`)', how: 'text, number, yes/no, date, list and another type become String, Number, Boolean, Date, Array and Pointer.' },
      { bubble: 'option sets', nodegx: 'an `/Option sets/<name>` component whose `items` output lists the options', how: 'One option in an expression becomes `{ value, display }`.' },
      { bubble: 'privacy rules', nodegx: 'not converted yet', how: 'They use the same expression language, so they will be a table row. Until then a person writes the NodeGX security rules.' }
    ]
  }
];

module.exports = { sections };
