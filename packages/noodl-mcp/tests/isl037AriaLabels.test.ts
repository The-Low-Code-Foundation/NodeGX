/**
 * P109 ISL-037 · P109-S11-ARIALABELWORDS — a screen reader on the French island hears French.
 *
 * The garden's worlds and its divider put their `label` into the element's `aria-label`. Eight of them were typed in
 * English with no wire, so "The island", "The garden", "Drag to make the steps wider or narrower" stayed English when
 * the page was in French (the visible words switched; an aria-label is not a visible text node, so ISL-007's words
 * drive never read it). Now each page-level one is wired from `Translate words` (four `a11y*` words), and each card's
 * drawing is named by the robot's own name, which is the same in both languages.
 *
 * Read from the generator's components (what `templates/bot-garden` is built from; the artefact gate holds them equal).
 *
 * @module noodl-mcp/tests/isl037AriaLabels.test
 */
import { CG003_COMPONENTS, KIT_DIVIDER, KIT_GARDEN, KIT_GARDEN_3D } from './cg003Components';
import { IG006_WORDS } from './cg003Content';

interface Wire {
  fromId: string;
  fromProperty: string;
  toId: string;
  toProperty: string;
}

const NAMED = [KIT_GARDEN, KIT_GARDEN_3D, KIT_DIVIDER];

/** Every kit world or divider in the template, and whether a wire feeds its `label`. */
function labels(dropA11y = false): Array<{ component: string; id: string; wired: boolean; from: string }> {
  const out: Array<{ component: string; id: string; wired: boolean; from: string }> = [];
  for (const c of CG003_COMPONENTS) {
    let wires = c.connections as Wire[];
    // ARM: the s45 wires taken out — the label is what was typed.
    if (dropA11y) wires = wires.filter((w) => !(w.toProperty === 'label' && (/^a11y/.test(w.fromProperty) || w.fromProperty === 'name' || w.fromProperty === 'robot')));
    for (const n of c.nodes) {
      if (!NAMED.includes(String(n.type))) continue;
      const w = wires.find((x) => x.toId === n.id && x.toProperty === 'label');
      out.push({ component: c.path, id: String(n.id), wired: !!w, from: w ? `${w.fromId}.${w.fromProperty}` : '' });
    }
  }
  return out;
}

describe('P109-S11-ARIALABELWORDS — every world and divider the garden draws is named in her language', () => {
  it('every kit world and divider has its label wired — none left as typed English', () => {
    const all = labels();
    // Known-firing: the eight the bug named, at least, are read here.
    expect(all.length).toBeGreaterThanOrEqual(8);
    expect(all.filter((l) => !l.wired)).toEqual([]);
  });

  it('🔴 ARM: without the s45 wires, the eight are typed English again', () => {
    expect(labels(true).filter((l) => !l.wired).length).toBeGreaterThanOrEqual(8);
  });

  it('the four words exist in both languages, and the French is French', () => {
    for (const k of ['a11yIsland', 'a11yGarden', 'a11yMyRobot', 'a11yDivider']) {
      const w = IG006_WORDS[k];
      expect({ k, en: !!w?.en, fr: !!w?.fr, differs: w?.en !== w?.fr }).toEqual({ k, en: true, fr: true, differs: true });
    }
  });
});
