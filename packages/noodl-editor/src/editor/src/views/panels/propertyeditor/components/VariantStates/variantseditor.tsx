/**
 * P94 STY-003 — the Look row (design §3.1, §3.2).
 *
 * 🔴 **One row decides it** (rule 1). This used to be one of two controls that set a node's
 * styles: this row, and the `Preset` / `Size` picker below it, which stamped an `ElementConfig`
 * variant's parameters in place and created nothing. Both were called "variant" and nothing drew a
 * line between them — the stylesheet next door still carries the note about it. The other one is
 * gone (STY-002 AC5), so this is now the only control that does this.
 *
 * ⚠️ **"Look" is the working name**, from the design Richard ruled; §9 leaves the final name open
 * and STY-002 AC6 is where a different one would land. It is used here rather than "Variant"
 * because the word `variant` names two different things in this codebase and the confusion is what
 * the phase exists to remove.
 */
import React from 'react';
import { createRoot, Root } from 'react-dom/client';

import { ProjectModel } from '@noodl-models/projectmodel';

import { Icon, IconName } from '@noodl-core-ui/components/common/Icon';

import PopupLayer from '../../../../popuplayer';
import { ToastLayer } from '../../../../ToastLayer/ToastLayer';
import { PickVariantPopup } from './PickVariantPopup';

// Styles
require('../../../../../styles/propertyeditor/variantseditor.css');

export interface VariantsEditorProps {
  model: TSFixme;

  onEditVariant: () => void;
  onDoneEditingVariant: () => void;
}

type State = {
  variant: TSFixme;
  editMode?: boolean;
};

export class VariantsEditor extends React.Component<VariantsEditorProps, State> {
  model: VariantsEditorProps['model'];
  popout: any;
  popupAnchor: HTMLDivElement;
  private popupRoot: Root | null = null;

  constructor(props: VariantsEditorProps) {
    super(props);

    this.model = props.model;
    this.state = {
      variant: this.model.variant
      //   canUpdateVariant:_hasParameterChanges(this.model)
    };
  }

  componentDidMount() {
    /*   this.model.on(['variantUpdated','variantChanged','parametersChanged','stateTransitionsChanged','defaultStateTransitionChanged'],() => {
            this.setState({
                variant:this.model.variant,
                canUpdateVariant:_hasParameterChanges(this.model)
            })
        },this)*/

    this.model.on(
      ['variantChanged'],
      () => {
        this.setState({
          variant: this.model.variant
        });
      },
      this
    );

    ProjectModel.instance.on(
      ['variantRenamed'],
      (args) => {
        if (args.variant === this.model.variant)
          this.setState({
            variant: this.model.variant
          });
      },
      this
    );
  }

  componentWillUnmount() {
    this.model.off(this);
    // May unmount after the project singleton has been cleared.
    ProjectModel.instance?.off(this);

    if (this.popout) {
      PopupLayer.instance.hidePopout(this.popout);
    }
  }

  render() {
    let content;

    if (this.state.variant === undefined || this.state.variant.name === undefined) {
      // No Look — design §3.2. 🔴 The wording is the point: "Add style variant" described an
      // action and left the current state unsaid, so a node with no Look and a node whose Look
      // had been removed read identically to one that had simply not been got to yet. "None —
      // styles are its own" is the OTHER legal state of the model, stated.
      content = (
        <div className="variants-section panel-head-row">
          <span className="panel-head-row-label">Look</span>
          <button
            type="button"
            className="panel-head-row-field"
            data-test="look-row-field"
            onClick={this.onPickVariant.bind(this)}
          >
            <span className="panel-head-row-value is-placeholder">None — styles are its own</span>
            <Icon icon={IconName.CaretDownUp} UNSAFE_className="panel-head-row-glyph" />
          </button>
        </div>
      );
    } else if (this.state.variant !== undefined && this.state.variant.name !== undefined && !this.state.editMode) {
      // Wearing a Look — design §3.1.
      content = (
        <div className="variants-section panel-head-row">
          <span className="panel-head-row-label">Look</span>
          <button
            type="button"
            className="panel-head-row-field"
            data-test="look-row-field"
            onClick={this.onPickVariant.bind(this)}
          >
            <span className="panel-head-row-value">{this.state.variant.name}</span>
            <Icon icon={IconName.CaretDownUp} UNSAFE_className="panel-head-row-glyph" />
          </button>
          <button type="button" className="panel-head-row-action" onClick={this.onEditVariant.bind(this)}>
            Edit
          </button>
        </div>
      );
    } else if (this.state.variant !== undefined && this.state.variant.name !== undefined && this.state.editMode) {
      //Edit variant
      content = (
        <div style={{ width: '100%' }}>
          <div className="variants-edit-mode-header">Edit variant</div>
          <div className="variants-section">
            <label>{this.state.variant.name}</label>
            <button
              className="variants-button teal"
              style={{ marginLeft: 'auto', width: '78px' }}
              onClick={this.onDoneEditingVariant.bind(this)}
            >
              Close
            </button>
          </div>
        </div>
      );
    }

    return (
      <div
        className="variants-editor"
        ref={(el) => {
          this.popupAnchor = el;
        }}
      >
        {content}
        {this.renderWearerLine()}
      </div>
    );
  }

  /**
   * P94 STY-003 §3.1 — `Worn by 26 buttons`.
   *
   * 🔴 **The reason this line is worth its pixels is that it is the only thing on the panel that
   * says a change here leaves this node.** Rule 1 makes the Look the single place styles are
   * decided; the consequence — that deciding here moves 26 other nodes — is invisible without it,
   * and a person who cannot see it will not trust the row.
   *
   * ⚠️ Counted on every render rather than cached: the walk is `isVariantUsed`'s, which the
   * delete-confirm modal already runs on the same surface, and a stale count here would be worse
   * than none at all. Drawn only while wearing a Look, and never as `Worn by 0` — a Look the
   * selected node wears is worn at least once, so a 0 would mean the count is wrong, and saying
   * nothing is better than saying something false.
   */
  renderWearerLine() {
    const variant = this.state.variant;
    if (!variant || variant.name === undefined || this.state.editMode) return null;

    const wearers = ProjectModel.instance?.variantWearerCounts(variant.typename)[variant.name] ?? 0;
    if (wearers < 1) return null;

    return (
      <div className="variants-wearer-line" data-test="look-wearer-count">
        {wearers === 1 ? 'Worn by this node only' : `Worn by ${wearers} nodes`}
      </div>
    );
  }

  performAddVariant(name) {
    if (ProjectModel.instance.findVariant(name, this.model.type)) {
      // Variant with name already exists for this node
      ToastLayer.showError('Variant with the name already exists');
      return;
    }

    this.model.createNewVariant(name, { undo: true });

    ToastLayer.showSuccess('Variant created');
  }

  onUpdateVariant(evt) {
    this.model.updateVariant({ undo: true });

    ToastLayer.showSuccess('Variant updated');

    evt.stopPropagation();
  }

  onEditVariant(evt) {
    this.props.onEditVariant && this.props.onEditVariant();

    this.setState({
      editMode: true
    });

    evt.stopPropagation();
  }

  onDoneEditingVariant(evt) {
    this.props.onDoneEditingVariant && this.props.onDoneEditingVariant();

    this.setState({
      editMode: false
    });

    evt.stopPropagation();
  }

  onPickVariant(evt) {
    const div = document.createElement('div');

    const variants = ProjectModel.instance.findVariantsForNodeType(this.model.type);
    const props = {
      showCreateNewVariant: variants.length === 0 || (variants.length === 1 && variants[0].name === undefined),
      model: this.model,
      hidePopout: () => {
        PopupLayer.instance.hidePopout(this.popout);
      }
    };
    this.popupRoot = createRoot(div);
    this.popupRoot.render(React.createElement(PickVariantPopup, props));

    this.popout = PopupLayer.instance.showPopout({
      content: { el: div },
      attachTo: this.popupAnchor,
      position: 'right',
      onClose: () => {
        if (this.popupRoot) {
          this.popupRoot.unmount();
          this.popupRoot = null;
        }
        this.popout = undefined;
      }
    });

    evt.stopPropagation();
  }
}
