/**
 * P103 CMG-004 — the count is what CHANGED, not what is STORED, graded on Richard's own project.
 *
 * *"Other tokens said '150 tokens overriding defaults' and I could click 'reset all' which I did
 * and they all just disappeared. I didn't even know what the 150 tokens were."*
 *
 * The fixture is `metadata.designTokens` copied from *CMP-007 Richard Drive.before-0.3* (his
 * *Landing page test V2* as it was before the drive that lost the tokens): 142 stored rows. The
 * old sentence counted `isCustom` and said 142. 96 of them are byte-equal to the shipped default.
 * The real number is 46, and `--primary` is orange (`#c2410c`) against a default of blue.
 *
 * ⚠️ The fixture is FROZEN on purpose ([[a-frozen-fixture-answers-a-different-question-once-its-subject-moves]]):
 * the defaults it is compared against are the live contract, so a shipped default that moves
 * changes the count here — which is the right thing for this spec to notice, because it would
 * change what Richard is told too. The numbers below were true on 2026-09-24.
 */
import { buildEffectiveTokens } from '../../src/editor/src/models/StyleTokensModel/ProjectTokenCss';
import {
  changesInGroup,
  describeChangeCount,
  mostVisibleChanges,
  tokenChanges
} from '../../src/editor/src/models/StyleTokensModel/TokenChanges';
import { describeReset } from '../../src/editor/src/views/panels/StylesPanel/resetConfirm';
import stored from './landing-page-v2.customTokens.json';

const tokens = Array.from(buildEffectiveTokens(stored as never).values());
const changes = tokenChanges(tokens);

describe('CMG-004 AC1 — the count on Landing page test V2', () => {
  it('the fixture is what the file said: 142 stored rows, every one flagged isCustom', () => {
    expect((stored as { customTokens: unknown[] }).customTokens).toHaveLength(142);
    expect(tokens.filter((t) => t.isCustom)).toHaveLength(142);
  });

  it('🔴 counts 46 changed, not 142 stored — 96 stored rows equal their default and are not changes', () => {
    expect(changes.changed).toHaveLength(46);
    expect(changes.pinned).toBe(96);
    expect(changes.added).toHaveLength(0);
  });

  it('--primary is one of the 46: orange, going back to blue', () => {
    const primary = changes.changed.find((c) => c.token.name === '--primary');
    expect(primary).toBeDefined();
    expect(primary!.token.value).toBe('#c2410c');
    expect(primary!.defaultValue).toBe('#2563eb');
    expect(primary!.group).toBe('Colors');
  });

  it('AC4 — Effects holds exactly the six shadows and one gradient that differ', () => {
    const effects = changesInGroup(changes, 'Effects').map((c) => c.token.name);
    expect(effects.sort()).toEqual(
      ['--gradient-scrim', '--shadow-2xl', '--shadow-inner', '--shadow-lg', '--shadow-md', '--shadow-sm', '--shadow-xl'].sort()
    );
  });

  it('the changes fall into sections a person can find', () => {
    const groups = changes.changed.map((c) => c.group);
    expect(groups).not.toContain(null);
    expect(new Set(groups)).toEqual(new Set(['Colors', 'Typography', 'Spacing', 'Borders', 'Effects', 'Animation']));
  });

  it('a token with no default is "added", never "changed" — reset must not mean delete', () => {
    const withAdded = tokenChanges([
      ...tokens,
      { name: '--space-huge', value: '96px', category: 'spacing', isCustom: true }
    ]);
    expect(withAdded.changed).toHaveLength(46);
    expect(withAdded.added.map((t) => t.name)).toEqual(['--space-huge']);
  });

  it('a stored row equal to its default is "pinned": counted for the record, never as a change', () => {
    const one = tokenChanges([{ name: '--primary', value: '#2563eb', category: 'color-semantic', isCustom: true }]);
    expect(one).toEqual({ changed: [], added: [], pinned: 1 });
  });

  it('says the number in words, singular and plural', () => {
    expect(describeChangeCount(46)).toBe('46 tokens changed from the defaults');
    expect(describeChangeCount(1)).toBe('1 token changed from the default');
  });
});

describe('CMG-004 §3.4 — the confirm says what it will change, colours first', () => {
  const resolve = (v: string) => v;

  it('names the most visible one or two, colours before everything else', () => {
    const named = mostVisibleChanges(changes.changed, 2).map((c) => c.token.name);
    expect(named).toHaveLength(2);
    expect(named[0]).toMatch(/^--(primary|primary-hover|ring|surface-raised|muted-foreground|secondary|secondary-hover|border-control|border-glass)$/);
    // The fixture's first stored colour is --primary, so it leads.
    expect(named[0]).toBe('--primary');
  });

  it('🔴 the whole-project sentence: the count, the brand colour going back to blue, and "N more"', () => {
    const text = describeReset(changes.changed, { kind: 'all' }, resolve, 0);
    expect(text.title).toBe('RESET TOKENS');
    expect(text.message).toContain('Put <strong>46 tokens</strong> back to their defaults?');
    expect(text.message).toContain('<strong>--primary</strong> goes from');
    expect(text.message).toContain('#c2410c');
    expect(text.message).toContain('#2563eb');
    expect(text.message).toContain('and 44 more.');
    expect(text.message).toContain('You can undo this until you close the project.');
    expect(text.confirmLabel).toBe('Yes, put them back');
  });

  it('a colour is drawn as a swatch, painted with the resolved value', () => {
    const text = describeReset(changes.changed, { kind: 'all' }, (v) => (v === '#c2410c' ? 'rgb(194, 65, 12)' : v), 0);
    expect(text.message).toContain('background:rgb(194, 65, 12)');
  });

  it('a section reset names the section and does not mention added tokens', () => {
    const effects = changesInGroup(changes, 'Effects');
    const text = describeReset(effects, { kind: 'section', title: 'Effects' }, resolve, 3);
    expect(text.title).toBe('RESET EFFECTS');
    expect(text.message).toContain('Put <strong>7 tokens</strong> in Effects back to their defaults?');
    expect(text.message).toContain('and 5 more.');
    expect(text.message).toContain('The 3 tokens you added are kept.');
  });

  it('AC6 — a whole-project reset says the added tokens are kept', () => {
    const text = describeReset(changes.changed, { kind: 'all' }, resolve, 1);
    expect(text.message).toContain('The 1 token you added is kept.');
  });

  it('🔴 a name or value from the file cannot break out of the HTML', () => {
    const text = describeReset(
      [{ token: { name: '--x<script>', value: '"><b>', category: 'spacing', isCustom: true }, defaultValue: '<i>', group: 'Spacing' }],
      { kind: 'section', title: 'Spacing <em>' },
      resolve
    );
    expect(text.message).not.toContain('<script>');
    expect(text.message).toContain('--x&lt;script&gt;');
    expect(text.message).toContain('&quot;&gt;&lt;b&gt;');
    expect(text.message).toContain('in Spacing &lt;em&gt;');
    expect(text.message).toContain('Put <strong>1 token</strong> in Spacing &lt;em&gt; back to its default?');
  });
});
