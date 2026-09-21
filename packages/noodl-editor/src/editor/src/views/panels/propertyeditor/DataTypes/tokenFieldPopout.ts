import React from 'react';
import { createRoot } from 'react-dom/client';

import { tokenCategoriesForPort, tokensForPicking } from '@noodl-models/StyleTokensModel/TokensForPicking';

import { TokenFieldPicker } from '../components/TokenFieldPicker';
import { unmountReactRoot } from '../../../../../../shared/utils/unmountReactRoot';

/**
 * HLT-012 — open the token picker for one parameter, from the row that owns it.
 *
 * 🔴 **One opener, three rows.** `NumberWithUnits`, `Dimension` and `MarginPaddingType` all reach
 * this function rather than each carrying the popout plumbing, for the reason REL-014 recorded when
 * it pulled `parseNumberWithUnit` into one place: three copies is how a fix lands in one field and
 * not the others, and §6 of this task names that outcome as *worse* than not shipping — a product
 * where padding can be picked and gap cannot teaches a rule that is false.
 *
 * ⚠️ **The model is built per open and disposed on close.** `StyleTokensModel` is a `Model` with
 * listeners; the property panel draws dozens of rows and a model per row would be dozens of live
 * listeners for a popout almost none of them will ever open. `ColorStylePicker` builds one the same
 * way for the same reason.
 */
export interface TokenFieldPopoutArgs {
  /** The row opening it — supplies `parent.showPopout` and the element to attach to. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  view: any;
  /** The port whose scale is being offered. Decides WHICH tokens, via `tokenCategoriesForPort`. */
  portName: string;
  /** What the popout hangs off. Defaults to the row's own element. */
  anchor?: HTMLElement;
  /** The `var(--name)` this parameter holds, when it holds one. */
  currentValue?: string;
  /** Called with `var(--name)`. The caller stores it; this function only closes the popout. */
  onSelect: (reference: string) => void;
}

/**
 * Whether a parameter has a scale to offer at all — the pure test a row calls on every render to
 * decide whether to draw the affordance.
 *
 * ⚠️ Deliberately does NOT read the token model. It is asked once per row per render and the answer
 * depends only on the port's name; a project cannot remove the shipped defaults, so a port this
 * returns `true` for always has something behind it.
 */
export function fieldOffersTokens(portName: unknown): boolean {
  return tokenCategoriesForPort(portName).length > 0;
}

/**
 * The token model, fetched at the point of use rather than imported at the top of this file.
 *
 * 🔴 **A top-level `import { StyleTokensModel }` here makes two sibling suites fail to RUN, not
 * fail.** Measured 2026-09-21 after landing exactly that: `StyleTokensModel.ts:17` pulls in
 * `projectmodel` → `warningsmodel`, whose module body reads `NodeLibrary.instance.on` — and under
 * this runner there is no `NodeLibrary.instance`. `tests-unit/rel-014`'s two specs reported
 * **`Tests: 0 total`** from a file neither of them means to load, because `marginPaddingEdit` →
 * `NumberWithUnits` → this module is a path they already travel. A suite that cannot start grades
 * nothing, so that is worse than a red: it is a gate silently switched off
 * ([[an-import-added-for-a-feature-can-switch-a-sibling-gate-off]]).
 *
 * Deferring the `require` to call time is enough — every caller runs long after the editor has
 * booted. `Ports.ts`' `projectModel()` is the same construction for the same reason, four files
 * away.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function newTokensModel(): any {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return new (require('@noodl-models/StyleTokensModel/StyleTokensModel').StyleTokensModel)();
}

export function openTokenFieldPopout({ view, portName, anchor, currentValue, onSelect }: TokenFieldPopoutArgs): void {
  const categories = tokenCategoriesForPort(portName);
  if (categories.length === 0) return;

  const tokensModel = newTokensModel();
  const groups = tokensForPicking(tokensModel.getTokens(), categories);

  // A project whose tokens have all been deleted out of these categories. The shipped defaults make
  // this unreachable today; drawing an empty popout is the FB-015 failure, so it is refused here too.
  if (groups.length === 0) {
    tokensModel.dispose();
    return;
  }

  const div = document.createElement('div');
  const root = createRoot(div);

  root.render(
    React.createElement(TokenFieldPicker, {
      groups,
      tokensModel,
      currentValue,
      onSelect: (reference: string) => {
        onSelect(reference);
        view.parent.hidePopout();
      }
    })
  );

  view.parent.showPopout({
    content: { el: div },
    attachTo: anchor || view.el,
    position: 'right',
    onClose: () => {
      unmountReactRoot(root);
      tokensModel.dispose();
    }
  });
}
