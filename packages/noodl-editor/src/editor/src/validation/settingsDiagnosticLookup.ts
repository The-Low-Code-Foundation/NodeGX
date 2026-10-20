/**
 * P107 R40 — the validator's `settingsDiagnostics` callback (`ValidatorOptions.settingsDiagnostics`), one body for the
 * Problems panel and the agent server: a node's `settings: true` diagnostics, read from its saved params by
 * `@nodegx/node-spec`'s `settingsDiagnostics`. Imported by path, never through the validation index, because it brings
 * `@nodegx/node-spec` (drawnPortLookup.ts, the same reason).
 *
 * @module noodl-editor/validation/settingsDiagnosticLookup
 */

import { settingsDiagnostics, specFor } from '@nodegx/node-spec';

import type { SettingsDiagnosticsLookup } from './rules/types';

export const settingsDiagnosticLookup: SettingsDiagnosticsLookup = (nodeType, params, wired) => {
  const spec = specFor(nodeType);
  return spec ? settingsDiagnostics(spec, params, wired) : [];
};
