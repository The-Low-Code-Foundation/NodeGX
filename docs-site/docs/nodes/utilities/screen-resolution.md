---
title: "Screen Resolution"
---
Outputs the browser viewport's width, height and aspect ratio, updating live on every window resize.

Screen Resolution reports the size of the browser viewport — despite the name it reads window.innerWidth/innerHeight, not the physical screen. `width` and `height` are levels in CSS pixels, `aspectRatio` is width divided by height, and all three update automatically whenever the window resizes (including device rotation). The node has no inputs.

## When to use it

Use it to drive responsive logic in the graph: feed `width` into an Expression or Condition to produce breakpoint booleans ('narrow layout?') that control visibility or layout inputs. For purely visual responsiveness, prefer the built-in sizing/variants of visual nodes; reach for this node when logic must know the viewport size.

## At a glance

| | |
|---|---|
| Category | Utilities |
| Type name | `Screen Resolution` |
| Available in | browser |
| SSR compatibility | client-only — The viewport size is unknowable server-side; width/height stay unset until the browser runs. |
| Provided by | `noodl-viewer-react` |
| Behaviour spec | version 1 ([under the hood](#under-the-hood)) |

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `aspectRatio` | Number | — | Width divided by Height, so anything wider than it is tall is greater than one |
| `height` | Number | — | Height of the browser viewport, in pixels |
| `width` | Number | — | Width of the browser viewport, in pixels |

## Patterns

- `width` → Expression `width < 600` → a Group's or Text's `visible`: show compact-layout elements only on narrow viewports.

## Examples

**File picker with a shared accent color and a viewport-aware hint**

Three utility shapes in one small screen. A Color node is the single source of truth for the accent: it holds the design token `var(--primary)` — a colour port takes a token as readily as a hex, and the token survives the node — and its savedValue fans out to the title's text color and the button's background, so one edit restyles both. The Button's onClick fires Open File Picker's open — the dialog must come from a user gesture — and after a pick the file's name flows into a Text while `done` latches a Boolean (value pinned true) that reveals the result row as a level; closing the dialog with nothing chosen reports `unchanged` instead. Screen Resolution's width feeds an Expression (width < 600) whose boolean drives the compact hint's visibility, updating live as the window resizes.

## Related nodes

[Expression](../custom-code/expression.md), [Condition](../logic/condition.md), [States](../animation/states.md), [Group](../visual/group.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 1. The spec is the reference: the runtime, the React export and the conformance tests are all graded against it. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

- the browser window's size (`viewport`)

### Starting state

```json
{}
```

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/screen-resolution.ts"
/**
 * Screen Resolution — read from `packages/noodl-viewer-react/src/nodes/std-library/screenresolution.ts`
 * on 2026-10-01 (NSP-013 s13).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: with NO window (a server render — world.ts VIEWPORT, a play with
 * no viewport) the node does nothing at all (:21): Width and Height are never set, so nothing is sent
 * on them, and Aspect Ratio reads `undefined / undefined` — NaN, which IS a value (:68). With a window
 * it subscribes to `resize` and reads `innerWidth` / `innerHeight` at once (:30-38, :73-77), and again
 * at every resize; each read flags all three outputs (:76). Aspect Ratio is Width / Height, so a
 * window of height 0 is Infinity and of 0 × 0 is NaN (:67-69). No inputs.
 */

import { defineNode } from '../spec';

type State = {
  width: number | undefined;
  height: number | undefined;
}

export const ScreenResolution = defineNode({
  type: 'Screen Resolution',
  version: 1,
  source: 'packages/noodl-viewer-react/src/nodes/std-library/screenresolution.ts',
  needs: ['viewport'],
  worldPool: { advances: [1, 99, 100, 101, 1000, 30000] },

  state: { width: undefined, height: undefined } as State,
  // :40-42
  inspect: (s) => s.width + ' x ' + s.height,

  // :19-39 initialize — no window: nothing (:21); a window: subscribe (:30-36), then read (:38)
  init: (world) => {
    const v = world.viewport();
    if (!v) return {};
    world.listen('resize');
    return { width: v.width, height: v.height };
  },

  inputs: {},

  outputs: {
    // :44-52
    width: { type: 'number', from: (s) => s.width, displayName: 'Width', group: 'Values', description: 'Width of the browser viewport, in pixels' },
    // :53-61
    height: { type: 'number', from: (s) => s.height, displayName: 'Height', group: 'Values', description: 'Height of the browser viewport, in pixels' },
    // :62-70 — `width / height`, read even when neither was ever set
    aspectRatio: {
      type: 'number',
      from: (s) => (s.width as number) / (s.height as number),
      displayName: 'Aspect Ratio',
      group: 'Values',
      description: 'Width divided by Height, so anything wider than it is tall is greater than one'
    }
  }
}).on(
  {},
  {
    world: {
      // :30-32 → :73-77 `_viewportSizeChanged`: read the window, flag every output
      resize: (_s, _i, w) => {
        const v = w.viewport()!;
        return { set: { width: v.width, height: v.height }, send: ['width', 'height', 'aspectRatio'] };
      }
    }
  }
);
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
