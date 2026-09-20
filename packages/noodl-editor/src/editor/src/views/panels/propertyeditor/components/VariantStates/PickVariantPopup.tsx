/**
 * P94 STY-003 AC6 — the Look menu (design §4).
 *
 * Three sections, in this order: the Looks this project already has, then the NodeGX library with
 * its "adds it to your project" sentence, then **"Save this button's styles as a new Look…"**.
 *
 * 🔴 **That last row is the behaviour change that matters, and it is not new behaviour — it is a
 * new name and a new place.** `NodeGraphNode.createNewVariant` has always done exactly this: copy
 * the node's parameters onto a named Look and put the node in it. It was labelled *"Create new
 * variant"* at the TOP of this popup, which asks a person to already know what a variant is before
 * they can want one. *"Save what I've already got"* is what they are actually doing at that moment,
 * and STY-001's scan is the measurement of how well the old framing worked: **4 Looks across 90
 * projects, every one a test artefact.**
 *
 * 🔴 **Rule 4 — shipped and homemade behave identically — is enforced by COPYING, not by
 * referencing.** Picking a library Look builds a `VariantModel` the project owns outright and
 * never aliases `ElementConfigRegistry`'s data (`shippedLook` deep-copies for exactly this
 * reason), so editing your copy cannot reach back into the library and a library update cannot
 * reach forward into your project. After the copy there is no difference between the two, which is
 * why {@link buildLookMenu} refuses to offer a shipped Look whose name the project already holds:
 * two rows for one thing would be the two-systems problem this phase exists to remove.
 */
import React from 'react';

import { buildLookMenu, shouldOpenInCreateMode, type LookMenu, type LookMenuEntry } from '@noodl-models/Looks/fieldState';
import { shippedLooksFor, type ShippedLook } from '@noodl-models/Looks/looks';
import { ElementConfigRegistry } from '@noodl-models/ElementConfigs';
import { ProjectModel } from '@noodl-models/projectmodel';
import { UndoActionGroup, UndoQueue } from '@noodl-models/undo-queue-model';
import { VariantModel } from '@noodl-models/VariantModel';

import { Icon, IconName, IconSize } from '@noodl-core-ui/components/common/Icon';

import { ToastLayer } from '../../../../ToastLayer/ToastLayer';
import { PickVariantItem } from './PickVariantItem';

export interface PickVariantPopupProps {
  model: TSFixme;
  showCreateNewVariant: TSFixme;

  hidePopout: () => void;
}

type State = {
  variants: TSFixme;
  /** The "save this node's styles" row has been pressed and is waiting for a name. */
  showCreateNewVariant: TSFixme;
};

export class PickVariantPopup extends React.Component<PickVariantPopupProps, State> {
  model: PickVariantPopupProps['model'];
  newVariantName: string;

  constructor(props: PickVariantPopupProps) {
    super(props);

    this.model = props.model;

    // 🔴 **The caller's shortcut predates the shipped library, and the library made it wrong.**
    // `variantseditor.onPickVariant` passes `showCreateNewVariant: true` whenever the PROJECT holds
    // no Look for this node type — which was right when a project's own Looks were the only thing
    // this menu could offer: there was nothing to pick, so it asked for a name instead.
    //
    // A project with no Looks of its own now still has **twelve shipped ones** to pick from, and
    // every project has no Looks of its own until someone makes one. So the shortcut fired on
    // exactly the projects the library exists for, and `START FROM A NODEGX LOOK` was unreachable
    // from the property panel until a person had already hand-made a Look — the one thing the
    // library is meant to save them from. Found by STY-007's drive on a copy of `Todo list`, the
    // project STY-001 took the before-pictures on. Same shape as
    // [[a-whitelist-gate-is-blind-to-a-later-node-class]]: a condition that stayed still while the
    // set it was deciding about grew.
    //
    // Take the shortcut only when the menu would genuinely have nothing to offer. `menu()` reads
    // `this.model` and the project singleton, both of which are ready here, and it is the SAME
    // computation `render` draws from — so this cannot drift from what the list would have shown.
    // The rule itself lives in `fieldState` beside the menu it is about, where a spec can reach it.
    this.state = {
      variants: ProjectModel.instance.findVariantsForNodeType(this.model.type),
      showCreateNewVariant: shouldOpenInCreateMode(this.menu(), !!props.showCreateNewVariant)
    };
  }

  componentDidMount() {
    ProjectModel.instance.on(
      ['variantDeleted', 'variantCreated', 'variantRenamed', 'variantAdded'],
      () => {
        this.setState({
          variants: ProjectModel.instance.findVariantsForNodeType(this.model.type)
        });
      },
      this
    );
  }

  componentWillUnmount() {
    // May unmount after the project singleton has been cleared.
    ProjectModel.instance?.off(this);
  }

  // ── What the menu is made of ──────────────────────────────────────────────

  /** The node type, spelled the one way everything here spells it. */
  private typename(): string {
    return this.model.type.localName;
  }

  /**
   * The shipped library for this node type.
   *
   * ⚠️ **Keyed by the type's own name and empty for anything not in the library** — four node
   * types have configs (Button, Text, TextInput, Checkbox), and every other node simply has no
   * library section rather than an empty heading.
   *
   * The node's **own** `visualStates` are passed through, because the library and the runtime do
   * not spell states the same way and a `Text` has only two of them. `shippedLook` translates and
   * reports what cannot land rather than writing names nothing reads.
   */
  private shippedLooks(): ShippedLook[] {
    const config = ElementConfigRegistry.get(this.typename());
    if (!config) return [];

    const knownStates = (this.model.type.visualStates || []).map((state: TSFixme) => state.name);
    return shippedLooksFor(config, knownStates.length ? knownStates : undefined);
  }

  private menu(): LookMenu {
    const typename = this.typename();

    return buildLookMenu({
      projectLooks: ProjectModel.instance.getAllVariants().filter((v) => v.name !== undefined),
      shippedLooks: this.shippedLooks().map((look) => ({ name: look.name, shippedFrom: look.shippedFrom })),
      typename,
      currentLookName: this.model.variant && this.model.variant.name,
      // One walk for every row's count — see `ProjectModel.variantWearerCounts`.
      wearerCounts: ProjectModel.instance.variantWearerCounts(typename),
      typeLabel: (this.model.type.displayName || this.model.type.localName || 'node').toLowerCase()
    });
  }

  // ── Picking ───────────────────────────────────────────────────────────────

  onPickVariant(variant) {
    this.model.setVariant(variant, { undo: true });
    this.props.hidePopout();
  }

  /**
   * Take a copy of a shipped Look into the project, and wear it (design §4, rule 4).
   *
   * 🔴 **One undo group for both halves.** Adding the Look and wearing it are one act as far as
   * the person is concerned; two entries would make Ctrl+Z leave a Look in the project that
   * nothing wears and no row explains.
   */
  onPickShippedLook(shipped: ShippedLook) {
    const project = ProjectModel.instance;

    // Re-checked at the moment of the press, not just when the menu was built: a peer surface
    // (or an undo) can add the name between the two.
    if (project.findVariant(shipped.name, this.model.type)) {
      ToastLayer.showError(`This project already has a Look called ${shipped.name}`);
      return;
    }

    const variant = new VariantModel({ name: shipped.name, typename: shipped.typename });
    // The Look owns its own data outright. `shippedLook` already deep-copied out of the registry;
    // this keeps the copy, rather than handing the same object to two owners.
    variant.parameters = JSON.parse(JSON.stringify(shipped.parameters));
    variant.stateParameters = JSON.parse(JSON.stringify(shipped.stateParameters));

    const undo = new UndoActionGroup({ label: 'use a NodeGX Look' });
    project.addVariant(variant, { undo });
    this.model.setVariant(variant, { undo });
    UndoQueue.instance.push(undo);

    // Reported, never silent: the library declares state styles the runtime has no state for, and
    // a person who picked a Look with a `placeholder` block should not discover later that it was
    // dropped without a word.
    if (shipped.uncarriedStates.length) {
      // `showInfo`, NOT `showActivity`: an activity toast is a sticky spinner that waits to be
      // dismissed by id, and this is a one-off report with nothing in flight behind it.
      ToastLayer.showInfo(
        `${shipped.name} added. ${shipped.uncarriedStates.join(', ')} could not be carried — this node has no such state.`
      );
    }

    this.props.hidePopout();
  }

  onRemoveLook() {
    // `findVariant(undefined, type)` is how the model spells "the no-variant one".
    this.onPickVariant(ProjectModel.instance.findVariant(undefined, this.model.type));
  }

  // ── The project's own Looks: rename, delete ───────────────────────────────

  onDeleteVariant(variant) {
    if (ProjectModel.instance.isVariantUsed(variant)) {
      ToastLayer.showError('Cannot delete a Look that is in use');
      return;
    }

    ProjectModel.instance.deleteVariant(variant, { undo: true });
  }

  onRenameVariant(variant, name) {
    if (name === undefined || name.length === 0) {
      ToastLayer.showError('Must provide a name for the Look');
      return;
    }

    if (ProjectModel.instance.findVariant(name, this.model.type)) {
      ToastLayer.showError('A Look with that name already exists');
      return;
    }

    ProjectModel.instance.renameVariant(variant, name, { undo: true });

    ToastLayer.showSuccess('Look renamed');
  }

  // ── "Save this node's styles as a new Look…" ──────────────────────────────

  performAddVariant(name) {
    if (name === undefined || name.length === 0) {
      ToastLayer.showError('Must provide a name for the Look');
      return;
    }

    if (ProjectModel.instance.findVariant(name, this.model.type)) {
      ToastLayer.showError('A Look with that name already exists');
      return;
    }

    // Copies this node's parameters onto the new Look and puts the node in it, in one step.
    this.model.createNewVariant(name, { undo: true });

    ToastLayer.showSuccess('Look created from this node');

    this.props.hidePopout();
  }

  onKeyUp(e) {
    if (e.key === 'Enter') {
      this.performAddVariant(e.target.value);
    }
  }

  // ── Drawing ───────────────────────────────────────────────────────────────

  private renderNameInput(saveLabel: string) {
    // The autoFocus note from the original stands: this tree is mounted on a non-React host, so
    // the input exists before the component is in the DOM and `autoFocus` alone does not take.
    return (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', position: 'relative' }}>
        <div className="variants-header">
          <span>{saveLabel}</span>
        </div>
        <div className="variants-input-container">
          <input
            className="variants-input"
            data-test="look-name-input"
            ref={(ref) => {
              if (ref) setTimeout(() => ref.focus(), 10);
            }}
            autoFocus
            onKeyUp={this.onKeyUp.bind(this)}
            onChange={(e) => (this.newVariantName = e.target.value)}
          />
          <button className="variants-button primary" onClick={() => this.performAddVariant(this.newVariantName)}>
            Create
          </button>
        </div>
      </div>
    );
  }

  private renderProjectSection(entries: LookMenuEntry[]) {
    if (!entries.length) return null;

    return (
      <>
        <div className="variants-section-heading" data-test="look-menu-project">
          In this project
        </div>
        {entries.map((entry) => {
          const variant = this.state.variants.find((v) => v.name === entry.name);
          if (!variant) return null;

          return (
            <PickVariantItem
              key={variant.typename + variant.name}
              variant={variant}
              wearers={entry.wearers}
              isCurrent={entry.current}
              onRenameVariant={this.onRenameVariant.bind(this, variant)}
              onDeleteVariant={this.onDeleteVariant.bind(this, variant)}
              onPickVariant={this.onPickVariant.bind(this, variant)}
            />
          );
        })}
      </>
    );
  }

  private renderLibrarySection(entries: LookMenuEntry[]) {
    if (!entries.length) return null;

    const shipped = this.shippedLooks();

    return (
      <>
        <div className="variants-section-heading" data-test="look-menu-library">
          Start from a NodeGX Look
        </div>
        {entries.map((entry) => {
          const look = shipped.find((s) => s.shippedFrom === entry.shippedFrom);
          if (!look) return null;

          return (
            <div
              key={`shipped:${entry.shippedFrom}`}
              className="variants-pick-variant-item"
              data-test={`look-menu-shipped-${entry.shippedFrom}`}
              onClick={(e) => {
                this.onPickShippedLook(look);
                e.stopPropagation();
              }}
            >
              <div className="variant-item-name">{entry.name}</div>
            </div>
          );
        })}
        {/* 🔴 Said out loud, because "it won't change under you later" is the whole of rule 4 and
            is the opposite of what a person expects a shipped thing to do. */}
        <div className="variants-section-note">
          Picking one adds it to your project so you can edit it. It won&rsquo;t change under you later.
        </div>
      </>
    );
  }

  render() {
    const menu = this.menu();

    if (this.state.showCreateNewVariant) {
      return (
        <div style={{ width: '250px', display: 'flex', flexDirection: 'column' }}>
          {this.renderNameInput(menu.saveAsNewLabel)}
        </div>
      );
    }

    return (
      <div style={{ width: '250px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ overflowY: 'auto' }}>
          {!menu.none && (
            <div
              className="variants-pick-variant-item"
              data-test="look-menu-none"
              onClick={(e) => {
                this.onRemoveLook();
                e.stopPropagation();
              }}
            >
              <div className="variants-add-icon" style={{ marginLeft: '10px', opacity: 1 }}>
                <Icon icon={IconName.Close} size={IconSize.Small} />
              </div>
              <div className="variant-item-name" style={{ paddingLeft: '0px' }}>
                None — styles are its own
              </div>
            </div>
          )}

          {this.renderProjectSection(menu.inThisProject)}
          {this.renderLibrarySection(menu.fromLibrary)}
        </div>

        {/* Design §4 puts this LAST, under a rule. It is the row a person wants when they have
            already styled the thing in front of them, which is the moment they are in. */}
        <div
          className="variants-header variants-add-header"
          data-test="look-menu-save-as-new"
          onClick={() => this.setState({ showCreateNewVariant: true })}
        >
          <div>{menu.saveAsNewLabel}</div>
          <Icon icon={IconName.Plus} size={IconSize.Small} UNSAFE_className="add-button" />
        </div>
      </div>
    );
  }
}
