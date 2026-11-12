---
name: nodegx-making-a-game
description: "How the browser games people loved were built, and about ninety mistakes we measured making them (3D, canvas, phone controls, headless screenshots), each with the fix. LOAD when the person asks for a game or a 3D scene, before you write its first line, and when a game looks or runs wrong."
user-invocable: false
---

# Making a game

A game's world (3D, a canvas, physics, anything that moves by itself every frame) is plain HTML and JavaScript. It
isn't nodes. This page has two parts. The first is how the games people loved were built. The second is the mistakes
that cost the most, with the fix for each. The full list, about ninety of them, is in `traps.md` beside this page.
Read the group for a part before you build that part.

Read `nodegx-first-project` too. Its brief in one message, its rounds and its "don't build it up front" matter most
for a game.

## The first hour

Ask the person three questions. Which games did they love? What did they actually do in them? What bored them? One owner's 30-point
list for a space game was the best brief we've had.

When they can't choose between two ideas, build both as small playable sketches and let them play. One owner picked
between two sketches in a single click.

Make the first version one page, with no framework and no build step. A three.js page reached a picture its owner
liked 28 minutes after the brief. An earlier game spent its first session on an engine and 29 checks, and was shelved
as "silly looking and not fun".

Keep that page in its own folder and open it by itself. One game's NodeGX app opened its page from a second server.
The game worked only while that server ran. Put online, the app would have opened a dead link.

These shapes held up as the games grew:

- the rules of the game in one module that draws nothing;
- the world drawn separately, from the game's state;
- the side panel or menu as ordinary page elements over that state, which never touches three.js;
- the game's data (levels, items, enemies) as rows in a plain list.

## Copy the genre

Before you build a core mechanic (the camera, the controls, an inventory, turn order), write down how two games of
the genre do it. Build that first. In one game the camera cost a whole session and three rejections, one of them
"you're making me feel nauseous". The answer was already in the genre: tower defence games keep one fixed angle with
pan and zoom.

Nothing should move unless the person moves it. That means no title screen that spins, no turntable and no camera
that glides between views on its own. It doesn't mean fixed zoom. The person's own drag and zoom can move and ease the
camera. One game lost its free zoom because the rule was read too widely.

## The mistakes that cost the most

- **The scene shows a magnified top-left quarter on a Retina screen.** A canvas sized with `inset: 0` shows its
  drawing buffer, which is twice the window. Size it with `width: 100vw; height: 100vh`, or let the renderer set its
  CSS size. It hid for five versions, because every headless check ran at pixel ratio 1.
- **Every check passes on a picture of a grey wall.** Counters (position, score, phase) can't see what's in front of
  the camera. Look at every screenshot. For "what do I see", cast a ray from the centre of the camera.
- **A new check passes on broken code.** A miss read as `dist: Infinity` is sent as `null` in JSON. `null < 3` is
  true. Run every new check once against the old code and watch it fail.
- **One room drops to a few frames a second.** three.js works out every point light for every lit pixel, even lights
  out of sight. Keep a fixed pool of about 8 point lights, and move them to the lamps nearest the camera.
- **Game time runs at half speed on a slow machine.** The frame's dt was clamped at 0.05 s. Clamp at 0.1 s, so game
  time keeps up down to 10 frames a second.
- **Colliders and rays are wrong inside a moving ship.** `Box3.setFromObject` and `Raycaster` work in world space.
  Inside something that moves, convert through its matrix and back.
- **Taps on a phone almost never count.** A real thumb drifts. A slow frame stretches a tap. Give every action
  its own button, and leave the look area for looking. On the phone, buttons change their label and never their place.
- **A hidden overlay still covers the game.** A stylesheet's `display: grid` beats the `hidden` attribute. Add
  `[hidden] { display: none !important }`.
- **The panel prints the word "null".** `replaceChildren` writes a `null` argument as text. Filter with
  `.filter(Boolean)` first.

## Seeing it without the person

You'll want screenshots before the person plays. Headless Chrome needs software WebGL:
`--headless=new --use-angle=swiftshader --enable-unsafe-swiftshader`. With `--disable-gpu` alone there's no WebGL at
all.

- **Match their screen.** Set their window size and pixel ratio with the DevTools protocol's
  `Emulation.setDeviceMetricsOverride` (`deviceScaleFactor: 2` is a Retina Mac). A phone held sideways also needs
  `mobile: true` and a landscape orientation. Send it real touches with `Input.dispatchTouchEvent`.
- **Wait for the game, not the clock.** Software WebGL draws 2 to 10 frames a second. Game time runs slower than real
  time there. Give the page a debug object (`window.__game`) with `stats()`, a `see()` that casts the centre ray, and a
  `fastForward(seconds)` that runs the rules without drawing. Wait until the state you expect arrives.
- **Fail loudly.** A check that prints a value and exits 0 proves nothing. Exit 1 when any check fails.
- **Leave the rest to the person.** Headless can't test pointer lock, real frame rates, sound or a drifting thumb.
  Hand those to the person on their own device, and keep their words.
