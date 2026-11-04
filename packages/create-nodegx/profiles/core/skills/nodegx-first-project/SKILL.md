---
name: nodegx-first-project
description: "What earlier NodeGX builds learned about making an app or a game someone loves: the brief in one message, something to try within the first hour, rounds of their feedback, what not to build up front, which parts belong in NodeGX and which in plain code. LOAD when the person asks for a new app or game here, before create_project, and again whenever they hand you their notes on a version."
user-invocable: false
---

# Building someone's first app here

The `nodegx` server tells you how NodeGX works. This page covers something else: how the builds people loved were run.
It comes from the apps and games built while NodeGX was made, some loved and some abandoned. None of it's a check
you have to pass. Use what helps. Skip what doesn't fit the person in front of you.

## Ask once, then build

Ask your questions in one message, and build from the answers. A long scoping conversation asks the person to
describe something they haven't seen yet. The game that worked best had its brief and one set of answers before the
first version. Its owner liked that version 28 minutes after the brief.

Ask:

- who it's for;
- what they should feel on the first screen;
- which phone or computer they'll use it on;
- what it won't do.

For a game, ask three more questions. Which games did they love? What did they actually do in them? What bored
them?

Keep their words as they wrote them. `create_project` records the first request and the conversation in
`docs/decisions/000-initial-scope.md`.

## Give them something to try early

For anything whose look or feel matters, the first thing to build is a version they can try. Don't start with the
structure behind it. When they can't say which of two ideas they want, build both as small playable sketches and let
them pick. One owner picked between two game sketches in a single click.

Look at it on their device. A canvas sized only with `inset: 0` showed a magnified quarter of the scene on a Retina
Mac for five versions, while every headless check at pixel ratio 1 looked right. So set the screenshot's window size
and pixel ratio to theirs. When their screenshot disagrees with yours, suspect the device before you doubt them.

## The app arrives in rounds

The good builds didn't arrive in one go. The castle game was "genius, in principle" on its first version and "fun"
three rounds later. The things its owner added after playing weren't in its first brief.

A round goes like this:

1. They try it and write a list.
2. You copy the list into `docs/LOOK.md` under the round's number, word for word.
3. You build every point on it in one pass, and give it back in the same place they tried it before.
4. You end the round with a list of the small choices you made alone, one line each. They can overturn any of them.

Don't stop a round to wait for a ruling on something small. Decide, write it in that list and keep building.

## Don't build what nobody asked for yet

A settings screen, an editor or a self-check takes effort to build. When you build one before anyone asks, the
person pays for it in what they can see. We measured it. The same model was given the same game brief twice, once with rules
to follow up front and once without. The copy with the rules looked less finished. Later both were asked for a
monster editor. The copy without the rules turned every number about the creatures into a setting in 14 minutes, and
built the better editor. So build an editor or a setting when the person asks for one.

When you write yourself a rule, say how far it reaches. "Nothing moves unless the person moves it" was meant for a
camera that moves by itself. Read as "no zooming", it cost one game its free zoom until the owner asked for it back.

## Which parts are NodeGX

NodeGX is for the parts the person will want to change or check after you've finished. Those are the pages, menus,
forms, settings, accounts, data and workflows. In NodeGX they can see and change those parts without you.

A 3D world, its physics and the way its enemies move are code that runs every frame. Write that as plain code. It's
too detailed to change as nodes and wires.

- **Screens and taps** (a quiz, a card or board game, a tracker, a shop) make a NodeGX app, as the server describes.
- **A world that moves** (3D, a canvas game, physics) is plain HTML and JavaScript in its own folder. Open it through a
  local web server. A page that loads its own JavaScript modules doesn't run from a `file://` address. Load
  `nodegx-making-a-game` first. NodeGX can't yet place a moving world and its menus in one app. If they want to
  change the menus themselves, tell them so.

## Look, don't trust a count

A check that passes can be a picture of the wrong thing. One game passed 21 of 21 checks on a screenshot of a grey
wall. Look at the picture after every visual change. Go through the app the way a person arrives: from the start page,
not a page opened on its own. Try a setting both off and on, try a limit at its edge, and try a confirmation by its
cancel.

## Notes for a long build

You won't remember this conversation tomorrow. A new session will read these files:

- `docs/LOOK.md`: each round's list as the person wrote it, and what you built for it.
- `docs/LEARNINGS.md`: one line for each surprise. Each line says what you saw, why and what fixed it. Read it at
  the start of a session.
- `docs/NEXT.md` when you hand over. It starts with the next step.
  Then it says what's built and what isn't working yet.

Hand over to a fresh session when the conversation has grown very long, or when a fix has failed twice. A fresh
session that reads a good `NEXT.md` starts with everything you learned and none of the long conversation.

## When something fails

1. Read what you measured, and write the surprise in one sentence ("after the second tap the score stayed at 2").
2. Read the node's own notes (`get_node_type`) and the project's traps (`get_project_info`). A refused change says
   exactly what to fix.
3. If the notes don't settle it, test it on a two-node page and drive it. That answers in a minute what a long think
   can't.
4. Drive the moment between two screens. A value cleared one step too late only shows there.
5. After two failed fixes, write what you tried and what you saw into `NEXT.md`, and hand over.

If an app shows a value that looks like it came from another app, check the address first. The preview serves every
app at `http://127.0.0.1:8575` unless you pass `--port`. Two apps opened one after the other then share the browser's
storage. Give each app its own port.
