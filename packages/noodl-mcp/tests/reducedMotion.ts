/**
 * P87 RKT-002 AC4 — which animations a stylesheet leaves running for a child who asked for reduced motion.
 *
 * A class is ANIMATED when a rule outside the `prefers-reduced-motion: reduce` block gives it an `animation` or
 * `animation-name` that is not `none`. It is STILLED when a rule inside that block ends a selector with it and sets
 * `animation: none`, `animation-name: none` or `display: none`. Keyframes are not rules, and are skipped.
 *
 * @module noodl-mcp/tests/reducedMotion
 */

/** Cut every `head { … }` block out of `css`: the blocks' insides, and what is left. */
function takeBlocks(css: string, head: RegExp): { inside: string[]; rest: string } {
  const inside: string[] = [];
  const re = new RegExp(head.source, 'g');
  let rest = '';
  let from = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) {
    const open = css.indexOf('{', m.index);
    let depth = 0;
    let end = open;
    for (; end < css.length; end++) {
      if (css[end] === '{') depth++;
      else if (css[end] === '}' && --depth === 0) break;
    }
    rest += css.slice(from, m.index);
    inside.push(css.slice(open + 1, end));
    from = end + 1;
    re.lastIndex = from;
  }
  return { inside, rest: rest + css.slice(from) };
}

const rulesOf = (css: string) =>
  [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ selectors: m[1].split(',').map((x) => x.trim()), body: m[2] }));

const lastClass = (selector: string): string | null => {
  const all = selector.match(/\.[\w-]+/g);
  return all ? all[all.length - 1].slice(1) : null;
};

export function reducedMotionReport(css: string): { animated: string[]; unstilled: string[] } {
  const bare = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const reduce = takeBlocks(bare, /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/);
  const outside = takeBlocks(reduce.rest, /@keyframes\s+[\w-]+/).rest;
  const classes = (rules: ReturnType<typeof rulesOf>, test: RegExp) => {
    const out = new Set<string>();
    for (const rule of rules.filter((r) => test.test(r.body))) {
      for (const selector of rule.selectors) {
        const c = lastClass(selector);
        if (c) out.add(c);
      }
    }
    return out;
  };
  const animated = classes(rulesOf(outside), /(^|[;\s])animation(-name)?\s*:\s*(?!none\b)/);
  const stilled = classes(reduce.inside.flatMap(rulesOf), /(^|[;\s])(animation(-name)?|display)\s*:\s*none\b/);
  return { animated: [...animated].sort(), unstilled: [...animated].filter((c) => !stilled.has(c)).sort() };
}
