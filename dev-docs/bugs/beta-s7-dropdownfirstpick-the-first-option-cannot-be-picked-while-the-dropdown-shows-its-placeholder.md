---
id: BETA-S7-DROPDOWNFIRSTPICK
title: While a Dropdown shows its placeholder because its value is not in the list, the browser has the first option selected underneath, so picking that option does nothing
status: fixed
commit: 483335262
severity: medium
area: viewer / Dropdown (`packages/noodl-viewer-react/src/components/controls/Select/Select.tsx`: `value={options.find(...) ? value : undefined}` and the hidden `<option value="" disabled selected hidden />`)
found: the Beta sweep s7, 2026-10-25, fixing P121-TWO005-DROPDOWNSTALE (the spec's golden and P109-S21-DROPDOWNEMPTYRESET's scenarios)
evidence: packages/nodegx-node-spec/scenarios/net.noodl.controls.options.json "Items written with the current Value absent: … a pick of it raises only Focused", graded on the runtime by conformance (91/91)
kit: core
regression: packages/nodegx-node-spec/scenarios/net.noodl.controls.options.json "the selected option leaves the list: the node keeps its value, the element selects its hidden empty option, and picking the first option of the new list fires Changed, as picking another does"
---

When the node's value is not one of the options (the community template's Report page: the reasons arrive, nothing is
chosen yet, the face reads "Choose why"), `Select` hands React `value={undefined}`. The `<select>` is then uncontrolled,
and when the option it had selected leaves the list, HTML's reset selects the first enabled option. The face still draws the
placeholder, because it reads the node's value, not the element's. A person who opens the list and picks the first reason
picks the option the element already selects, the browser raises no `change`, and nothing happens: Value stays `''`, the
face still says "Choose why", and the form refuses as if nothing had been chosen. Every other option works.

The node spec records this as the runtime's truth (P109-S21-DROPDOWNEMPTYRESET corrected the spec to the browser; it did
not change the product). Measured by conformance on the runtime in jsdom; not yet seen in Chrome, where the HTML reset is
the same.

Fix, proposed: hand the `<select>` `''` instead of `undefined` when the value is not offered, so the hidden empty option
(which is already there for this) stays selected and the first option is a change. That moves the Dropdown spec's
`domSelected` model and P109-S21's scenarios with it, so it is a spec version.

**Plain words:** *"On a form whose dropdown says 'Choose why', choosing the first reason does nothing."*

**Fixed 2026-10-25 (the Beta sweep s7), as proposed.** `Select.tsx` tells the `<select>` the node's value while an option
carries it and `''` otherwise, so the hidden empty option stays selected under the placeholder and every option is a pick.
"Carries" is the browser's comparison (`domValueOf`: the Value as text, or with none the label's text, as the spec's
`optionsOf`), because the old `i.props.value === value` missed a number Value (`3` vs the picked `"3"`) and a Value-less
option, which `''` would then have knocked back to the placeholder. The face reads the same way: after picking an option
whose Value is a number it drew the placeholder.

Spec v12: `domSelected` is the value if offered, else `''` (v7's reset and empty-list models go). Four scenarios' first-option
picks now send Value with Changed; three were renamed to say so. Graded: conformance on the runtime 91/91 (red 4 against
HEAD's `Select.tsx`), no mutant survivors; `tests/beta-s7-dropdownfirstpick.test.tsx` (the face) red 2/3 on HEAD, 3/3
after. Not driven in Chrome.
