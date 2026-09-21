/**
 * HLT-003 AC3 — a React warning in the log names the component it is about.
 *
 * The messages below are **verbatim** from
 * `<userData>/debug/log-2026-09-20T18-28-02Z.txt`, the 42-minute session phase
 * 99 was scoped from. That matters more than usual here, because the task's own
 * §2 described this defect wrongly: it recorded that `bugtracker.ts` was
 * "swallowing React's arguments" so "the component names are lost". The old
 * wrapper joined every argument onto the message, so the names were in the file
 * all along — unsubstituted, which is a legibility defect, not a loss. Two of
 * these tests exist to keep that straight: one asserts the substitution, and one
 * asserts that a leftover argument is *still* appended, because "fixing" the
 * formatting by consuming arguments into placeholders and dropping the rest
 * would be a real regression dressed as a fix.
 *
 * The genuinely lost name is the one React never passes — see the
 * `componentStack` tests and `bugtracker.ts`'s `reactComponentStack`.
 */

import { formatConsoleArgs, formatEntry } from '../../src/editor/src/utils/debugLog';

const AT = new Date('2026-09-20T18:28:51.172Z');

/** The whole path a console call travels: wrapper formatting, then the sink. */
function logLine(args: unknown[], componentStack?: string | null) {
  return formatEntry({
    level: 'error',
    message: formatConsoleArgs(args, componentStack),
    at: AT,
    paths: { homeDir: '/Users/rich' }
  });
}

describe('a React warning as it reaches the log file', () => {
  it('names both components in the setState-during-render warning', () => {
    // Logged at 18:28:51.172Z with `%s` three times and three trailing words.
    const line = logLine([
      'Cannot update a component (`%s`) while rendering a different component (`%s`). To locate the bad setState() call inside `%s`, follow the stack trace as described in https://react.dev/link/setstate-in-render',
      'VisualCanvas',
      'ComponentBoard',
      'ComponentBoard'
    ]);

    expect(line).toContain('Cannot update a component (`VisualCanvas`) while rendering a different component (`ComponentBoard`)');
    expect(line).toContain('inside `ComponentBoard`');
    // The old file said `(`%s`) … (`%s`) … VisualCanvas ComponentBoard ComponentBoard`.
    expect(line).not.toContain('%s');
  });

  it('puts the duplicate key inside the sentence that asks about it', () => {
    const line = logLine([
      'Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates.',
      '.$692d3658-f11a-10db-e6c8-6b000f774898'
    ]);

    expect(line).toContain('same key, `.$692d3658-f11a-10db-e6c8-6b000f774898`.');
  });

  it('resolves the null-value warning to the element it was given', () => {
    const line = logLine([
      '`value` prop on `%s` should not be null. Consider using an empty string to clear the component or `undefined` for uncontrolled components.',
      'input'
    ]);

    expect(line).toContain('`value` prop on `input` should not be null');
  });
});

describe('what the formatter must not do', () => {
  it('still appends an argument that no placeholder claimed', () => {
    // 🔴 The regression this guards: nothing may be dropped. The previous writer
    // appended every argument, and a log that loses one is worse than a log that
    // reads awkwardly.
    expect(formatConsoleArgs(['wanted %s', 'one', 'but-also-this', 42])).toBe('wanted one but-also-this 42');
  });

  it('leaves a placeholder visible when the call passed fewer arguments than it promised', () => {
    // React's missing-key warning really does this: `%s%s` with nothing behind
    // it once it has no owner to name.
    expect(formatConsoleArgs(['a %s and a %s', 'first'])).toBe('a first and a %s');
  });

  it('leaves a lone string alone even when it contains a percent sign', () => {
    expect(formatConsoleArgs(['100%s of nothing was substituted'])).toBe('100%s of nothing was substituted');
    expect(formatConsoleArgs(['a plain message'])).toBe('a plain message');
  });

  it('consumes a %c run and prints no CSS', () => {
    // Electron's own security warning, which is why every log in <userData>/debug
    // has a stray `font-weight: bold;` mid-sentence.
    expect(formatConsoleArgs(['%cElectron Security Warning (Insecure CSP)', 'font-weight: bold;'])).toBe(
      'Electron Security Warning (Insecure CSP)'
    );
  });

  it('renders %d as an integer and %% as one percent sign', () => {
    expect(formatConsoleArgs(['%d items, %d%% done', 3.7, 50])).toBe('3 items, 50% done');
  });

  it('survives an argument that cannot be serialised', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(() => formatConsoleArgs(['bad %s', circular])).not.toThrow();
  });
});

describe('the component stack React does not put in the message', () => {
  it('appends the stack, indented as continuation lines by the sink', () => {
    const line = logLine(
      ['Encountered two children with the same key, `%s`.', '.$692d3658'],
      '\n    in LauncherProjectCard\n    in Projects'
    );

    expect(line).toContain('same key, `.$692d3658`.');
    expect(line).toContain('in LauncherProjectCard');
    // formatEntry indents every continuation line, so "starts at column 0" stays
    // a reliable test for "this is a new entry".
    expect(line.split('\n').filter((l) => l.includes('in LauncherProjectCard'))[0]).toMatch(/^ {4}/);
  });

  it('adds nothing when React had no stack to give', () => {
    const withoutStack = formatConsoleArgs(['a warning with no owner %s', 'x']);
    expect(withoutStack).toBe('a warning with no owner x');
    expect(formatConsoleArgs(['a warning with no owner %s', 'x'], null)).toBe(withoutStack);
    expect(formatConsoleArgs(['a warning with no owner %s', 'x'], '   ')).toBe(withoutStack);
  });
});
