/**
 * P94 STY-006 AC4 — what a wearer entry SAYS.
 *
 * The list exists so a person can recognise the thing before pressing it. Every failure mode here
 * is a list that is technically correct and useless: a column of `a3f1c8e2-…`, a column of
 * `net.noodl.text`, or a column of paths so long the rail wraps each entry onto three lines.
 */
import {
  displayTypeName,
  usageListTitle,
  wearerLabel,
  wearerLocation
} from '../../src/editor/src/views/panels/StylesPanel/format';

describe('STY-006 AC4 — wearerLabel', () => {
  it('prints what the person called the node', () => {
    expect(wearerLabel({ label: 'Headline', typename: 'net.noodl.text' })).toBe('Headline');
  });

  it('🔴 falls back to the TYPE, never to an id or a raw typename', () => {
    // A node that was never named is the ordinary case, not the edge one — nothing in this editor
    // makes you name a Text before you style it.
    expect(wearerLabel({ label: '', typename: 'net.noodl.text' })).toBe('Text');
    expect(wearerLabel({ typename: 'net.noodl.controls.button' })).toBe('Button');
  });

  it('treats a whitespace-only label as no label', () => {
    expect(wearerLabel({ label: '   ', typename: 'net.noodl.text' })).toBe('Text');
  });

  it('🔴 always says SOMETHING', () => {
    // A blank entry is a row a person cannot press with any idea of where it goes. The walk hands
    // back `label: ''` for both an unnamed node and one whose label getter threw, and a broken
    // node has no usable typename either.
    expect(wearerLabel({ label: '', typename: '' })).toBe('Node');
    expect(wearerLabel({})).toBe('Node');
  });
});

describe('STY-006 AC4 — wearerLocation', () => {
  it('prints the last segment, the way the canvas tab and the breadcrumb do', () => {
    expect(wearerLocation('/Pages/Home')).toBe('Home');
    expect(wearerLocation('/Components/Cards/ProductCard')).toBe('ProductCard');
  });

  it('handles a component with no folder', () => {
    expect(wearerLocation('Home')).toBe('Home');
  });

  it('🔴 is NOT what the press navigates by', () => {
    // Two folders can each hold a `Home`, and they are one string to this function and two
    // different components to `getComponentWithName`. The entry carries the full name separately
    // for exactly that reason. [[a-key-and-a-path-are-two-identities]].
    expect(wearerLocation('/Pages/Home')).toBe(wearerLocation('/Admin/Home'));
  });

  it('says nothing rather than something wrong when there is no component name', () => {
    expect(wearerLocation('')).toBe('');
    expect(wearerLocation(undefined)).toBe('');
  });
});

describe('STY-006 AC4 — usageListTitle', () => {
  it('names both kinds, because they are different things to do something about', () => {
    expect(usageListTitle(3, 1)).toBe('Used by 3 nodes and 1 Look');
    expect(usageListTitle(1, 0)).toBe('Used by 1 node');
    expect(usageListTitle(0, 2)).toBe('Used by 2 Looks');
  });

  it('does not say "Used by" when nothing uses it', () => {
    // 🔴 `describeUsage(0, 0)` is the empty string, so the naive template reads "Used by ." — a
    // sentence a person would read as a bug in the panel rather than as an empty list.
    expect(usageListTitle(0, 0)).toBe('Nothing uses this');
  });
});

describe('displayTypeName still answers what the entries lean on', () => {
  it('turns a runtime type id into a word', () => {
    expect(displayTypeName('net.noodl.text')).toBe('Text');
    expect(displayTypeName('')).toBe('');
  });
});
