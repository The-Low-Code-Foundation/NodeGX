# Before you export to Swift — StoryEngine

**7 views**: ReadPageView, RemixPageView, CarriedView, ChoiceView, PassageView, PasterView, SidebarView.

## Left out by the plan (21) — the same nodes the React export leaves out

- `App` "App" — node beside the router shell
- `App` "The page — the ground, the hover, the paste box" — node beside the router shell
- `Pages/Read` "The passage you are in" — input "story" is fed by /Story/Source — no statically known source in the emit vocabulary
- `Pages/Read` "What you can see from here" — input "choices" is fed by JavaScriptFunction — it is fed by another Function/Expression node — JS-node chains are not translated in this slice
- `Pages/Read` "Take what that choice gives you" — input "gift" is fed by For Each — it reads the repeater rdChoices's relayed row value "gives" as a standing input, read whenever the node runs — there it is the value of whichever row fired last, which the export does not hold; it reads that value only in a chain a row's relayed signal runs, as the firing row's own
- `Pages/Read` "Is there a passage with that id?" — input "story" is fed by /Story/Source — no statically known source in the emit vocabulary
- `Pages/Read` "Is this an ending?" — input "story" is fed by /Story/Source — no statically known source in the emit vocabulary
- `Pages/Read` "Was that something new?" — input "gift" is fed by For Each — it reads the repeater rdChoices's relayed row value "gives" as a standing input, read whenever the node runs — there it is the value of whichever row fired last, which the export does not hold; it reads that value only in a chain a row's relayed signal runs, as the firing row's own
- `Pages/Read` "Is there any way on from here?" — input "choices" is fed by JavaScriptFunction — it is fed by another Function/Expression node — JS-node chains are not translated in this slice
- `Pages/Read` "Put the reader at the beginning" — the value wire has no statically known source
- `Pages/Read` "Empty their hands" — trigger rdLoadAt.done: the Set Variable that sends it is not exported — the value wire has no statically known source
- `Pages/Read` "You are carrying that now" — logic node (Set Variable)
- `Pages/Read` "You are in that passage now" — it reads the repeater rdChoices's relayed row value "goto" in a chain no row's relayed signal of that repeater starts in the export — there it is the value of whichever row fired last, which the export does not hold (in a row's chain it is the firing row's own)
- `Pages/Read` "The id that is missing, in a sentence" — format output drives nothing statically translatable
- `Pages/Read` "Are you carrying anything?" — input "n" is fed by JavaScriptFunction — it is fed by another Function/Expression node — JS-node chains are not translated in this slice
- `Pages/Remix` "Read what was pasted" — input "text" is fed by /Story/Paster — no statically known source in the emit vocabulary
- `Pages/Remix` "Is that a story?" — input "text" is fed by /Story/Paster — no statically known source in the emit vocabulary
- `Pages/Remix` "That is the story now" — logic node (Set Variable)
- `Story/Sidebar` "And when it is empty" — logic output drives nothing statically translatable
- `Story/Source` "Which story is being read" — its success output is consumed — per-run pulses have no render analogue (grade I, EXP-003 §5)
- `Story/Source` "The story" — trigger srPick.success is not a rendered element event or a receiver

## Read in the plan, not printed by the Swift target yet (7)

- `Pages/Read` "The story being read" — source is lifted from a child that does not run in this slice, so it stays empty
- `Pages/Read` "The story being read" — the logic component it places (/Story/Source) is not run in this slice; it runs in S2
- `Pages/Read` "One row per choice you can see" — the For Each's rows are not drawn: its items come from a source the Swift target does not read yet
- `Pages/Read` "What you carry" — its things reads a store (storyCarrying, untyped), which the Swift target does not carry yet
- `Pages/Remix` "The story that is playing" — json is lifted from a child that does not run in this slice, so it stays empty
- `Pages/Remix` "The story that is playing" — the logic component it places (/Story/Source) is not run in this slice; it runs in S2
- `Story/Source` — a logic component: its Functions run in S2, in the JavaScriptCore host

## Looks a phone has no counterpart for (4 kinds)

- `cssClassName: pressable` — 4 nodes: Pages/Read#rdRestart, Pages/Read#rdToRemix, Story/Paster#paPlay, Story/Paster#paBack
- `cssClassName: story-choice pressable` — 1 node: Story/Choice#chRow
- `cssClassName: story-paste` — 1 node: Story/Paster#paBox
- `useLabel: false` — 1 node: Story/Paster#paBox
