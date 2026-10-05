import React from 'react';
import { createRoot, Root } from 'react-dom/client';

import { ProjectModel } from '@noodl-models/projectmodel';

import { encodeStringList } from '@noodl-core-ui/components/json-editor/utils/listValueCodec';

import { scriptUsesOf } from '@noodl/runtime/src/scriptfiles';

import { unmountReactRoot } from '../../../../../../../shared/utils/unmountReactRoot';
import { openScriptFile } from '../../../../documents/ScriptFileDocument';
import { promptNewScript } from '../../../ComponentsPanelNew/components/ScriptsSection';
import { ToastLayer } from '../../../../ToastLayer/ToastLayer';
import { ScriptUsesInput } from '../../components/ScriptUsesInput';
import { TypeView } from '../../TypeView';
import { getEditType } from '../../utils';

const EVENT_GROUP = 'ScriptUsesType';

/**
 * P109 ISL-005 — the Function's `uses` row (`editorType: 'script-uses'`).
 *
 * Stored exactly as `stringlist` stores a list — a comma-separated string (`encodeStringList`) — so a
 * project the editor writes reads the same in every runtime and to every tool that already splits a
 * string list. Read with the runtime's `scriptUsesOf`, which also takes the array an agent may write.
 * Redraws when the project's scripts change, so a file created, deleted or renamed elsewhere shows.
 */
export class ScriptUsesType extends TypeView {
  el: TSFixme;
  private root: Root | null = null;

  static fromPort(args) {
    const view = new ScriptUsesType();
    const p = args.port;
    view.port = p;
    view.displayName = p.displayName ? p.displayName : p.name;
    view.name = p.name;
    view.type = getEditType(p);
    view.group = p.group;
    view.parent = args.parent;
    view.value = args.parent.model.getParameter(p.name);
    return view;
  }

  render() {
    const div = document.createElement('div');
    div.style.width = '100%';
    if (!this.root) this.root = createRoot(div);
    ProjectModel.instance?.on('scriptsChanged', () => this.renderReact(), EVENT_GROUP + this.name);
    this.renderReact();
    this.el = div;
    return this.el;
  }

  private uses(): string[] {
    return scriptUsesOf(this.parent.model.getParameter(this.name));
  }

  private commit(next: string[]): void {
    const encoded = encodeStringList(next);
    if (!encoded.ok) {
      ToastLayer.showError(encoded.error);
      return;
    }
    this.parent.setParameter(this.name, encoded.value === '' ? undefined : encoded.value);
    this.parent.notifyListeners('panelResized');
    this.renderReact();
  }

  private renderReact() {
    if (!this.root) return;
    const uses = this.uses();
    this.root.render(
      React.createElement(ScriptUsesInput, {
        uses,
        available: ProjectModel.instance?.getScriptPaths() ?? [],
        onAdd: (path: string) => this.commit([...uses.filter((u) => u !== path), path]),
        onRemove: (path: string) => this.commit(uses.filter((u) => u !== path)),
        onOpen: (path: string) => openScriptFile(path),
        onNew: () => promptNewScript()
      })
    );
  }

  /** Re-read the model — the parameter can change under us (undo, variants). */
  resetToDefault() {
    this.renderReact();
  }

  dispose() {
    ProjectModel.instance?.off(EVENT_GROUP + this.name);
    if (this.root) {
      unmountReactRoot(this.root);
      this.root = null;
    }
    super.dispose();
  }
}
