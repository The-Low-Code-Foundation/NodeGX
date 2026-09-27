# Game Kit

Six nodes for small games. No backend, no network, no audio files. The source is
`library/modules/game-kit/src/kit.js`; `index.js` is that file with the avatar library
bundled above it (`build.mjs`).

The rule every node follows: **ports are the product**. Nothing here decides anything about a
game. `Race Track` draws two rockets where the graph says; `Sound` plays what the graph picks;
`Keyboard Map` lights the key the graph names.

## Sound (`game-kit.Sound`) — logic

| Port | Direction | Type | Description |
|---|---|---|---|
| Sound | input | enum | `correct`, `wrong`, `tick`, `win`, `lose`, `pop`, `type`, `heart`. Default `correct`. |
| Volume | input | number | 0 to 1. Default 0.4. |
| Enabled | input | boolean | False mutes the node without rewiring it. Default true. |
| Play | input | signal | Play the chosen sound now. |
| Ended | output | signal | The sound finished. |

Synthesised with WebAudio, one shared `AudioContext` per page, created on the first `Play`
(browsers refuse one before a user gesture — a sound wired to page load is silent, on purpose).
Every pending `Ended` is cancelled when the node is deleted.

## Keep Storage (`game-kit.KeepStorage`) — logic

| Port | Direction | Type | Description |
|---|---|---|---|
| Request | input | signal | Ask the browser to keep this site's storage (`navigator.storage.persist()`). |
| Granted | output | boolean | What the browser decided. False is normal on a first visit. |
| Done | output | signal | The browser has answered, either way. |

Fire it once, after the person has done something. It cannot make `localStorage` permanent —
"clear browsing data" still clears it — but it takes the site off the eviction list.

## Avatar (`game-kit.Avatar`) — visual

| Port | Direction | Type | Description |
|---|---|---|---|
| Style | input | enum | `pixel-art`, `fun-emoji`, `thumbs`, `big-smile`, `adventurer`. |
| Seed | input | string | Any text. Same seed + style = same face, forever. |
| Size | input | px | Default 64. |
| Background, Ring Colour, Ring Width | input | colour / px | A ring of 3px says "chosen". |
| Click | output | signal | |

A profile stores two strings, never an image.

## Race Track (`game-kit.RaceTrack`) — visual

| Port | Direction | Type | Description |
|---|---|---|---|
| Course | input | string | An SVG path `d` in a 1000 × 420 box. Default: a winding course, start bottom-left, planet top-right. |
| Goal Glyph | input | string | Default 🪐. |
| Progress A / B | input | number | 0 at the start, 1 at the planet. Drive from an `Animate To Value` for a smooth move. |
| Show Rocket B | input | boolean | Off for a solo run. Default true. |
| Name A / B, Avatar Style A / B, Avatar Seed A / B | input | | The same avatars as the Avatar node, in the rockets' windows. |
| Colour A / B, Track, Lane Line, Planet | input | colour | Tokens by default. |

The rockets ride two lanes on the same course, so equal progress is visibly level. Positions
come from the browser's own path geometry, so any course works.

## Keyboard Map (`game-kit.KeyboardMap`) — visual

| Port | Direction | Type | Description |
|---|---|---|---|
| Layout | input | enum | `azerty` (default) or `qwerty`. |
| Next Key | input | string | One character, or `space`. Lit up and scaled. Empty lights nothing. |
| Pressed Key | input | string | Drawn pressed down. Clear it from the graph after a moment. |
| Colour By Finger | input | boolean | Default true. |
| Show Digit Row | input | boolean | Default true. |
| Key Size | input | px | Default 34. |
| Little / Ring / Middle / Index Finger, Thumb | input | colour | The finger palette. Literal hex on purpose — no design token means "ring finger". |
| Key, Key Text, Next Key Colour, Next Key Text | input | colour | |

Zoning is the one every typing course shares: outer columns little finger, then ring, middle,
and the four centre columns index; thumbs on the space bar. The home-row bumps are on F and J.

## Answer Pad (`game-kit.AnswerPad`) — visual

| Port | Direction | Type | Description |
|---|---|---|---|
| Keys | input | string | The characters to draw as keys, in order: `1234567890,` for French maths, `âèéê` for a typing strip. A ⌫ key follows them. Empty draws only the box and the check key. |
| Numeric | input | boolean | A numeric answer: a digit key on the keyboard enters its digit by its **code**, whatever the layout or Shift says, and the box asks for a number keypad. Default true. |
| Box | input | enum | `auto` (default): display-only for a numeric pad on a touch screen, a real text box otherwise. `input`, `display`. |
| Question | input | string | Anything that changes with the question. A new value clears the answer. |
| Enabled | input | boolean | False ignores every key, the box and Enter. Default true. |
| Placeholder, Check Label, Box Label, Keys Label, Delete Label | input | string | The words. The last three are for screen readers. |
| Key Size, Box Width | input | px | Default 48 and 220. |
| Box Font Size, Font, Corner Radius | input | string | Tokens by default. |
| Key, Key Text, Outline, Box, Check Key, Check Key Text | input | colour | Tokens by default. |
| Text | output | string | The answer as it stands, after every key. |
| Submitted | output | signal | The check key or Enter. Text already holds the answer. |

Why it is a node and not a Text Input with buttons: a Text Input's Set does nothing while the box has focus (it must
not fight a typist), so a pad writing into it is silently dropped exactly when a child has the caret in the box. The pad
owns its box and types at the caret. A pad key never takes the focus, so the caret stays put.

On a touch screen a numeric pad's box is display-only, so no soft keyboard covers the game. A typing pad always keeps a
real box, because a typing lesson needs the letters.

## Licences

- `@dicebear/core` — MIT. <https://github.com/dicebear/dicebear>
- `pixel-art` — MIT (Florian Körner).
- `thumbs` — MIT (Florian Körner).
- `fun-emoji` — code MIT; artwork CC BY 4.0, Davis Uche.
- `big-smile` — code MIT; artwork CC BY 4.0, Ashley Seo.
- `adventurer` — code MIT; artwork CC BY 4.0, Lisa Wischofsky.

If you ship an app that shows the CC BY faces, credit DiceBear and the artist somewhere a person
can find it. The Rocket School template does this on its Progress page.
