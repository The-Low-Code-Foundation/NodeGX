/**
 * P116 ONT-002 — the brief cannot lie about the format it teaches.
 *
 * Its worked example is a typed world that validates and projects; its table is every kind,
 * generated; the rule it states names the tool and the budget by their real values. The
 * engine-name gate in `world.test.ts` walks `world/` and so covers `brief.ts` too.
 */
import { BRIEF_EXAMPLE, nextQuestions, projectWorld, QUESTION_BUDGET, validateWorld, VERBS_FILE, WORLD_FILES, WORLD_KINDS, worldBrief } from '../world';

describe('the brief', () => {
  const text = worldBrief();

  it('shows a world that validates, projects, and leaves three questions standing', () => {
    expect(validateWorld(BRIEF_EXAMPLE as unknown as Record<string, unknown>).problems).toEqual([]);
    expect(projectWorld(BRIEF_EXAMPLE).ok).toBe(true);
    const r = nextQuestions(BRIEF_EXAMPLE);
    expect(r.ok && r.ask.map((q) => q.question)).toEqual(['counts', 'sameTime', 'startsEnds']);
    for (const file of Object.values(BRIEF_EXAMPLE)) expect(text).toContain(JSON.stringify(file, null, 2));
  });

  it('names every kind with its sentence, the three files, the tool and the budget', () => {
    for (const k of WORLD_KINDS) {
      expect(text).toContain(`(\`${k.id}\`)`);
      expect(text).toContain(k.sentence);
      expect(text).toContain(k.tile.label);
    }
    for (const f of Object.values(WORLD_FILES)) expect(text).toContain(f);
    // The fourth file (ONT-006): where verbs go, that it is optional, and that a write without it keeps it.
    expect(text).toContain(`\`${VERBS_FILE}\``);
    expect(text).toContain('This fourth file is optional.');
    expect(text).toContain('Verbs you leave out are kept');
    expect(text).toContain('`validate_world`');
    expect(text).toContain('`write_world`');
    expect(text).toContain(`at most ${QUESTION_BUDGET} at a time`);
    expect(text).toContain('Ask a question only when `validate_world` names it.');
  });

  it('is the same text every call, and short enough to read before the first sentence', () => {
    expect(worldBrief()).toBe(text);
    // 8,895 before ONT-013's fifth-file section (s25); the section is the brief's frame for invented rules, not bloat.
    expect(text.length).toBeLessThan(10000);
    expect(text.length).toBeGreaterThan(4000);
  });
});
