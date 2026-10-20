import { CanvasTheme } from '../../src/editor/src/views/nodegrapheditor/canvas/CanvasTheme';
import { NodeGraphEditorNode } from '../../src/editor/src/views/nodegrapheditor/NodeGraphEditorNode';
import { paintNode } from '../../src/editor/src/views/nodegrapheditor/NodeGraphEditorNodePainter';

/**
 * P111 SEE-001 — the script mark: a bar down the right edge of a card whose node the honesty number counts as script
 * (a Function, Script, Expression or Visual Function node, or a kit node with no spec), in the function category's ink.
 *
 * Pixel assertions, as CAN-004's comment stripe: the claim is about what ends up on the canvas. Which types are script is
 * graded in plain Node (`tests-unit/see-001`); this grades that the painter paints the mark, and only for those.
 *
 * The mark is a source build's only (`honestyShown`: `process.env.devMode === 'yes'`, Richard's ruling for 0.4.3), so
 * these cases run as `npm run dev` does, and the last one as a packaged app does, where no card carries it.
 */

const CARD = { x: 20, y: 30 };
const TITLEBAR_HEIGHT = 36;

function stubNode(typename: string) {
  return {
    global: { ...CARD },
    nodeSize: { width: NodeGraphEditorNode.size.width, height: 80 },
    children: [],
    plugs: [],
    selected: false,
    icon: undefined,
    updateIcon() {
      /* icons need a live editor; the mark does not */
    },
    titlebarHeight: () => TITLEBAR_HEIGHT,
    titlebarLabelHeight: () => 14,
    typeDisplayName: () => typename,
    labelText: () => typename,
    isComponent: () => typename.startsWith('/'),
    owner: { isHighlighted: () => false },
    model: {
      typename,
      label: typename,
      type: { name: typename, displayName: typename, color: 'javascript' },
      metadata: {},
      annotation: undefined,
      hasComment: () => false,
      getComment: (): undefined => undefined,
      getHealth: () => ({ healthy: true })
    }
  } as unknown as NodeGraphEditorNode;
}

/** Two points in from the right edge, halfway down the titlebar: inside the 3px bar, clear of the 1px outline. */
function markPixel(typename: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 300;
  canvas.height = 200;
  const ctx = canvas.getContext('2d');
  paintNode(stubNode(typename), ctx, { minX: 0, minY: 0, maxX: 300, maxY: 200 });
  const d = ctx.getImageData(CARD.x + NodeGraphEditorNode.size.width - 2, CARD.y + TITLEBAR_HEIGHT / 2, 1, 1).data;
  return { r: d[0], g: d[1], b: d[2], a: d[3] };
}

function expectedMarkColor() {
  const parsed = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(CanvasTheme.instance.colors.categoryJavascript);
  if (!parsed) return undefined;
  return { r: parseInt(parsed[1], 16), g: parseInt(parsed[2], 16), b: parseInt(parsed[3], 16) };
}

const same = (a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }) =>
  a.r === b.r && a.g === b.g && a.b === b.b;

describe('P111 SEE-001 the script mark on the canvas', () => {
  let devMode: string | undefined;
  beforeEach(() => {
    devMode = process.env.devMode;
    process.env.devMode = 'yes';
  });
  afterEach(() => {
    if (devMode === undefined) delete process.env.devMode;
    else process.env.devMode = devMode;
  });

  it('paints the bar in the function ink on a Function node', () => {
    const px = markPixel('JavaScriptFunction');
    const expected = expectedMarkColor();
    expect(px.a).toBe(255);
    if (expected) {
      expect(Math.abs(px.r - expected.r)).toBeLessThan(3);
      expect(Math.abs(px.g - expected.g)).toBeLessThan(3);
      expect(Math.abs(px.b - expected.b)).toBeLessThan(3);
    }
  });

  it('paints it on a kit node with no spec, the same colour', () => {
    expect(same(markPixel('some-kit.Thing'), markPixel('JavaScriptFunction'))).toBe(true);
  });

  it('leaves the edge as card body on a node whose behaviour is known, and on a component instance', () => {
    const script = markPixel('JavaScriptFunction');
    const known = markPixel('Group');
    const instance = markPixel('/Components/Card');
    expect(same(known, script)).toBe(false);
    expect(same(instance, script)).toBe(false);
  });

  it('a packaged app (no devMode) paints no mark: a Function node’s edge is a known node’s', () => {
    const shown = markPixel('JavaScriptFunction');
    delete process.env.devMode;
    expect(same(markPixel('JavaScriptFunction'), shown)).toBe(false);
    expect(same(markPixel('JavaScriptFunction'), markPixel('Group'))).toBe(true);
  });
});
