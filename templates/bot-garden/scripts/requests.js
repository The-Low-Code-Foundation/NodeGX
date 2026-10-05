function iwlFirstSeek(list) {
  if (!Array.isArray(list)) return '';
  for (var i = 0; i < list.length; i++) {
    var b = list[i];
    if (!b || typeof b !== 'object') continue;
    if (b.t === 'go_nearest' && b.slots && typeof b.slots.kind === 'string' && b.slots.kind) return b.slots.kind;
    var inner = iwlFirstSeek(b.body);
    if (inner) return inner;
  }
  return '';
}
function iwlReadsEnvelope(req) {
  var th = req && Array.isArray(req.things) ? req.things : [];
  for (var i = 0; i < th.length; i++) if (th[i] && th[i].kind === 'letter' && typeof th[i].to === 'string' && th[i].to) return true;
  return false;
}

// What this file gives: Scripts.requests.<name> in a Function, use('requests') in another file.
exports.iwlFirstSeek = iwlFirstSeek; exports.iwlReadsEnvelope = iwlReadsEnvelope;
