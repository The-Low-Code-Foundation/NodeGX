/**
 * P94 STY-003 AC7 — one row of the Look menu, with R6's single visible `⋯`.
 *
 * 🔴 **What this replaces is a measured defect, not a preference.** Rename and delete were two
 * icons with `visibility: hidden`, revealed only by `:hover` — confirmed with a control pair on the
 * same element (at rest both report `hidden`; under a real hover both report `visible`). An action
 * nobody can see is an action nobody has; STY-001's scan found 4 Looks across 90 projects.
 *
 * ⚠️ **R6 overruled the obvious fix.** Making both icons always visible *"puts two bins in your
 * eyeline on every row"*; one `⋯` **"says 'there are actions here' without"** doing that. So the
 * actions live one press behind a control that is always visible, and the press is the thing AC7
 * grades — the actions must be reachable **without hovering**.
 */
import React from 'react';

import { Icon, IconName, IconSize } from '@noodl-core-ui/components/common/Icon';

export interface PickVariantItemProps {
  variant: TSFixme;
  /** How many nodes wear this Look (design §4's `26`). */
  wearers?: number;
  /** Whether the selected node is wearing it now. */
  isCurrent?: boolean;

  onPickVariant: () => void;
  onRenameVariant: (name: string) => void;
  onDeleteVariant: () => void;
}

type State = {
  editMode: boolean;
  /** R6: the `⋯` has been pressed and this row is showing what it can do. */
  actionsOpen: boolean;
  newVariantName: TSFixme;
};

export class PickVariantItem extends React.Component<PickVariantItemProps, State> {
  constructor(props: PickVariantItemProps) {
    super(props);

    this.state = {
      editMode: false,
      actionsOpen: false,
      newVariantName: props.variant.name
    };
  }

  onRenameVariant(e) {
    if (e.key === 'Enter') {
      this.props.onRenameVariant(this.state.newVariantName);
      this.setState({ editMode: false, actionsOpen: false });
    }
  }

  render() {
    if (this.state.editMode) {
      return (
        <div className="variants-pick-variant-item">
          <input
            className="variants-input"
            data-test="look-rename-input"
            value={this.state.newVariantName}
            autoFocus
            onChange={(e) => this.setState({ newVariantName: e.target.value })}
            onKeyUp={(e) => this.onRenameVariant(e)}
          />
        </div>
      );
    }

    return (
      <>
        <div
          className="variants-pick-variant-item"
          data-test={`look-menu-item-${this.props.variant.name}`}
          onClick={(e) => {
            this.props.onPickVariant();
            e.stopPropagation();
          }}
        >
          <div className="variant-item-name">{this.props.variant.name}</div>

          {/* Design §4's count. Quiet and on the trailing edge, like the panel's group badges:
              it is a fact about the Look, not a control. */}
          {this.props.wearers !== undefined && this.props.wearers > 0 && (
            <div className="variant-item-count" data-test="look-menu-wearers">
              {this.props.wearers}
            </div>
          )}

          {this.props.isCurrent && (
            <div className="variant-item-current" data-test="look-menu-current" title="This node wears this Look">
              <Icon icon={IconName.Check} size={IconSize.Small} />
            </div>
          )}

          {/* 🔴 R6's one control, and it carries NO `visibility` rule — which is the whole point.
              `variants-item-icon` is the class that was hidden until hover; this deliberately does
              not use it. */}
          <button
            type="button"
            className="variants-row-menu-button"
            data-test={`look-menu-actions-${this.props.variant.name}`}
            title={`Actions for ${this.props.variant.name}`}
            aria-expanded={this.state.actionsOpen}
            onClick={(e) => {
              this.setState({ actionsOpen: !this.state.actionsOpen });
              // Without this the press also picks the Look it was asking about.
              e.stopPropagation();
            }}
          >
            ⋯
          </button>
        </div>

        {this.state.actionsOpen && (
          <div className="variants-row-actions" data-test={`look-menu-actions-open-${this.props.variant.name}`}>
            <button
              type="button"
              className="variants-row-action"
              onClick={(e) => {
                this.setState({ editMode: true, actionsOpen: false });
                e.stopPropagation();
              }}
            >
              Rename
            </button>
            <button
              type="button"
              className="variants-row-action is-danger"
              onClick={(e) => {
                this.props.onDeleteVariant();
                this.setState({ actionsOpen: false });
                e.stopPropagation();
              }}
            >
              Delete
            </button>
          </div>
        )}
      </>
    );
  }
}
