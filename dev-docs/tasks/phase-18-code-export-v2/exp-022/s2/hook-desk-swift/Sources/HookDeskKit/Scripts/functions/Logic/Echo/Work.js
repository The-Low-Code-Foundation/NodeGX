// @nodegx:generated (EXP-022) — the Function node "Work" (node ecFn) of Logic/Echo.
// The body is preserved verbatim; it runs in the app's JavaScriptCore context, as it runs in the web export.
__nodegx.define("Logic/Echo/Work", function (Inputs, Outputs, self, Component) {
  try {
    (() => {
Outputs.echo = 'echo ' + Inputs.said;
    })();
  } catch (e) {
    console.error("Function node Work threw:", e);
  }
  return Outputs;
});
