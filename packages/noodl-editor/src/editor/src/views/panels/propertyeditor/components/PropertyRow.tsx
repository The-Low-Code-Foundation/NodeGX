/**
 * CHR-008 §3.2 — one row, drawn by React, with what the decorators used to do as props.
 *
 * ## What this replaces, and what it deliberately does not
 *
 * `Ports.renderParams` decorated every row by mutating its rendered element: ERG-004's description
 * (`portDescription.ts`), BCN-010's capability gate (`portDecoration.ts`), FB-021's switched-off
 * gate (`portGate.ts`) and FB-017's structural hint (`portHint.ts`) — 561 lines of DOM building,
 * applied after the fact to whatever one of thirty-eight row classes produced.
 *
 * Three of the four are facts about the port, known before anything is drawn, and they are props
 * here. **The hint is not, yet**: `applyPortHint` is re-applied *in place* by `Ports.refreshHints`
 * when a parameter changes, precisely so the panel does not rebuild its rows under a focused field
 * — and §8's measurement is what a rebuild costs (the caret). So this row *marks* itself with
 * `data-hint-ports`, exactly as `applyPortHint` did, and the note stays a post-commit pass until
 * the rows hold their values in React state (§3.1). Converting it now would trade a measured
 * defect for a worse one.
 *
 * ## 🔴 The wrapper chain is byte-identical on purpose
 *
 * `fb-021/portGate.test.ts`, `chr-008/groupGateRender.test.tsx` and the panel's stylesheet all
 * describe the same nesting, and the drive compares panels before and after this change:
 *
 *     .property-panel-row[title=description][data-hint-ports]
 *       └ .property-port-gated[data-gated-port]              (FB-021, when switched off)
 *           ├ .property-port-gated-control[aria-disabled]
 *           │   └ .property-capability-gated[data-capability-state]   (BCN-010, when gated)
 *           │       ├ .property-capability-gated-control[aria-disabled]
 *           │       │   └ the control
 *           │       └ .property-capability-reason
 *           ├ .property-port-gate-reason  › sentence + .property-port-gate-link   (unless quiet)
 *           └ .property-port-gate-dead-wire                   (drawn even when quiet)
 *
 * The one addition is `.property-panel-row` itself, which is what CHR-009's row grid needs to exist
 * at all (§3 of that task: "the row grid is ONE rule in `PropertyRow.module.scss`"). ERG-004's
 * description moves from the control element onto it — a native `title` inherits to the children,
 * so hovering the label or the field both still answer.
 *
 * ⚠️ **Not `.property-row`**, which is taken: `propertyeditor.css:98` makes that a `display: flex`
 * row with `> .property-label` / `> .property-value` child rules, and `CodeEditor/Property.tsx`
 * renders it. Reusing the name would have laid every row out as a flex container and nested a
 * same-named row inside itself. `.property-panel-row` and `.property-row-control` carry no rule at
 * all today, which is what keeps this conversion layout-neutral — `.properties` has none either.
 *
 * ## Hook-free, so the runner can grade it
 *
 * Like `GroupHeading` and `GroupGateLine` beside it: this component calls no hooks, so
 * `tests-unit/support/renderElements` can evaluate it end to end and grade the actual tree. The
 * part that cannot be hook-free — hosting an element built outside React — is {@link ControlHost},
 * which is separate for exactly that reason.
 */
import classNames from 'classnames';
import React, { useLayoutEffect, useRef } from 'react';

import type { PortGateReason } from '@noodl-models/nodelibrary/portGateReason';
// 🔴 The CLASSES module, never `portDecoration` itself: that one imports `./index` for
// `gateSentence`, which reaches `projectmodel` → `bugtracker` and cannot load in the `tests-unit`
// runner. See `portDecorationClasses.ts` for the whole note.
import {
  GATED_PORT_CLASS as CAPABILITY_CLASS,
  GATED_PORT_CONTROL_CLASS as CAPABILITY_CONTROL_CLASS,
  GATED_PORT_REASON_CLASS as CAPABILITY_REASON_CLASS
} from '@noodl-utils/capability-gating/portDecorationClasses';
import {
  DEAD_WIRE_SENTENCE,
  GATED_PORT_ATTRIBUTE,
  GATED_PORT_CLASS,
  GATED_PORT_CONTROL_CLASS,
  GATED_PORT_DEAD_WIRE_CLASS,
  GATED_PORT_LINK_CLASS,
  GATED_PORT_REASON_CLASS
} from '@noodl-utils/portGate';
import { HINT_PORTS_ATTRIBUTE } from '@noodl-utils/portHint';

/** The class CHR-009's row grid hangs off. One per drawn row, whatever produced its control. */
export const PROPERTY_ROW_CLASS = 'property-panel-row';

// ── P94 STY-003, rules 2 and 3 ───────────────────────────────────────────────

/**
 * The attribute the row's provenance treatment hangs off — `linked` or `overridden`.
 *
 * 🔴 **An attribute, not a second class, and read from the rendered element.** AC5 is graded by
 * reading the element a person actually sees ([[a-ring-must-be-read-on-the-element-a-person-sees]]),
 * and a `data-` attribute survives a class list the row already shares with four other decorators.
 * A `plain` row carries **nothing** — the absence is the signal (design §3.2), so there is no
 * third value to match and no way for a "none" state to be styled by accident.
 */
export const LOOK_TREATMENT_ATTRIBUTE = 'data-look-treatment';

/** The override's own line: what the Look wanted, and the way back to it. */
export const LOOK_OVERRIDE_CLASS = 'property-look-override';
/** The revert control inside that line (rule 3: "loud **and** reversible"). */
export const LOOK_REVERT_CLASS = 'property-look-revert';

/**
 * Where one row's value came from — `fieldState.readField`'s answer, narrowed to what is drawn.
 *
 * 🔴 **Never constructed from a value comparison.** A linked field and an own field can hold the
 * same resolved value; a treatment that appeared only when they differed would be invisible in
 * exactly the case a person most needs it, which is the trap STY-003 §2 names
 * ([[a-css-property-whose-default-equals-the-test-value]]). The caller passes what `readField`
 * decided on **ownership**, and this component never second-guesses it.
 *
 * ⚠️ **And it is not the changed-dot.** The dot means `parameters[name] !== undefined` — "this node
 * owns this value" — which cannot say where a value came from, and design §2 forbids reusing it
 * for this.
 */
export interface PropertyRowLook {
  /** `plain` is never passed: a row with nothing to say is given no `look` at all. */
  treatment: 'linked' | 'overridden';
  /** The Look's name — the thing rule 2 says every styled field must name. */
  lookName: string;
  /** Rule 3 — what the Look wanted, already rendered as text by the caller. */
  lookValueText?: string;
  /** Rule 3 — put the field back under the Look. Omitted → no button, rather than a dead one. */
  onRevert?: () => void;
}

/** BCN-010, narrowed to what the row draws. `sentence` is `gateSentence`'s answer, resolved by `Ports`. */
export interface PropertyRowCapability {
  portName: string;
  /** `unsupported` / `degraded` — never `supported`, which draws nothing. */
  state: string;
  /** A `degraded` gate is NOT disabled: the operation works, with a caveat. */
  isUsable?: boolean;
  sentence: string;
}

/** FB-021 — the port a `dynamicports` condition has switched off. */
export interface PropertyRowGate {
  reason: PortGateReason;
  /** Is a wire delivering a value into the switched-off port? */
  isConnected?: boolean;
  /** Travel to the gating control. Omitted → no button, rather than a dead one. */
  onFocusGate?: () => void;
  /** CHR-008 R8 — the group's one line speaks for this row, so it says nothing itself. */
  quiet?: boolean;
}

export interface PropertyRowProps {
  /** ERG-004 — the port's own description, already trimmed and length-capped by `Ports`. */
  description?: string;
  capability?: PropertyRowCapability;
  gate?: PropertyRowGate;
  /** P94 STY-003 — where this row's value came from, when there is a Look to attribute it to. */
  look?: PropertyRowLook;
  /** FB-017 AC4 — the hintable ports this row speaks for; drawn as the marker `refreshHints` finds. */
  hintPorts?: string[];
  /** The control: today an element built by a row class, tomorrow a widget component. */
  children: React.ReactNode;
}

/**
 * BCN-010's wrapper.
 *
 * ⚠️ `degraded` keeps a live control on purpose — rendering it as unavailable would take a working
 * control away on the strength of a footnote, which is the mirror of the bug BCN-010 fixed.
 */
function withCapability(content: React.ReactNode, capability: PropertyRowCapability) {
  return (
    <div
      className={CAPABILITY_CLASS}
      data-capability-state={capability.state}
      data-test={`capability-gated-port-${capability.portName}`}
    >
      {capability.isUsable ? (
        content
      ) : (
        <div className={CAPABILITY_CONTROL_CLASS} aria-disabled>
          {content}
        </div>
      )}
      <div
        className={CAPABILITY_REASON_CLASS}
        data-test={`capability-reason-${capability.portName}`}
        title={capability.sentence}
      >
        {capability.sentence}
      </div>
    </div>
  );
}

/**
 * FB-021's wrapper.
 *
 * 🔴 The dead-wire line stays OUTSIDE the dimmed control, and is drawn even when the row is quiet.
 * A backend gate means "this cannot work"; this means "this is working and being thrown away",
 * which is the more urgent of the two — and a group line cannot carry a fact about one row's wiring.
 */
function withGate(content: React.ReactNode, gate: PropertyRowGate) {
  const { reason, quiet, isConnected, onFocusGate } = gate;

  return (
    <div
      className={GATED_PORT_CLASS}
      data-gated-port={reason.portName}
      data-test={`gated-port-${reason.portName}`}
      // The sentence still names the row for a pointer that rests on it — as a tooltip, never on screen.
      title={quiet ? reason.sentence : undefined}
    >
      <div className={GATED_PORT_CONTROL_CLASS} aria-disabled>
        {content}
      </div>

      {!quiet && (
        <div className={GATED_PORT_REASON_CLASS} data-test={`gate-reason-${reason.portName}`}>
          {/* Text, never markup: a port's `displayName` reaches this string and a kit node supplies its own. */}
          <span title={reason.sentence}>{reason.sentence}</span>
          {onFocusGate && (
            <button
              type="button"
              className={GATED_PORT_LINK_CLASS}
              data-test={`gate-link-${reason.portName}`}
              title={`Go to ${reason.gateLabel}`}
              onClick={(event) => {
                // The control underneath is inert, but the wrapper is not: without this the click
                // also reaches the group header and folds the group the author is being sent into.
                event.stopPropagation();
                onFocusGate();
              }}
            >
              {`Show ${reason.gateLabel}`}
            </button>
          )}
        </div>
      )}

      {isConnected && (
        <div
          className={GATED_PORT_DEAD_WIRE_CLASS}
          data-test={`gate-dead-wire-${reason.portName}`}
          title={DEAD_WIRE_SENTENCE}
        >
          {DEAD_WIRE_SENTENCE}
        </div>
      )}
    </div>
  );
}

/**
 * P94 STY-003 rule 3 — the override's line.
 *
 * 🔴 **Drawn for `overridden` only.** A linked row says where it came from through the section
 * header and its own treatment; adding a line to every linked field would put the Look's name on
 * ten rows at once, which is the shouting design §3.1 avoids by naming the source once. An
 * override is the exception because it is the one case where the panel knows something the person
 * cannot see: a value the Look offered and this node is ignoring.
 */
function lookOverrideLine(look: PropertyRowLook) {
  // `null`, not an empty div: a row with nothing to say must add nothing to the grid.
  if (look.treatment !== 'overridden') return null;

  const said = look.lookValueText ? `${look.lookName} says ${look.lookValueText}` : `Overrides ${look.lookName}`;

  return (
    <div className={LOOK_OVERRIDE_CLASS} data-test="look-override-line">
      {/* Text, never markup: a Look's name is typed by a person. */}
      <span title={said}>{said}</span>
      {look.onRevert && (
        <button
          type="button"
          className={LOOK_REVERT_CLASS}
          data-test="look-revert"
          title={`Use ${look.lookName}'s value`}
          onClick={(event) => {
            // As the gate link does: the wrapper is live even where the control is not, and
            // without this the click also reaches the group header and folds the group.
            event.stopPropagation();
            look.onRevert();
          }}
        >
          Revert
        </button>
      )}
    </div>
  );
}

/** One property row: the control, and everything the panel says about it. */
export function PropertyRow({ description, capability, gate, look, hintPorts, children }: PropertyRowProps) {
  let content: React.ReactNode = children;

  // Innermost first, so the nesting matches what `renderParams` built: describe → capability → gate.
  if (capability) content = withCapability(content, capability);
  if (gate) content = withGate(content, gate);

  const marked = hintPorts && hintPorts.length ? hintPorts.join(',') : undefined;

  return (
    <div
      className={PROPERTY_ROW_CLASS}
      // ERG-004. Absent rather than empty: an empty `title` renders as a blank grey box on hover.
      title={description || undefined}
      // FB-017 AC4 — recorded whether or not a note is drawn; this is how `refreshHints` finds the
      // row again later, when the condition has changed but the panel has not re-rendered.
      {...(marked ? { [HINT_PORTS_ATTRIBUTE]: marked } : {})}
      // P94 STY-003 — absent on a plain row, so "no Look" is styled by nothing at all.
      {...(look ? { [LOOK_TREATMENT_ATTRIBUTE]: look.treatment, 'data-look-name': look.lookName } : {})}
    >
      {content}
      {look && lookOverrideLine(look)}
    </div>
  );
}

/**
 * Hosts a control built outside React — a row class's element — inside the tree.
 *
 * ⚠️ **Separate from {@link PropertyRow} because it cannot be hook-free**, and a hook makes a
 * component unrenderable by the `tests-unit` runner (`support/renderElements`: React's dispatcher
 * is null outside a render, so a hook throws rather than returning something wrong). It is the same
 * split `PropertyGroups` makes for `GroupHeading`, and it inherits the job of the `RowHost` this
 * task deleted: hosting row elements that were built outside React.
 *
 * 🔴 The element is appended, never re-created: a row class's `render()` mints a NEW element on
 * every call (`BasicType.render` builds a fresh `div` while `this.root` stays bound to the old
 * one), so calling it twice would hand back an empty row. `Ports` calls `render()` once per view
 * and this hosts the result for as long as the view lives.
 */
export function ControlHost({ el }: { el: HTMLElement | null | undefined }) {
  const ref = useRef<HTMLDivElement>(null);

  // Layout effect, as `RowHost` used: the panel measures these rows (popout anchoring, scroll
  // restore) immediately after rendering, so they have to be in place before paint.
  useLayoutEffect(() => {
    const host = ref.current;
    if (!host || !el) return;

    host.appendChild(el);
    return () => {
      if (el.parentElement === host) host.removeChild(el);
    };
  }, [el]);

  return <div ref={ref} className={classNames('property-row-control')} />;
}
