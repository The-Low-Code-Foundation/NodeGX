// What every tab's rows need: the season's rules, the numbers on stage this season, the rehearsal forecast.
// A row is a plain object with a stable `id` (a Repeater matches rows to items by it) and only the fields the row
// component's Component Inputs declare.
const { CLS, NUMBERS, MOVES, seasonRules } = use('rules/data');
const { simulate } = use('rules/engine');

const rules = (save) => seasonRules(save.season);
const activeNums = (save) => save.plan.order.filter((id) => NUMBERS[id] && rules(save).classes.includes(NUMBERS[id].cls));
const forecast = (save) => simulate({ plan: save.plan, school: save.school, season: save.season, mode: 'rehearsal', seed: save.seed });
const clsColor = (cls) => (cls && CLS[cls] ? CLS[cls].color : '#f5b942');
const diffDots = (d) => '●'.repeat(d) + '○'.repeat(Math.max(0, 3 - d));
const LEVEL_ICON = ['⬇', '➖', '⬆'];
const BLOCK_COLORS = ['#86d9a6', '#b48cff', '#7cc6ff', '#ffb86b', '#ff9ec7', '#f5e36b', '#9fe0e0', '#d0b0ff'];
const blockColor = (np, bid) => BLOCK_COLORS[Math.max(0, np.blocks.findIndex((b) => b.id === bid)) % BLOCK_COLORS.length];
const blockCounts = (b) => b.moves.reduce((s, mid) => s + (MOVES[mid] ? MOVES[mid].c : 0), 0);
// a chain's counts as a sum, equal blocks in a row grouped: "3 × 32 + 16"
function chainSum(parts) {
  const out = [];
  for (const p of parts) { const last = out[out.length - 1]; if (last && last.v === p) last.n++; else out.push({ v: p, n: 1 }); }
  return out.map((x) => (x.n > 1 ? `${x.n} × ${x.v}` : `${x.v}`)).join(' + ') || '0';
}
const linkMark = (l) => (!l ? '' : l.gap === 0 && !l.off ? '✨' : l.gap === 2 ? '💥' : '〰️');
// the number the formation and costume tabs show: the one picked, or a sensible first one
function pickedNum(save, ui, prefer) {
  const nums = activeNums(save);
  if (nums.includes(ui.pickNum)) return ui.pickNum;
  return nums.includes(prefer) ? prefer : nums[0];
}
function numChips(save, ui, w, picked) {
  return activeNums(save).map((id) => ({ id, label: w.numName(id), pressed: id === picked, dot: clsColor(NUMBERS[id].cls) }));
}
const facts = (list) => list.filter(Boolean).map((text, i) => ({ id: `f${i}`, text }));

Object.assign(exports, { rules, activeNums, forecast, clsColor, diffDots, LEVEL_ICON, BLOCK_COLORS, blockColor, blockCounts, chainSum, linkMark, pickedNum, numChips, facts });
