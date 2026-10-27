/**
 * P121-TWO003-NESTEDBUTTON (ruled 2026-10-27: "inner controls win") — the note on an element whose Click is wired and
 * which holds a control. Through the real `SemanticValidator` and `ALL_RULES`, so what is graded is what the Problems
 * panel and an agent's write both run. The shapes are the two measured in Chrome: a cake card holding an "Add to basket"
 * Button, and the backdrop behind a settings sheet. Every firing arm has a silent twin.
 */
import { DiagnosticCode } from '../../src/editor/src/validation/diagnostics';
import { fromLegacyProject } from '../../src/editor/src/validation/normalize';
import { SemanticValidator } from '../../src/editor/src/validation/SemanticValidator';

type Node = { id: string; type: string; label?: string; parameters: Record<string, unknown>; children: Node[] };
const n = (id: string, type: string, parameters: Record<string, unknown> = {}, children: Node[] = []): Node => ({
  id,
  type,
  label: id,
  parameters,
  children
});
const BUTTON = 'net.noodl.controls.button';
const FIELD = 'net.noodl.controls.textinput';
const sink = n('sink', 'JavaScriptFunction', { functionScript: '' });
const click = (from: string) => ({ fromId: from, fromProperty: 'onClick', toId: 'sink', toProperty: 'run' });

type Component = { name: string; roots: Node[]; connections?: unknown[] };
function notes(...components: Component[]) {
  const project = fromLegacyProject({
    components: components.map((c) => ({ name: c.name, graph: { roots: c.roots, connections: c.connections ?? [] } })) as never
  });
  return new SemanticValidator()
    .validate(project)
    .diagnostics.filter((d) => d.code === DiagnosticCode.ClickAreaHoldsAControl);
}
const where = (ds: ReturnType<typeof notes>) => ds.map((d) => `${d.location.component}@${d.location.nodeId}`);

const card = (inside: Node[]) => n('card', 'Group', {}, [n('title', 'Text', { text: 'Lemon cake' }), ...inside]);

describe('a card whose Click is wired', () => {
  it('holding a Button: a note on the card, naming the Button, as an info', () => {
    const ds = notes({ name: '/Shop', roots: [card([n('Add to basket', BUTTON, { label: 'Add to basket' })]), sink], connections: [click('card')] });
    expect(where(ds)).toEqual(['/Shop@card']);
    expect(ds[0].severity).toBe('info');
    expect(ds[0].message).toBe(
      '"card" answers a click. It holds a Button ("Add to basket"). The Tab key stops on what it holds instead. A person ' +
        'using a keyboard or a screen reader cannot press "card" itself. If its click does something nothing inside it ' +
        'does, give that its own Button.'
    );
    expect(ds[0].message).toContain('give that its own Button');
  });

  it('(twin) holding only words: no note — the viewer makes it a button', () => {
    expect(notes({ name: '/Shop', roots: [card([n('price', 'Text', { text: '£4.00' })]), sink], connections: [click('card')] })).toEqual([]);
  });

  it('(twin) the same card with nothing on Click: no note', () => {
    expect(notes({ name: '/Shop', roots: [card([n('Add to basket', BUTTON)]), sink] })).toEqual([]);
  });

  it('a wired Button on its own is not an area: no note', () => {
    expect(notes({ name: '/Shop', roots: [n('Add to basket', BUTTON), sink], connections: [click('Add to basket')] })).toEqual([]);
  });
});

describe('the backdrop behind a sheet', () => {
  const backdrop = () =>
    n('Behind the sheet', 'Group', {}, [
      n('sheet', 'Group', {}, [n('Hourly rate', FIELD), n('Close the sheet', BUTTON, { label: 'Close the sheet' })])
    ]);

  it('holding a field two levels down: a note on the backdrop only', () => {
    const ds = notes({ name: '/Week', roots: [backdrop(), sink], connections: [click('Behind the sheet'), click('Close the sheet')] });
    expect(where(ds)).toEqual(['/Week@Behind the sheet']);
    expect(ds[0].message).toContain('a Text Input ("Hourly rate")');
  });
});

describe('what else counts as held', () => {
  it('an element inside that answers a click of its own: a note on the outer one only', () => {
    const outer = n('outer', 'Group', {}, [n('inner', 'Group', {}, [n('words', 'Text', { text: 'Open' })])]);
    const ds = notes({ name: '/Tiles', roots: [outer, sink], connections: [click('outer'), click('inner')] });
    expect(where(ds)).toEqual(['/Tiles@outer']);
    expect(ds[0].message).toContain('"inner", which answers a click of its own');
  });

  it('a component placed inside whose tree holds a Button: named, with what it holds', () => {
    const buy = { name: '/Buy', roots: [n('Buy now', BUTTON, { label: 'Buy now' })] };
    const ds = notes(buy, { name: '/Shop', roots: [card([n('buy', '/Buy')]), sink], connections: [click('card')] });
    expect(where(ds)).toEqual(['/Shop@card']);
    expect(ds[0].message).toContain('the component "buy", which holds a Button ("Buy now")');
  });

  it('(twin) a component placed inside that holds only words: no note', () => {
    const blurb = { name: '/Blurb', roots: [n('words', 'Text', { text: 'Baked this morning' })] };
    expect(notes(blurb, { name: '/Shop', roots: [card([n('blurb', '/Blurb')]), sink], connections: [click('card')] })).toEqual([]);
  });

  it('a component placed inside itself does not loop', () => {
    const self = { name: '/Loop', roots: [n('again', '/Loop')] };
    expect(notes(self, { name: '/Shop', roots: [card([n('loop', '/Loop')]), sink], connections: [click('card')] })).toEqual([]);
  });
});

describe('a Click that only leaves its component (rocket-school\'s Header holding "The face")', () => {
  // The face: its picture's Click goes to the component's own output, `tapped`.
  const face = {
    name: '/Face',
    roots: [n('The face', 'Group', {}, [n('The picture', 'Group')]), n('out', 'Component Outputs')],
    connections: [{ fromId: 'The picture', fromProperty: 'onClick', toId: 'out', toProperty: 'tapped' }]
  };
  const header = (useTapped: boolean) => ({
    name: '/Header',
    roots: [n('The player', 'Group', {}, [n('face', '/Face')]), sink],
    connections: [click('The player'), ...(useTapped ? [{ fromId: 'face', fromProperty: 'tapped', toId: 'sink', toProperty: 'run' }] : [])]
  });

  it('where the Header never uses `tapped`, the picture does nothing: no note on the Header', () => {
    expect(notes(face, header(false))).toEqual([]);
  });

  it('(twin) where the Header uses `tapped`, the picture answers: a note on the Header', () => {
    const ds = notes(face, header(true));
    expect(where(ds)).toEqual(['/Header@The player']);
    expect(ds[0].message).toContain('the component "face", which holds "The picture", which answers a click of its own');
  });
});
