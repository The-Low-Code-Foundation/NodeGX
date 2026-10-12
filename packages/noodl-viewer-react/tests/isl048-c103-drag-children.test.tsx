/**
 * P107-C103 (P109 ISL-048) — a Drag draws every child.
 *
 * A Drag drew only its first child (`React.Children.toArray(children)[0]`): every other child vanished without a word, and the
 * catalog's drag example taught a readout that never appeared. Ruled 2026-10-08, "Draw them all": everything inside a Drag
 * appears and moves together as one piece — with more than one child they are wrapped in one element the library moves; a Drag
 * with one child stays exactly as it was.
 *
 * Rendered as DEF-027's rows are: the real `Drag`, the real `NoodlReactComponent` wrapper and the real `Text` leaf.
 *
 * 🔴 The one-child rows are the controls: the element the library moves is still the child's own, with no wrapper.
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

function textNode(text: string) {
  return React.createElement(NoodlReactComponent as unknown as React.FC<AnyProps>, {
    key: text,
    noodlNode: {
      style: {},
      props: { text },
      reactComponent: Text,
      noodlNodeAsProp: true,
      useFrame: false,
      context: nodeContext,
      getVisualParentNode: () => undefined,
      renderChildren: () => null,
      setDOMElement: () => undefined,
      _flushPendingInnerActions: () => undefined
    }
  });
}

function renderDrag(texts: string[], extra: AnyProps = {}) {
  return renderToStaticMarkup(
    React.createElement(Drag as unknown as React.FC<AnyProps>, {
      axis: 'both',
      scale: 1,
      enabled: true,
      useParentBounds: false,
      parentLayout: 'column',
      noodlNode: { children: [], context: {} },
      ...extra,
      children: texts.map(textNode)
    })
  );
}

/** The opening tag of the outermost element. */
const outer = (html: string) => html.slice(0, html.indexOf('>') + 1);

describe('P107-C103 — a Drag draws every child', () => {
  it('row C103 — a Drag with two children draws both', () => {
    const html = renderDrag(['first', 'second']);
    expect(html).toContain('first');
    expect(html).toContain('second');
  });

  it('row C103 — the two are wrapped in one element the library moves, laid out as a column', () => {
    const tag = outer(renderDrag(['first', 'second']));
    expect(tag.startsWith('<div')).toBe(true);
    expect(tag).toContain('react-draggable');
    expect(tag).toContain('flex-direction:column');
    expect(tag).not.toContain('ndl-visual-text');
  });

  it('row C103 — in a parent that lays nothing out, the wrapper sits at its top left, as a Noodl element there does', () => {
    const html = renderDrag(['first', 'second'], { parentLayout: 'none' });
    const tag = outer(html);
    expect(html).toContain('second');
    expect(tag).not.toContain('ndl-visual-text');
    expect(tag).toContain('position:absolute');
  });

  it('with C104 — the Drag\'s CSS Class and CSS Style go on the wrapper, the element it moves', () => {
    const html = renderDrag(['first', 'second'], { className: 'drag-handle', style: { outline: '2px solid red' } });
    const tag = outer(html);
    expect(html).toContain('second');
    expect(tag).not.toContain('ndl-visual-text');
    expect(tag).toContain('drag-handle');
    expect(tag).toContain('outline:2px solid red');
  });

  it('control — a Drag with one child moves that child\'s own element, with no wrapper', () => {
    const html = renderDrag(['only']);
    expect(html).toContain('only');
    const tag = outer(html);
    expect(tag).toContain('ndl-visual-text');
    expect(tag).toContain('react-draggable');
  });

  it('control — a Drag with no child draws nothing', () => {
    expect(renderDrag([])).toBe('');
  });
});
