/**
 * NSP-020 (s85, R19) — the node types whose ports an editor may draw from the spec in place of a viewer's announcement.
 *
 * Having `derived` is not drawing the ports: Cloud Function's and Navigate's `derived.inputs` return nothing and their
 * `in-*` / `pm-*` ports are discovered on a write (NSP-020 §6.9). A type is listed here only when oracle (a) GRADES its
 * draw — a row in the runtime's `test/node-spec/nsp-020-module-table.ts` `TABLE`, where the type's own `setup` hook is
 * fired and its announcement laid over `drawnPorts` — and no pinned line there says the runtime announces a port the
 * spec does not draw. That leaves out the HTTP Request (its Output Fields — `responseMapping`, `mapping-path-*`, `out-*` —
 * and Conditional are not in the spec, http.ts :47-50), so nothing reading this list refuses a wire to one of them.
 *
 * Read by the MCP server (`get_component`'s drawn ports and the wire check, R19) and the ledger's AC4 column. Held to
 * the table both ways by `nsp-020-ports-parity.test.ts`: a graded row whose names are complete and is missing here, or a
 * type here with no such row, is red — except the types in `ADAPTER_GRADED_TYPES`, below.
 *
 * NSP-021 (s87) — a type whose ports no runtime hook announces, and an EDITOR ADAPTER draws instead, is graded by oracle
 * (c): the adapter itself, run over a fake project model, against `drawnPorts` (`noodl-editor/tests-unit/nsp-020/
 * adapter-ports.test.ts`, which holds `ADAPTER_GRADED_TYPES` to its own cases both ways).
 */
export const ADAPTER_GRADED_TYPES: readonly string[] = Object.freeze(['RouterNavigate']);

export const DRAWN_PORT_TYPES: readonly string[] = Object.freeze([
  'AddDbModelRelation',
  'And',
  'Color Blend',
  'DbCollection2',
  'DbModel2',
  'DeleteDbModelProperties',
  'Expression',
  'Filter Collection',
  'FilterDBModels',
  'For Each',
  'JavaScriptFunction',
  'Javascript2',
  'Logic Builder',
  'Model2',
  'NavigationClosePopup',
  'NavigationShowPopup',
  'NewDbModelProperties',
  'NewModel',
  'Or',
  'Page Stack',
  'PageInputs',
  'PageStackNavigate',
  'PageStackNavigateBack',
  'PageStackNavigateToPath',
  'RouterNavigate',
  'RemoveDbModelRelation',
  'Set Variable',
  'SetDbModelProperties',
  'SetModelProperties',
  'Sign File URL',
  'States',
  'String Format',
  'String Mapper',
  'SubscribeToChanges',
  'Upload File',
  'net.noodl.controls.options',
  'net.noodl.controls.textinput',
  'net.noodl.user.SetUserProperties',
  'net.noodl.user.SignUp',
  'net.noodl.user.User'
]);
