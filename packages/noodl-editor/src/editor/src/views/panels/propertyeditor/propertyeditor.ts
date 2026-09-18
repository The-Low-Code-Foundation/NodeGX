import { NodeGraphContextTmp } from '@noodl-contexts/NodeGraphContext/NodeGraphContext';
import _ from 'underscore';
import React from 'react';
import { createRoot, Root } from 'react-dom/client';

import { NodeGraphNode } from '@noodl-models/nodegraphmodel';
import { UndoQueue, UndoActionGroup } from '@noodl-models/undo-queue-model';

import View from '../../../../../shared/ListenableView';
import { ProjectModel } from '../../../models/projectmodel';
import { ToastLayer } from '../../ToastLayer/ToastLayer';
import { StyleSuggestionHost } from './components/StyleSuggestionHost';
import { VariantsEditor } from './components/VariantStates';
import { VisualStates } from './components/VisualStates';
import { Ports } from './DataTypes/Ports';
import { ModelProxy } from './models/modelProxy';

// Styles
require('../../../styles/propertyeditor/propertyeditor.css');

export class PropertyEditor extends View {
  parent: TSFixme;
  model: TSFixme;
  modelProxy: ModelProxy;
  allowAsRoot: TSFixme;
  portsView: TSFixme;
  renderPortsViewScheduled: TSFixme;
  el: HTMLElement;
  /** The scrolling body — carries the variant edit-mode class. */
  private bodyEl: HTMLElement;
  private variantsEl: HTMLElement;
  private styleSuggestionEl: HTMLElement;
  private visualStatesEl: HTMLElement;
  private groupsEl: HTMLElement;
  variantsRoot: Root | null = null;
  visualStatesRoot: Root | null = null;
  /** React root for the StyleAnalyzer's suggestion banner. */
  styleSuggestionRoot: Root | null = null;

  constructor(args) {
    super();

    this.parent = args.parent;
    this.model = args.model;

    this.modelProxy = new ModelProxy({ model: this.model });

    //this.isRoot = ProjectModel.instance.getRootNode() === this.model;
    this.allowAsRoot = this.model.type.allowAsExportRoot;
  }

  dispose() {
    this.portsView.dispose();
  }
  scheduleRenderPortsView() {
    if (this.renderPortsViewScheduled) return;

    const _this = this;
    this.renderPortsViewScheduled = true;
    setTimeout(function () {
      _this.renderPortsViewScheduled = false;
      _this.renderPortsView();
    }, 0);
  }
  renderPortsView() {
    this.portsView.render();
    if (this.portsView.el.parentElement !== this.groupsEl) {
      this.groupsEl.replaceChildren(this.portsView.el);
    }
  }
  renderVariantsEditor() {
    if (this.model.type.useVariants) {
      const props = {
        model: this.model,
        onEditVariant: () => {
          this.modelProxy.setEditMode('variant');
          this.scheduleRenderPortsView();

          this.bodyEl.classList.add('variants-sidepanel-edit-mode');
        },
        onDoneEditingVariant: () => {
          this.modelProxy.setEditMode('node');
          this.scheduleRenderPortsView();
          this.bodyEl.classList.remove('variants-sidepanel-edit-mode');
        }
      };
      if (!this.variantsRoot) {
        this.variantsRoot = createRoot(this.variantsEl);
      }
      this.variantsRoot.render(React.createElement(VariantsEditor, props));
    }
  }
  renderVisualStates() {
    if (this.model.type.visualStates !== undefined) {
      const props = {
        model: this.modelProxy,
        onVisualStateChanged: this.onVisualStateChanged.bind(this),
        portsView: this.portsView
      };
      if (!this.visualStatesRoot) {
        this.visualStatesRoot = createRoot(this.visualStatesEl);
      }
      this.visualStatesRoot.render(React.createElement(VisualStates, props));
    }
  }
  onVisualStateChanged(state) {
    this.modelProxy.setVisualState(state.name);

    // Interaction state changed, schedule
    this.scheduleRenderPortsView();
  }

  /**
   * P94 STY-002 AC5 — the StyleAnalyzer's suggestion banner, and nothing else.
   *
   * 🔴 **This used to be the `Preset` / `Size` picker, and that was the second mechanism that set
   * a node's styles.** `STY-DESIGN-THE-LOOK-MODEL.md` rule 1 — *"one row decides it"* — is a
   * statement about there being no second one, so the picker is gone rather than restyled: with it
   * went `onElementVariantChange` / `onElementSizeChange`, the only two writers of the
   * `_variant` / `_size` parameters anywhere in the product (counted this session).
   *
   * ⚠️ **The banner is why this host survives at all.** `ElementStyleSectionHost` was the sole
   * mount point of `SuggestionBanner` in the editor, so deleting the file outright would have
   * taken a live feature out with the presets and nothing would have said so. The suggestions are
   * about tokens, not presets, and are untouched.
   */
  renderStyleSuggestions() {
    if (!this.styleSuggestionEl) return;

    if (!this.styleSuggestionRoot) {
      this.styleSuggestionRoot = createRoot(this.styleSuggestionEl);
    }
    this.styleSuggestionRoot.render(React.createElement(StyleSuggestionHost));
  }

  /** Build the panel shell (legacy `propertyeditor.html`). */
  private buildShell() {
    const root = document.createElement('div');
    // FB-017 AC6: `property-editor-shell` is the modifier that lets this one shell
    // opt out of `.sidebar-panel`'s `overflow: hidden`. That declaration makes the
    // element a scroll container, and a scroll container that never overflows still
    // captures every `position: sticky` beneath it and pins it to a scrollport that
    // cannot move — which is why the filter header measured -16px at scrollTop 400.
    // Scoped rather than removed from `.sidebar-panel` because `componentports.ts`
    // wears the same class and is not part of this measurement.
    root.className = 'sidebar-panel property-editor-shell';

    this.bodyEl = document.createElement('div');
    this.bodyEl.className = 'sidebar-property-editor';
    root.appendChild(this.bodyEl);

    const section = (className: string) => {
      const el = document.createElement('div');
      el.className = className;
      this.bodyEl.appendChild(el);
      return el;
    };

    this.variantsEl = section('variants');
    this.styleSuggestionEl = section('style-suggestion-section');
    this.visualStatesEl = section('visual-states');
    this.groupsEl = section('groups');

    return root;
  }

  render() {
    if (!this.el) {
      this.el = this.buildShell();
    }

    this.portsView = new Ports({
      model: this.modelProxy
    });
    this.renderPortsView();

    this.renderVariantsEditor();

    this.renderVisualStates();

    // STY-002 AC5: no undo/redo subscription here any more. It existed to bring the preset
    // picker back into line with parameters an undo had restored; the banner reads the project's
    // tokens, not this node's parameters, and re-rendering it on every undo said nothing.
    this.renderStyleSuggestions();

    this.parent && this.parent.append(this.el);

    return this.el;
  }

  performDelete() {
    if (!this.model.canBeDeleted()) {
      ToastLayer.showError('This node cannot be deleted');
      return;
    }

    const graph = this.model.owner;
    const undo = new UndoActionGroup({ label: 'delete node' });
    graph.removeNode(this.model, { undo: undo });
    UndoQueue.instance.push(undo);
  }

  _tryPropertyPanelInputInteraction(inputIdentifier: string) {
    const input = document.querySelector(
      `div[data-panel-id="PropertyEditor"] [data-identifier="${inputIdentifier}"]`
    ) as HTMLInputElement | HTMLTextAreaElement | HTMLButtonElement;

    if (input) {
      setTimeout(() => {
        switch (input?.nodeName) {
          case 'BUTTON': {
            input.click();

            // if the button click opens a code editor we want to focus that
            const codeEditor = (document.querySelector('.cm-editor .cm-content') as HTMLElement) || undefined;

            if (codeEditor) {
              codeEditor.focus();
            }
            break;
          }

          case 'INPUT': {
            if (input.dataset.type === 'color') {
              input.click();
            } else {
              input.focus();
            }
            break;
          }

          default: {
            input.focus();
          }
        }

        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 1);
    }
  }

  doubleClick(node: NodeGraphNode) {
    if (node.metadata?.AiAssistant) {
      const aiButton = document.querySelector<HTMLButtonElement>('button[data-test="ai-code-editor"]');
      if (aiButton) {
        setTimeout(() => {
          aiButton.click();
          document.querySelector<HTMLElement>('.cm-editor .cm-content')?.focus();
        }, 1);
      }
    } else if (node.type.name === 'CloudFunction2') {
      const functionName = '/#__cloud__/' + node.parameters.function;
      const component = ProjectModel.instance.getComponentWithName(functionName);
      if (component) {
        NodeGraphContextTmp.switchToComponent(component, { pushHistory: true });
      } else {
        ToastLayer.showError('Could not find Cloud Function in project.');
      }
    } else if (node.type.nodeDoubleClickAction) {
      if (Array.isArray(node.type.nodeDoubleClickAction)) {
        node.type.nodeDoubleClickAction.forEach((action) => {
          this._tryPropertyPanelInputInteraction(action.focusPort);
        });
      } else {
        this._tryPropertyPanelInputInteraction(node.type.nodeDoubleClickAction.focusPort);
      }
    }
  }

  /*PropertyEditor.prototype.onMakeRootClicked = function (scope, el, evt) {
    if (ProjectModel.instance.getRootNode() === this.model) {
      ProjectModel.instance.setRootNode(undefined);
      this.isRoot = false;
    }
    else {
      ProjectModel.instance.setRootNode(this.model);
      this.isRoot = true;
    }
  }*/
}
