/**
 * P109 ISL-008 — the property panel's note when the author's CSS, not the row, decides what the canvas draws
 * (`portStyleSource.ts`), and the bridge it asks through (`styleSourceBridge.ts`). Richard's request with the ruling
 * "Stylesheet beats defaults".
 *
 * Structural element stubs, as `portHint.test.ts` uses: this jest has no `document`.
 *
 * The rows that go red, and why:
 * - name the rule without where it lives and the CSS Definition row loses its "in the CSS Definition “App styles”";
 * - forget to remove the old note and a refresh draws two;
 * - share FB-017's class and each note erases the other (the class row).
 */
import { PORT_HINT_CLASS } from '../../src/editor/src/utils/portHint';
import {
  STYLE_SOURCE_HOST_CLASS,
  STYLE_SOURCE_NOTE_CLASS,
  applyStyleSourceNote,
  describeStyleSource,
  stylePortsOf,
  type StyleSourceFinding
} from '../../src/editor/src/utils/portStyleSource';
import {
  notifyStyleSourcesStale,
  onStyleSourcesStale,
  requestStyleSources,
  setStyleSourceProvider
} from '../../src/editor/src/utils/styleSourceBridge';

interface StubElement {
  className: string;
  attributes: Record<string, string>;
  children: StubElement[];
  textContent?: string;
  title?: string;
  setAttribute(name: string, value: string): void;
  querySelector(selector: string): StubElement | null;
  appendChild(child: StubElement): StubElement;
  removeChild(child: StubElement): StubElement;
}

function element(): StubElement {
  const el: StubElement = {
    className: '',
    attributes: {},
    children: [],
    setAttribute(name, value) {
      el.attributes[name] = value;
    },
    querySelector(selector) {
      const wanted = selector.replace(/^\./, '');
      return el.children.find((child) => child.className.split(' ').indexOf(wanted) !== -1) || null;
    },
    appendChild(child) {
      el.children.push(child);
      return child;
    },
    removeChild(child) {
      el.children = el.children.filter((c) => c !== child);
      return child;
    }
  };
  return el;
}

const names = (id: string) => (id === 'cssDef' ? { label: 'App styles', component: '/App' } : undefined);

const finding = (over: Partial<StyleSourceFinding> = {}): StyleSourceFinding => ({
  port: 'alignItems',
  property: 'align-items',
  value: 'center',
  selector: '.win',
  important: false,
  source: { kind: 'css-definition', nodeId: 'cssDef' },
  beats: 'default',
  nodeValue: 'flex-start',
  ...over
});

describe('the sentence (ISL-008)', () => {
  it('says what the canvas draws, which rule, and the CSS Definition it lives in', () => {
    expect(describeStyleSource(finding(), names)).toBe(
      'Your CSS sets this to center, from .win in the CSS Definition “App styles” (/App).'
    );
  });

  it('says !important when the rule beats a value the author set', () => {
    expect(describeStyleSource(finding({ beats: 'author', important: true }), names)).toBe(
      'Your CSS overrides this with !important: center, from .win in the CSS Definition “App styles” (/App).'
    );
  });

  it('names head code, a stylesheet file, and the node’s own CSS Style', () => {
    expect(describeStyleSource(finding({ source: { kind: 'head' } }), names)).toBe(
      'Your CSS sets this to center, from .win in the project’s head code.'
    );
    expect(describeStyleSource(finding({ source: { kind: 'link', href: '/noodl_modules/garden/garden.css' } }), names)).toBe(
      'Your CSS sets this to center, from .win in the stylesheet garden.css.'
    );
    expect(describeStyleSource(finding({ source: { kind: 'css-style' }, selector: '' }), names)).toBe(
      'This node’s CSS Style sets this to center.'
    );
  });

  it('still says "a CSS Definition" when the node cannot be found', () => {
    expect(describeStyleSource(finding({ source: { kind: 'css-definition', nodeId: 'gone' } }), names)).toBe(
      'Your CSS sets this to center, from .win in a CSS Definition.'
    );
  });
});

describe('the note under a row', () => {
  const create = () => element() as never;

  it('draws one note for the row’s port that has a finding, and marks the row', () => {
    const row = element();
    applyStyleSourceNote(row as never, ['alignItems'], new Map([['alignItems', finding()]]), names, create);
    expect(row.children).toHaveLength(1);
    expect(row.children[0].className).toBe(STYLE_SOURCE_NOTE_CLASS);
    expect(row.children[0].attributes['data-test']).toBe('property-style-source-alignItems');
    expect(row.className).toContain(STYLE_SOURCE_HOST_CLASS);
  });

  it('a refresh replaces the note, and one with nothing to say removes it', () => {
    const row = element();
    applyStyleSourceNote(row as never, ['alignItems'], new Map([['alignItems', finding()]]), names, create);
    applyStyleSourceNote(row as never, ['alignItems'], new Map([['alignItems', finding({ value: 'flex-end' })]]), names, create);
    expect(row.children).toHaveLength(1);
    expect(row.children[0].textContent).toContain('flex-end');

    applyStyleSourceNote(row as never, ['alignItems'], new Map(), names, create);
    expect(row.children).toHaveLength(0);
    expect(row.className).not.toContain(STYLE_SOURCE_HOST_CLASS);
  });

  it('is not FB-017’s note: neither class is the other’s', () => {
    expect(STYLE_SOURCE_NOTE_CLASS).not.toBe(PORT_HINT_CLASS);
    const row = element();
    const structural = element();
    structural.className = PORT_HINT_CLASS;
    row.appendChild(structural);
    applyStyleSourceNote(row as never, ['alignItems'], new Map([['alignItems', finding()]]), names, create);
    expect(row.children.map((c) => c.className)).toEqual([PORT_HINT_CLASS, STYLE_SOURCE_NOTE_CLASS]);
  });

  it('reads the marker attribute back', () => {
    expect(stylePortsOf('alignItems,justifyContent')).toEqual(['alignItems', 'justifyContent']);
    expect(stylePortsOf(null)).toEqual([]);
  });
});

describe('the bridge to the canvas', () => {
  afterEach(() => setStyleSourceProvider(undefined));

  it('answers [] with no canvas, and never rejects', async () => {
    expect(await requestStyleSources(['n'])).toEqual([]);
    setStyleSourceProvider(() => Promise.reject(new Error('webview gone')));
    expect(await requestStyleSources(['n'])).toEqual([]);
  });

  it('passes the path and hands back what the canvas said', async () => {
    let asked: readonly string[] = [];
    setStyleSourceProvider(async (path) => {
      asked = path;
      return [finding()];
    });
    expect(await requestStyleSources(['inst', 'n'])).toEqual([finding()]);
    expect(asked).toEqual(['inst', 'n']);
  });

  it('tells every listener the canvas has reloaded, until it unsubscribes', () => {
    let heard = 0;
    const off = onStyleSourcesStale(() => heard++);
    notifyStyleSourcesStale();
    off();
    notifyStyleSourcesStale();
    expect(heard).toBe(1);
  });
});
