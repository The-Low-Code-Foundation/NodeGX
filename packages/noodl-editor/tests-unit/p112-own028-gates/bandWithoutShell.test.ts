/**
 * P112 OWN-028 AC3 (`P112-OWN027-NOSHELLGATE`) — a band whose content is not inside one shell. Through the real
 * `SemanticValidator` and `ALL_RULES`, so what is graded is what the Problems panel and an agent's write both run.
 *
 * The firing fixtures are OWN-027's own sections, with their parameters as Gemma 4 E2B wrote them (r2's hero and FAQ,
 * r1's feature row). Every firing arm has a silent twin that differs by the one thing the message tells a person to
 * change, and the silent arms are the shapes the calibration over the 17 templates found legitimate.
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

function fired(name: string, root: Node): string[] {
  const report = new SemanticValidator().validate(fromLegacyProject({ components: [{ name, graph: { roots: [root] } } as never] }));
  return report.diagnostics.filter((d) => d.code === DiagnosticCode.BandWithoutShell).map((d) => `${d.code}@${d.location.nodeId}`);
}

const pct = (value: number) => ({ unit: '%', value });
const px = (value: number) => ({ unit: 'px', value });
const SHELL = { width: pct(100), sizeMode: 'contentHeight', maxWidth: px(1200), flexDirection: 'column', paddingLeft: 'var(--space-6)', paddingRight: 'var(--space-6)' };

/** r2 Sections/S1Hero: a heroGround band holding its headline, photo and button directly. */
const HERO = { width: pct(100), sizeMode: 'contentHeight', flexDirection: 'column', alignItems: 'center', backgroundGradient: 'var(--gradient-spotlight)', paddingTop: 'var(--space-12)', paddingBottom: 'var(--space-12)', as: 'header' };
const heroKids = () => [
  n('s0n1', 'Text', { text: 'Find your new best friend' }),
  n('s0n2', 'Image', { src: 'noodl_modules/starter-imagery/animal-dog.webp' }),
  n('s0n3', 'net.noodl.controls.button', { label: 'Meet the puppies' })
];

describe('P112-OWN027-NOSHELLGATE — band-without-shell', () => {
  it("fires on r2's hero (a section root holding its words directly), naming what sits outside", () => {
    expect(fired('/Sections/S1Hero', n('s0n0', 'Group', HERO, heroKids()))).toEqual(['band-without-shell@s0n0']);
    const report = new SemanticValidator().validate(
      fromLegacyProject({ components: [{ name: '/Sections/S1Hero', graph: { roots: [n('s0n0', 'Group', HERO, heroKids())] } } as never] })
    );
    const d = report.diagnostics.find((x) => x.code === DiagnosticCode.BandWithoutShell)!;
    expect(d.severity).toBe('warning');
    expect(d.message).toContain('holds 3 things directly');
    expect(d.message).toContain('"shell" look');
  });

  it('is silent once the same three are inside one shell (the fix it names)', () => {
    expect(fired('/Sections/S1Hero', n('s0n0', 'Group', HERO, [n('shell', 'Group', SHELL, heroKids())]))).toEqual([]);
  });

  it("fires on r2's FAQ — no padding and no ground, only as: section", () => {
    const faq = { width: pct(100), sizeMode: 'contentHeight', flexDirection: 'column', alignItems: 'center', as: 'section' };
    expect(fired('/Sections/S6Faq', n('s5n0', 'Group', faq, [n('q', 'Text', { text: 'How old are they?' }), n('a', 'Text', { text: '8–12 weeks.' })]))).toEqual([
      'band-without-shell@s5n0'
    ]);
  });

  it("fires on r1's feature row: one child, a Columns, with no maxWidth", () => {
    const band = { width: pct(100), sizeMode: 'contentHeight', flexDirection: 'column', alignItems: 'center', paddingTop: 'var(--space-12)', paddingBottom: 'var(--space-12)' };
    expect(fired('/Sections/S2FeatureCards', n('s1n0', 'Group', band, [n('cols', 'net.noodl.visual.columns', {})]))).toEqual(['band-without-shell@s1n0']);
  });

  it('fires on a band under the page, below a full-width page column, and not on the column', () => {
    const page = n('page', 'Page', {}, [n('column', 'Group', { width: pct(100), flexDirection: 'column' }, [n('s0n0', 'Group', HERO, heroKids())])]);
    expect(fired('/Pages/Home', page)).toEqual(['band-without-shell@s0n0']);
  });

  it("is silent on an app screen holding a bar and a nav (instances) beside one shell (gram's Feed)", () => {
    const screen = { width: pct(100), sizeMode: 'contentHeight', flexDirection: 'column', backgroundColor: 'var(--background)', minHeight: { value: 100, unit: 'vh' }, alignItems: 'center' };
    const page = n('page', 'Page', {}, [
      n('fdRoot', 'Group', screen, [n('bar', '/UI/Bar'), n('main', 'Group', { ...SHELL, maxWidth: px(560) }, [n('t', 'Text', { text: 'Feed' })]), n('nav', '/UI/Nav')])
    ]);
    expect(fired('/Pages/Feed', page)).toEqual([]);
  });

  it("is silent on a card's root (rounded, bordered) and on a centred square inside a card (OWN-027 C's PuppyCard, marketplace)", () => {
    const card = { width: pct(100), sizeMode: 'contentHeight', backgroundColor: 'var(--surface)', borderRadius: 'var(--radius-xl)', borderStyle: 'solid', flexDirection: 'column', alignItems: 'center' };
    const square = { width: pct(100), height: px(160), sizeMode: 'explicit', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--muted)' };
    expect(fired('/Components/PuppyCard', n('pc', 'Group', card, [n('photo', 'Image', {}), n('name', 'Text', { text: 'Biscuit' })]))).toEqual([]);
    expect(fired('/Shop/ProductCard', n('pc', 'Group', card, [n('sq', 'Group', square, [n('none', 'Text', { text: 'No photo yet' })])]))).toEqual([]);
  });

  it('is silent on a band that holds a side-padded strip beside its shell (marketplace Home\'s search)', () => {
    const strip = { width: pct(100), sizeMode: 'contentHeight', flexDirection: 'column', backgroundColor: 'var(--secondary)', paddingLeft: 'var(--space-4)', paddingRight: 'var(--space-4)' };
    expect(fired('/Sections/Top', n('b', 'Group', HERO, [n('search', 'Group', strip, [n('i', 'Text', { text: 'Search' })]), n('shell', 'Group', SHELL, heroKids())]))).toEqual([]);
  });
});
