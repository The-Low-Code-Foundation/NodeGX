/**
 * P107-C104 (P109 ISL-048) — CSS Class and CSS Style on a Drag go on the element it moves.
 *
 * The Drag has no element of its own, so the two ports every visual node declares reached nothing: accepted, stored, and absent
 * from the page. Ruled 2026-10-08, "Apply to what it moves": they are added to that element's own class and style.
 *
 * Rendered as DEF-027's rows are: the real `Drag`, the real `NoodlReactComponent` wrapper and the real `Text` leaf, so the
 * library's own class and the wrapper's merge are the ones that run. Only the node data is a fixture.
 *
 * 🔴 The rows without a Drag class or style are the controls: they catch a pass-through that writes an empty or `undefined`
 * class, or an empty style that would replace the child's.
 */

/* eslint-env jest */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { Drag } from '../src/components/visual/Drag/Drag';
import { Text } from '../src/components/visual/Text/Text';
import { NoodlReactComponent } from '../src/react-component-node';

type AnyProps = Record<string, any>;

beforeAll(() => {
  (globalThis as unknown as { Noodl: unknown }).Noodl = { baseUrl: '/' };
});

const nodeContext = { frameNumber: 0, styles: { resolveColor: (c: unknown) => c } };

function makeNode(className: string | undefined, style: Record<string, unknown> = {}) {
  return {
    style,
    props: { text: 'row', ...(className === undefined ? {} : { className }) },
    reactComponent: Text,
    noodlNodeAsProp: true,
    useFrame: false,
    context: nodeContext,
    getVisualParentNode: () => undefined,
    renderChildren: () => null,
    setDOMElement: () => undefined,
    _flushPendingInnerActions: () => undefined
  } as AnyProps;
}

/** The child node (its own class and style) inside a real Drag with the given CSS Class and CSS Style. */
function renderInDrag(drag: { className?: string; style?: Record<string, unknown> }, childClass?: string, childStyle?: Record<string, unknown>) {
  const child = React.createElement(NoodlReactComponent as unknown as React.FC<AnyProps>, {
    noodlNode: makeNode(childClass, childStyle)
  });
  return renderToStaticMarkup(
    React.createElement(Drag as unknown as React.FC<AnyProps>, {
      axis: 'both',
      scale: 1,
      enabled: true,
      useParentBounds: false,
      noodlNode: { children: [], context: {} },
      ...(drag.className === undefined ? {} : { className: drag.className }),
      ...(drag.style === undefined ? {} : { style: drag.style }),
      children: child
    })
  );
}

const classAttr = (html: string) => (html.match(/class="([^"]*)"/) || ['', ''])[1];
const styleAttr = (html: string) => (html.match(/style="([^"]*)"/) || ['', ''])[1];

describe('P107-C104 — a Drag\'s CSS Class and CSS Style go on the element it moves', () => {
  it('row C104 — the Drag\'s class is added to the element, beside the child\'s own and the library\'s', () => {
    const cls = classAttr(renderInDrag({ className: 'drag-handle' }, 'probe-card-a'));
    expect(cls.split(' ')).toEqual(expect.arrayContaining(['drag-handle', 'probe-card-a', 'react-draggable']));
  });

  it('row C104 — the Drag\'s style is added to the element\'s own', () => {
    const style = styleAttr(renderInDrag({ style: { outline: '2px solid red' } }, undefined, { opacity: 0.5 }));
    expect(style).toContain('outline:2px solid red');
    expect(style).toContain('opacity:0.5');
  });

  it('on a property both set, the Drag\'s wins, as any React parent\'s does', () => {
    const style = styleAttr(renderInDrag({ style: { opacity: 0.25 } }, undefined, { opacity: 0.5 }));
    expect(style).toContain('opacity:0.25');
    expect(style).not.toContain('opacity:0.5');
  });

  it('control — a Drag with no class adds none: the child keeps its own, and no "undefined"', () => {
    const cls = classAttr(renderInDrag({}, 'probe-card-a'));
    // `ndl-visual-text` is the Text's own class
    expect(cls.split(' ').sort()).toEqual(['ndl-visual-text', 'probe-card-a', 'react-draggable']);
    expect(classAttr(renderInDrag({ className: '' }, 'probe-card-a')).split(' ').sort()).toEqual(['ndl-visual-text', 'probe-card-a', 'react-draggable']);
  });

  it('control — a Drag with an empty style leaves the child\'s style as it was', () => {
    const style = styleAttr(renderInDrag({ style: {} }, undefined, { opacity: 0.5 }));
    expect(style).toContain('opacity:0.5');
  });
});
