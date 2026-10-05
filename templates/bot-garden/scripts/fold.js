function sameBlock(a, b) {
  if (!a || !b) return false;
  // P108 IW-003 (lane M): two REPEATS are the same block when their shapes are (t, n, slots, body, else): pours folded
  // into repeat 3 inside each pass of the tulips dance still let the passes fold (before, a container never matched).
  // (s3 merge) Only a repeat: an if / until / when still never matches — with it, bowl-if's recording offered a rotated
  // body holding its if (lane F's fold-nudge rule, red), and a pad recording never holds one anyway.
  if (a.body || b.body) return a.t === 'repeat' && b.t === 'repeat' && !!a.body && !!b.body && JSON.stringify(shapeOf([a])) === JSON.stringify(shapeOf([b]));
  if (a.t !== b.t || (Number(a.n) || 0) !== (Number(b.n) || 0)) return false;
  return JSON.stringify(a.slots || {}) === JSON.stringify(b.slots || {});
}
function sameRun(seq, at, from, len) { for (var k = 0; k < len; k++) if (!sameBlock(seq[at + k], seq[from + k])) return false; return true; }
/** The mockup's findRepeat: runs of one block, repeated sequences up to FOLD_MAX_LEN long (the mockup: six; IG-002: the fetch-and-return dance is nine); best coverage wins, the SHORTER sequence (the higher count) on a tie — Richard's ruling 2026-09-28, the mockup kept the longer. */
function findRepeatIn(seq) {
  var best = null;
  for (var len = 1; len <= 12; len++) {
    for (var i = 0; i + len * 2 <= seq.length; i++) {
      var count = 1;
      while (i + (count + 1) * len <= seq.length && sameRun(seq, i, i + count * len, len)) count++;
      // P106 s3 (lane F): a run seen only twice that does not start the list is held back. It may be the tail of a longer
      // body the child is still recording (the tulips dance ends right, forward, right, forward), and folding it first
      // leaves a shape the longer body can never fold into. Seen a third time, or from the list's start, it is offered.
      if (count === 2 && i > 0) continue;
      if (count >= 2) { var cover = len * count; if (!best || cover > best.cover || (cover === best.cover && len < best.len)) best = { i: i, len: len, count: count, cover: cover }; }
    }
  }
  return best;
}
/** Top level first; then a second pass inside each container, depth-first. */
function findRepeat(list) {
  var top = findRepeatIn(list);
  if (top) { top.containerId = null; return top; }
  for (var i = 0; i < list.length; i++) {
    var b = list[i];
    if (!b || !Array.isArray(b.body)) continue;
    var inner = findRepeatIn(b.body);
    if (inner) { inner.containerId = b.id; return inner; }
    var deeper = findRepeat(b.body);
    if (deeper) return deeper;
  }
  return null;
}
// P108 IW-004 (lane B): an if's else list (brief §4.3) is walked wherever a body is — the ids, the parent list, the copy,
// the shape — so maxId never mints an id an else block already has.
function findBlock(list, id) { for (var i = 0; i < list.length; i++) { var b = list[i]; if (!b) continue; if (b.id === id) return b; if (b.body) { var f = findBlock(b.body, id); if (f) return f; } if (Array.isArray(b['else'])) { var fe = findBlock(b['else'], id); if (fe) return fe; } } return null; }
function parentListOf(list, id) { for (var i = 0; i < list.length; i++) { var b = list[i]; if (!b) continue; if (b.id === id) return list; if (b.body) { var f = parentListOf(b.body, id); if (f) return f; } if (Array.isArray(b['else'])) { var fe = parentListOf(b['else'], id); if (fe) return fe; } } return null; }
function maxId(list, m) { m = m || 0; for (var i = 0; i < list.length; i++) { var b = list[i]; if (!b) continue; if (Number(b.id) > m) m = Number(b.id); if (b.body) m = maxId(b.body, m); if (Array.isArray(b['else'])) m = maxId(b['else'], m); } return m; }
function reId(block, next) { var c = JSON.parse(JSON.stringify(block)); c.id = next.n++; if (c.body) for (var i = 0; i < c.body.length; i++) c.body[i] = reId(c.body[i], next); if (Array.isArray(c['else'])) for (var e = 0; e < c['else'].length; e++) c['else'][e] = reId(c['else'][e], next); return c; }
function shapeOf(list) { var out = []; for (var i = 0; i < list.length; i++) { var b = list[i]; if (!b) continue; var s = { t: b.t }; if (b.n !== undefined) s.n = b.n; if (b.slots) s.slots = b.slots; if (b.body) s.body = shapeOf(b.body); if (Array.isArray(b['else'])) s['else'] = shapeOf(b['else']); out.push(s); } return out; }

// What this file gives: Scripts.fold.<name> in a Function, use('fold') in another file.
exports.findBlock = findBlock; exports.findRepeat = findRepeat; exports.findRepeatIn = findRepeatIn;
exports.maxId = maxId; exports.parentListOf = parentListOf; exports.reId = reId;
exports.sameBlock = sameBlock; exports.sameRun = sameRun; exports.shapeOf = shapeOf;
