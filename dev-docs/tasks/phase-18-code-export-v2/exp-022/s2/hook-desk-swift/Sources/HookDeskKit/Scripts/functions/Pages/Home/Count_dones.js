// @nodegx:generated (EXP-022) — the Function node "Count_dones" (node dones) of Pages/Home.
// The body is preserved verbatim; it runs in the app's JavaScriptCore context, as it runs in the web export.
// It keeps state on `this` across runs: the body runs bound to the node's own `self`.
__nodegx.define("Pages/Home/Count_dones", function (Inputs, Outputs, self, Component) {
  try {
    (function () {
this.k = (this.k || 0) + 1;
Outputs.k = 'dones ' + this.k;
    }).call(self);
  } catch (e) {
    console.error("Function node Count_dones threw:", e);
  }
  return Outputs;
});
