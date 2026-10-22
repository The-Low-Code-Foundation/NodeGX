// @nodegx:generated (EXP-022) — the Function node "Work" (node tlFn) of Logic/Tally.
// The body is preserved verbatim; it runs in the app's JavaScriptCore context, as it runs in the web export.
// It keeps state on `this` across runs: the body runs bound to the node's own `self`.
__nodegx.define("Logic/Tally/Work", function (Inputs, Outputs, self, Component) {
  try {
    (function () {
this.total = (this.total || 0) + (Number(Inputs.step) || 0);
Outputs.total = 'total ' + this.total;
Outputs.done();
    }).call(self);
  } catch (e) {
    console.error("Function node Work threw:", e);
  }
  return Outputs;
});
