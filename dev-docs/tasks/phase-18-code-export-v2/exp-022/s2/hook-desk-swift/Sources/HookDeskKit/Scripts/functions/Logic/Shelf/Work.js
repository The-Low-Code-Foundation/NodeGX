// @nodegx:generated (EXP-022) — the Function node "Work" (node sfFn) of Logic/Shelf.
// The body is preserved verbatim; it runs in the app's JavaScriptCore context, as it runs in the web export.
__nodegx.define("Logic/Shelf/Work", function (Inputs, Outputs, self, Component) {
  try {
    (() => {
Outputs.rows = ['a', 'b', 'c'].slice(0, (Number(Inputs.n) || 0) + 1).map(function (k) { return { id: k, name: 'pick ' + k }; });
    })();
  } catch (e) {
    console.error("Function node Work threw:", e);
  }
  return Outputs;
});
