// @nodegx:generated (EXP-022) — the Function node "Bump" (node bump) of Pages/Home.
// The body is preserved verbatim; it runs in the app's JavaScriptCore context, as it runs in the web export.
// It keeps state on `this` across runs: the body runs bound to the node's own `self`.
__nodegx.define("Pages/Home/Bump", function (Inputs, Outputs, self, Component) {
  try {
    (function () {
this.n = (this.n || 0) + 1;
Outputs.n = this.n;
    }).call(self);
  } catch (e) {
    console.error("Function node Bump threw:", e);
  }
  return Outputs;
});
