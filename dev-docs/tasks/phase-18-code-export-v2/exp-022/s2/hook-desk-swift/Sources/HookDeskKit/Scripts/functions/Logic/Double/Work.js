// @nodegx:generated (EXP-022) — the Function node "Work" (node dbFn) of Logic/Double.
// The body is preserved verbatim; it runs in the app's JavaScriptCore context, as it runs in the web export.
__nodegx.define("Logic/Double/Work", function (Inputs, Outputs, self, Component) {
  try {
    (() => {
Outputs.y = (Number(Inputs.x) || 0) * 2;
    })();
  } catch (e) {
    console.error("Function node Work threw:", e);
  }
  return Outputs;
});
