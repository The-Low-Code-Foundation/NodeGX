/**
 * TVW-003 AC3 — the preview outlines only the instance the selection path addresses.
 *
 * Before this, the viewer only knew a bare id: `selectNodesWithId(titleId)` outlined the title in
 * *every* `Project Card`, and a click sent `[titleId]`, so the editor could not tell which card was
 * pointed at. Graded here on a fake scope tree shaped like the runtime's: a root, a Page Router's
 * page instance with a guid id, and two authored card instances rendering one definition `title`.
 *
 * ⚠️ jsdom has no layout; this grades *which* nodes get an outline, not where it lands. That is a
 * drive. jsdom is constructed directly, as `fb-016-overlay-dom.test.ts` does it.
 */
/* eslint-disable @typescript-eslint/no-var-requires */
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body></body></html>');
(globalThis as never as Record<string, unknown>).window = dom.window;
(globalThis as never as Record<string, unknown>).document = dom.window.document;
(globalThis as never as Record<string, unknown>).HTMLElement = dom.window.HTMLElement;

import { Highlighter } from '../src/highlighter';
import { instancePathOf, pathAddresses, PathWalkNode } from '../src/instance-path';

interface FakeNode extends PathWalkNode {
  getRef?: () => unknown;
  nodeScope: { componentOwner?: FakeNode; nodes: Record<string, FakeNode> };
  parentNodeScope?: { componentOwner?: FakeNode; nodes: Record<string, FakeNode> };
}

function scopeOf(owner?: FakeNode) {
  return { componentOwner: owner, nodes: {} as Record<string, FakeNode> };
}

/** A component instance placed in `parent`, with its own inner scope. */
function instance(id: string, parent: FakeNode): FakeNode {
  const node = { id, parentNodeScope: parent.nodeScope } as FakeNode;
  node.nodeScope = scopeOf(node);
  parent.nodeScope.nodes[id] = node;
  return node;
}

/** A plain (non-instance) node rendered inside `owner`. */
function element(id: string, owner: FakeNode): FakeNode {
  const node = { id, nodeScope: owner.nodeScope, getRef: () => ({}) } as FakeNode;
  owner.nodeScope.nodes[id] = node;
  return node;
}

// root → page (router guid) → card1, card2 → title (one definition node, rendered twice)
const root = { id: 'root' } as FakeNode;
root.nodeScope = scopeOf(root);
const page = instance('page-guid', root);
const card1 = instance('card1', page);
const card2 = instance('card2', page);
const title1 = element('title', card1);
const title2 = element('title', card2);
const footer = element('footer', root);

describe('instancePathOf', () => {
  it('walks from the node out to the root, excluding the root', () => {
    expect(instancePathOf(title2)).toEqual(['page-guid', 'card2', 'title']);
    expect(instancePathOf(title1)).toEqual(['page-guid', 'card1', 'title']);
  });

  it('places an instance in the scope it lives in, not the scope inside it', () => {
    expect(instancePathOf(card2)).toEqual(['page-guid', 'card2']);
  });

  it('a node in the root is its own id', () => {
    expect(instancePathOf(footer)).toEqual(['footer']);
  });
});

describe('pathAddresses', () => {
  it('a bare id addresses every instance — what a canvas showing the definition writes', () => {
    expect(pathAddresses(['title'], instancePathOf(title1))).toBe(true);
    expect(pathAddresses(['title'], instancePathOf(title2))).toBe(true);
  });

  it('an authored path addresses one instance, with the router page guid stripped', () => {
    expect(pathAddresses(['card2', 'title'], instancePathOf(title2))).toBe(true);
    expect(pathAddresses(['card2', 'title'], instancePathOf(title1))).toBe(false);
  });

  it('the full path the click sent addresses exactly what was clicked', () => {
    expect(pathAddresses(instancePathOf(title2), instancePathOf(title2))).toBe(true);
    expect(pathAddresses(instancePathOf(title2), instancePathOf(title1))).toBe(false);
  });

  it('order matters, the last id must match, and nothing addresses nothing', () => {
    expect(pathAddresses(['card2', 'page-guid', 'title'], instancePathOf(title2))).toBe(false);
    expect(pathAddresses(['card2'], instancePathOf(title2))).toBe(false);
    expect(pathAddresses([], instancePathOf(title2))).toBe(false);
  });
});

describe('Highlighter — AC3’s outline count', () => {
  function highlighter() {
    const runtime = {
      rootComponent: {
        nodeScope: {
          getNodesWithIdRecursive: (id: string) => [title1, title2, footer].filter((node) => node.id === id)
        }
      },
      eventEmitter: { once: () => undefined }
    };
    const h = new Highlighter(runtime as never);
    h.updateHighlights = () => undefined;
    return h;
  }

  it('the second card’s title path outlines one node, and it is the second card’s', () => {
    const h = highlighter();
    const selected = h.selectNodesAtPath(['card2', 'title']);
    expect(selected).toEqual([title2]);
    expect(h.selectedNodes.size).toBe(1);
  });

  it('a bare id still outlines every instance', () => {
    const h = highlighter();
    expect(h.selectNodesWithId('title')).toEqual([title1, title2]);
  });

  it('hover addresses the same way', () => {
    const h = highlighter();
    h.highlightNodesAtPath(instancePathOf(title1));
    expect(Array.from(h.highlightedNodes.keys())).toEqual([title1]);
  });

  it('a hover draws a 1px line and a selection a 2px one, so the two read apart (AC1, option 2)', () => {
    const h = highlighter();
    h.highlightNodesAtPath(instancePathOf(title1));
    h.selectNodesAtPath(instancePathOf(title2));
    expect(h.highlightedNodes.get(title1 as never).style.outline).toBe('1px solid #2CA7BA');
    expect(h.selectedNodes.get(title2 as never).style.outline).toBe('2px solid #2CA7BA');
  });
});
