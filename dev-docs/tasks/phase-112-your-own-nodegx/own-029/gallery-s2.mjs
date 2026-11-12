// OWN-029 s2 — the results page's session-2 section, computed from the S2 series' ledgers (S0, K1/K2, W1/W2 per brief).
// gallery.mjs imports it when run with --s2. Every number on the section comes from a ledger; the prose says what they show.
const BRIEFS = ['puppy', 'bakery', 'running', 'jazz', 'pottery', 'plumber'];
const f2 = (v) => (v == null ? '—' : (+v).toFixed(2));
const mean = (xs) => (xs.length ? xs.reduce((a, x) => a + x, 0) / xs.length : null);

export function s2Section({ load, shot, esc }) {
  const runs = Object.fromEntries(BRIEFS.map((b) => [b, { S0: load(`S0-${b}`), K1: load(`K1-${b}`), K2: load(`K2-${b}`), W1: load(`W1-${b}`), W2: load(`W2-${b}`) }]));
  const r0 = (L) => L.roundsLog[0];
  const kept = (L) => L.roundsLog.find((r) => r.round === L.result.bestRound);
  const cell = (L) => (L?.result ? `<td class="num">${f2(kept(L).perLine)} · ${f2(kept(L).org)}</td>` : '<td>—</td>');
  const all = (arm) => BRIEFS.flatMap((b) => [runs[b][`${arm}1`], runs[b][`${arm}2`]]).filter((L) => L?.result);
  const armMean = (arm, pick) => f2(mean(all(arm).map(pick)));

  const table = `<div class="tablewrap"><table><thead><tr><th>brief</th><th class="num">new rule, run 1</th><th class="num">new rule, run 2</th><th class="num">old sum, run 1</th><th class="num">old sum, run 2</th></tr></thead><tbody>${BRIEFS.map((b) => `<tr><td>${b}</td>${cell(runs[b].K1)}${cell(runs[b].K2)}${cell(runs[b].W1)}${cell(runs[b].W2)}</tr>`).join('')}
<tr><td><b>mean, 12 runs</b></td><td class="num" colspan="2"><b>${armMean('K', (L) => kept(L).perLine)} · ${armMean('K', (L) => kept(L).org)}</b> <span class="small">(round 0: ${armMean('K', (L) => r0(L).perLine)} · ${armMean('K', (L) => r0(L).org)})</span></td><td class="num" colspan="2"><b>${armMean('W', (L) => kept(L).perLine)} · ${armMean('W', (L) => kept(L).org)}</b> <span class="small">(round 0: ${armMean('W', (L) => r0(L).perLine)} · ${armMean('W', (L) => r0(L).org)})</span></td></tr></tbody></table></div>`;

  // the page the new rule refuses: W1-bakery kept a round whose organisation fell; K1-bakery refused one like it
  const W = runs.bakery.W1, K = runs.bakery.K1;
  const refused = K?.roundsLog.find((r) => !r.kept && r.round > 0 && r.perLine < kept(K).perLine && r.org < kept(K).org - 0.1);
  const pair = W && K ? `<div class="pair">
  <figure><figcaption>bakery, old sum: kept round ${W.result.bestRound} <span class="mono">${f2(kept(W).perLine)} /line · organised ${f2(kept(W).org)}</span></figcaption><div class="frame"><img src="${shot(W.run, W.result.bestRound)}" alt="bakery page kept by the old rule" loading="lazy"></div></figure>
  <figure><figcaption>bakery, new rule: kept round ${K.result.bestRound} <span class="mono">${f2(kept(K).perLine)} /line · organised ${f2(kept(K).org)}</span></figcaption><div class="frame"><img src="${shot(K.run, K.result.bestRound)}" alt="bakery page kept by the new rule" loading="lazy"></div></figure>
</div>
<p class="small">Both start from the same sections, parts and bands. The old sum kept a round where organisation had fallen from ${f2(r0(W).org)} to ${f2(kept(W).org)}, because the defects per line kept falling; on that page the gallery became a full-bleed photo that runs across its own heading.${refused ? ` The new rule refused the same kind of trade in its own run: round ${refused.round} had fewer defects (${f2(refused.perLine)} per line) but organisation fell to ${f2(refused.org)}, so the agent went back to round ${K.result.bestRound}.` : ''}</p>` : '';

  // the organisation judge on one fixed structure: round 0 of the five runs that share S0's decisions
  const spread = `<div class="tablewrap"><table><thead><tr><th>brief</th><th>"well organised", five samples of words</th><th class="num">range</th></tr></thead><tbody>${BRIEFS.map((b) => {
    const xs = ['S0', 'K1', 'K2', 'W1', 'W2'].map((k) => runs[b][k]).filter(Boolean).map((L) => r0(L).org);
    return { b, xs, range: Math.max(...xs) - Math.min(...xs) };
  }).sort((a, z) => z.range - a.range).map(({ b, xs, range }) => `<tr><td>${b}</td><td class="mono">${xs.map(f2).join('  ')}</td><td class="num">${f2(range)}</td></tr>`).join('')}</tbody></table></div>`;

  // the photo scout: both gates, per brief (stored in S0's ledger)
  const photoRows = BRIEFS.map((b) => {
    const sc = runs[b].S0?.photoScout || [];
    const passed = sc.filter(([, p, s]) => p >= 0.6 && (s ?? 0) >= 0.3).slice(0, 3);
    const stopped = sc.filter(([, p, s]) => p >= 0.6 && (s ?? 0) < 0.3);
    const name = (f) => esc(f.replace(/\.webp$/, '').replace(/^[a-z]+-/, '').replace(/-/g, ' '));
    const show = (xs) => xs.map(([f, p, s]) => `${name(f)} <span class="mono">${f2(p)} · ${s == null ? '—' : s < 0.01 ? s.toFixed(3) : f2(s)}</span>`).join(', ') || 'none';
    const more = stopped.length > 4 ? ` <span class="small">and ${stopped.length - 4} more</span>` : '';
    return `<tr><td>${b}</td><td>${show(passed)}</td><td>${show(stopped.slice(0, 4))}${more}</td></tr>`;
  }).join('');
  const photos = `<div class="tablewrap"><table><thead><tr><th>brief</th><th>kept (makes sense · shows the subject)</th><th>passed the first question, stopped by the second</th></tr></thead><tbody>${photoRows}</tbody></table></div>`;

  return `<section id="s2">
  <p class="eyebrow">Session 2 · 29 October 2026</p>
  <h2>What counts as better</h2>
  <p>In session 1 a round was kept when its weighted defect score went down. The random-decisions control showed the problem with that: fewer defects can pay for a page that is worse organised. Session 2 made the session-1 winners the defaults (one copy call per section, the contradiction check, the outline judges) and put a new rule in front of the old one.</p>
  <div class="loop" style="grid-template-columns:repeat(2,minmax(0,1fr))">
    <div><b>Kept, way 1</b><span>Defects per line fall, and "well organised" drops by no more than 0.1.</span></div>
    <div><b>Kept, way 2</b><span>"Well organised" rises by at least 0.1, and defects per line stay within 110% of the best.</span></div>
  </div>
  <h3>24 paired runs</h3>
  <p>For each brief, one build with no review made the decisions. Four runs then started from exactly those decisions, so they built the same sections, parts and bands and only their words differed. Two kept rounds by the new rule, two by the old sum. Each cell is the kept page: <span class="mono">defects per line · well organised</span> (lower is better, then higher is better).</p>
  ${table}
  <ol class="findings">
    <li><b>Both rules repair.</b> <span>Defects per line fall by more than half under either rule, and "well organised" rises under both.</span></li>
    <li><b>The trade is the expected one, and small.</b> <span>The old sum ends with fewer defects per line; the new rule ends better organised. Both differences are smaller than the spread between two runs of the same rule, so this is a decision about which pages to refuse, not a measured win.</span></li>
    <li><b>The new rule stays the default.</b> <span>It refuses the page you would refuse (below).</span></li>
    <li><b>It has a ratchet.</b> <span>It compares each round with the last kept round, so a page can lose a little organisation at every step: the bakery's second run went 0.90 → 0.80 → 0.77, each step inside the limit. The fix is to compare with the best organisation any kept round reached.</span></li>
  </ol>
  <h3>The page the new rule refuses</h3>
  ${pair}
  <h3>The organisation judge reads the words, not only the outline</h3>
  <p>The five runs of each brief share one structure; only round 0's words were written afresh. The reviewer answers at temperature 0, so this is not sampling noise: new words on the same outline move its answer by up to 0.6.</p>
  ${spread}
  <p class="small">On four briefs that is more than the 0.1 the rule guards, so the rule partly guards wording. Jazz is low whatever the words: the judge dislikes that structure. Next: a second judge that sees the outline with the words taken out (section kinds, parts, bands), and the rule applied to that one.</p>
  <h3>Two new checks</h3>
  <ol class="findings">
    <li><b>A list repeated across sections.</b> <span>It fired on all four bakery runs and one puppy run, and it is right: the call to action repeats the feature cards (sourdough, croissants, cakes). Rewording cannot clear it, because the brief names only three products, so the model writes the same three again. The repair has to be structural: take the list out of the later section.</span></li>
    <li><b>Prices that disagree.</b> <span>It never fired: every kept page uses one currency. But the jazz page still says "Tickets from $45" above a $35 ticket, which this check does not compare. Next: a "from $X" line must equal the cheapest item.</span></li>
  </ol>
  <h3>The photo scout asks two questions</h3>
  <p>"Would this photo make sense on a page for …" invites yes: in session 1 the running page kept a dog and some sheep. A second question, "does this photo show what this page is about?", worded with the page's own name and what it must show, stops them. The library has no runner, band or plumber photo, so for those pages the right answer is no photo, and that is what the scout now gives.</p>
  ${photos}
  <h3>Next</h3>
  <ol class="findings">
    <li><b>Fix the ratchet.</b> <span>Compare with the best organisation any kept round reached.</span></li>
    <li><b>Judge organisation without the words.</b> <span>Section kinds, parts and bands only, with its spread measured the same way.</span></li>
    <li><b>Repairs that work for the two new checks.</b> <span>Drop a repeated list from the later section; check "from $X" against the cheapest item.</span></li>
    <li><b>Freeze the harness for OWN-030.</b> <span>The same 2B model and briefs, built through NodeGX, as plain HTML from the same answers, and by the model writing code. You rank the pages blind.</span></li>
  </ol>
</section>`;
}
