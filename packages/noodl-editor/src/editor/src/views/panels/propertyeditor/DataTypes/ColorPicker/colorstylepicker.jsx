import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';

import { ProjectModel } from '@noodl-models/projectmodel';
import { colourTokensForPicking, tokenReferenceStrings } from '@noodl-models/StyleTokensModel/ColourTokensForPicking';
import { StyleTokensModel } from '@noodl-models/StyleTokensModel/StyleTokensModel';
import { StylesModel } from '@noodl-models/StylesModel';

import { Icon, IconName, IconSize } from '@noodl-core-ui/components/common/Icon';
import { IconButtonVariant, IconButton } from '@noodl-core-ui/components/inputs/IconButton';

import { escapeHtml } from '../../../../../utils/escapeHtml';
import PopupLayer from '../../../../popuplayer';
import utils from '../../../../TextStylePicker/utils';
import { ToastLayer } from '../../../../ToastLayer/ToastLayer';
import ColorPicker from './colorpicker';

require('../../../../../styles/propertyeditor/variantseditor.css');

/**
 * What a swatch should actually paint.
 *
 * 🔴 **A swatch handed a raw `var(--token)` paints NOTHING.** Those tokens are the *project's*
 * design tokens; the editor's own chrome never declares them, so `background-color: var(--primary)`
 * is an invalid declaration in this DOM, the element paints transparent, and the checkerboard
 * behind it shows through. Measured 2026-09-19 (P94 STY-007) in the running editor: **17 of the 20
 * rows** under `Colors in project` computed to `rgba(0, 0, 0, 0)` while
 * `ProjectModel.resolveColor` had the true colour for every one of them — `var(--primary)` is
 * `#2f5bc8`, `var(--destructive)` is `#b3261e`. Richard, seeing the shot: *"Why do all the colour
 * squares next to the list of 'Colors in project' look transparent??"* — because they were.
 *
 * ⚠️ **`transparent` must survive.** It is a real, pickable value and its checkerboard is correct;
 * only an UNRESOLVABLE token should ever read as nothing. `resolveColor` returns its input
 * unchanged when it cannot resolve it, so the fallback is exactly the old behaviour and no row can
 * be made worse by this.
 */
function swatchColor(value) {
  if (!value) return value;
  try {
    return ProjectModel.instance.resolveColor(value);
  } catch {
    return value;
  }
}

/**
 * The colours this project has *typed in somewhere*, as opposed to the ones it has *defined*.
 *
 * 🔴 **This is an echo, not an enumeration, and HLT-006 exists because the two were confused.**
 * It walks every node's `type === 'color'` ports and collects the values it finds. On a project
 * authored against design tokens those values are `var(--primary)` strings — which is how P94's
 * STY-007 came to be fixing `var(--…)` swatches "in the colour picker" while this task's §2 was
 * simultaneously right that no picker *enumerates* tokens. Both were true of different lists.
 *
 * Measured on `Puppy test 3` (2026-09-21): 13 of the project's 91 colour tokens reached this list,
 * and they reached it only because a node already wore them. The other 78 were unpickable, so the
 * only way to first use a token was to type `var(--name)` by hand — a list that can only offer what
 * someone already entered cannot bootstrap ([[a-derivation-fed-by-its-own-gate-cannot-bootstrap]]).
 *
 * `knownTokenRefs` removes the overlap: a token now has a row of its own in the section below, and
 * showing it a second time here — under a heading that means "loose values in use" — would be a
 * duplicate this fix created rather than one it found.
 */
function getProjectColors(colorStyles, knownTokenRefs) {
  const colorsNames = new Set();

  const components = ProjectModel.instance.getComponents();
  components.forEach((c) => {
    c.graph.forEachNode((node) => {
      const colorPorts = node.getPorts('input').filter((p) => p.type === 'color');
      const values = colorPorts.map((port) => node.getParameter(port.name));
      values
        .filter((name) => name)
        .forEach((name) => {
          colorsNames.add(name);
        });
    });
  });

  let colors = Array.from(colorsNames);
  colors = colors.filter((c) => !colorStyles.find((s) => s.name === c)); //remove all color styles from the list, so we only get the #HEX colors
  colors = colors.filter((c) => !knownTokenRefs.has(c)); // tokens have their own section now — HLT-006
  colors.sort();
  return colors;
}

function ColorStylePicker(props) {
  const [stylesModel, setStylesModel] = useState(null);

  const [colorStyles, setColorsStyles] = useState([]);
  const [projectColors, setProjectColors] = useState([]);
  const [colourTokens, setColourTokens] = useState({ semantic: [], palette: [] });
  const [tokensModel, setTokensModel] = useState(null);

  const [styleToEdit, setStyleToEdit] = useState(null);
  const [popupAnchor, setPopupAnchor] = useState(null);

  //the color style picker is rendered in a popup/poput, and that system uses the height of the content to decide how big
  //the popup should be. And it needs that information directly on render.
  //this means we need to get all styles etc synchronously with the first render, which useLayoutEffect solves
  useLayoutEffect(() => {
    const stylesModel = new StylesModel();
    setStylesModel(stylesModel);

    // HLT-006 — its own instance, for the same reason `StyleSuggestionHost` and `BenchInputsRail`
    // keep one: this picker is rendered into a popout via `createRoot`, OUTSIDE the
    // `ProjectDesignTokenContext` provider that wraps `EditorPage`, so there is no context to read.
    // Multiple instances stay in step through `ProjectModel.metadataChanged`.
    const tokensModel = new StyleTokensModel();
    setTokensModel(tokensModel);

    const tokens = colourTokensForPicking(tokensModel.getTokens());
    setColourTokens(tokens);

    const styles = stylesModel.getStyles('colors');
    setColorsStyles(styles);
    setProjectColors(getProjectColors(styles, tokenReferenceStrings(tokensModel.getTokens())));

    stylesModel.on('stylesChanged', (args) => {
      if (args.type === 'colors') {
        const styles = stylesModel.getStyles('colors');
        setColorsStyles(styles);
      }
    });

    tokensModel.on('tokensChanged', () => {
      setColourTokens(colourTokensForPicking(tokensModel.getTokens()));
    });

    return () => {
      stylesModel.dispose();
      tokensModel.dispose();
    };
  }, []);

  let filteredStyles = colorStyles;
  let filteredProjectColors = projectColors;

  const filterString = props.filter ? props.filter.toLowerCase() : undefined;

  let filteredSemantic = colourTokens.semantic;
  let filteredPalette = colourTokens.palette;

  if (filterString) {
    filteredStyles = colorStyles.filter((style) => style.name.toLowerCase().includes(filterString));
    filteredProjectColors = projectColors.filter((color) => color.toLowerCase().includes(filterString));

    // A token matches on its name OR its description — "Main brand and action color" is how someone
    // who has not memorised `--primary` finds it, and the description is already carried on the record.
    const matchesToken = (token) =>
      token.name.toLowerCase().includes(filterString) ||
      (token.description || '').toLowerCase().includes(filterString);

    filteredSemantic = colourTokens.semantic.filter(matchesToken);
    filteredPalette = colourTokens.palette.filter(matchesToken);
  }

  const onItemSelected = (name) => props.onItemSelected(name);

  const onDelete = (name) => {
    const { nodeCount, variantCount } = utils.getStyleUsage('color', name);

    if (nodeCount > 0 || variantCount > 0) {
      // The style name is user- and AI-authorable and this string is rendered
      // through `dangerouslySetInnerHTML` by ConfirmModal — escape it (FIX-003).
      let message = `Are you sure you want to delete <strong>${escapeHtml(name)}</strong>?<br>This color style is used by `;
      if (nodeCount) {
        message += `${nodeCount} ${nodeCount === 1 ? 'node' : 'nodes'}`;
      }
      if (variantCount) {
        if (nodeCount) {
          message += ' and ';
        }

        message += `${variantCount} ${variantCount === 1 ? 'variant' : 'variants'}`;
      }

      PopupLayer.instance.showConfirmModal({
        title: 'CONFIRM DELETE COLOR STYLE',
        message: message,
        confirmLabel: 'Yes, delete',
        onConfirm: () => {
          stylesModel.deleteStyle('colors', name, { undo: true, label: 'delete color style' });
        }
      });
    } else {
      stylesModel.deleteStyle('colors', name, { undo: true, label: 'delete color style' });
    }
  };

  const onChangeName = (name, newName) => {
    stylesModel.changeStyleName('colors', name, newName, {
      undo: true,
      label: 'change color style name'
    });
  };

  const onEditValue = (style, popupAnchor) => {
    setStyleToEdit(style);
    setPopupAnchor(popupAnchor);
  };

  useEffect(() => {
    if (!styleToEdit) return;

    const colorPicker = new ColorPicker();
    colorPicker.render();

    colorPicker.setColor(styleToEdit.style);

    colorPicker.setColorChangedListener((color, commitChange) => {
      if (commitChange) {
        stylesModel.setStyle('colors', styleToEdit.name, color, { undo: true, label: 'change color style' });
      }
    });

    const popout = PopupLayer.instance.showPopout({
      content: colorPicker,
      attachTo: popupAnchor,
      position: 'right',
      onClose: () => colorPicker.dispose()
    });

    return () => {
      PopupLayer.instance.hidePopout(popout);
    };
  }, [styleToEdit, popupAnchor]);

  return (
    <div
      style={{
        width: '230px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <div style={{ overflow: 'hidden auto', flexGrow: 1, maxHeight: '600px' }}>
        <CreateNewStyle color={props.inputValue} stylesModel={stylesModel} onColorStyleCreated={onItemSelected} />

        {filteredStyles.map((style) => (
          <ColorStyleItem
            key={style.name}
            style={style}
            onSelect={onItemSelected}
            onChangeName={onChangeName}
            onEditValue={onEditValue}
            onDelete={onDelete}
            onEditingName={() => setStyleToEdit(null)}
            currentSelectedColor={props.inputValue}
          />
        ))}

        <DesignTokensList
          semantic={filteredSemantic}
          palette={filteredPalette}
          paletteTotal={colourTokens.palette.length}
          isFiltering={Boolean(filterString)}
          tokensModel={tokensModel}
          onSelect={onItemSelected}
          currentSelectedColor={props.inputValue}
        />

        <ProjectColorsList
          colors={filteredProjectColors}
          onSelect={onItemSelected}
          currentSelectedColor={props.inputValue}
        />
      </div>
    </div>
  );
}

/**
 * HLT-006 — the project's design tokens, offered for picking.
 *
 * 🔴 **Two lists, because 91 rows in one is the defect not the feature.** Measured on
 * `Puppy test 3`: 25 semantic tokens (`--primary`, `--muted`, `--border`…), 16 of them the
 * project's own overrides, plus a shipped 61-swatch ramp the project references not once.
 * Richard: *"I don't want hundreds of lines in a colour picker just because some font somewhere
 * has a random colour."* So the semantic set is open — that IS the app's palette — and the ramp
 * sits behind a closed row that states its count, which is the same shape P94 landed on in
 * `ColoursSection` after 88 open rows buried the styles above them.
 *
 * ⚠️ **Filtering opens the ramp.** A closed disclosure that hides matches is a search box that
 * lies; typing `blue` has to reach `--blue-500` or the ramp may as well not be there.
 */
function DesignTokensList(props) {
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

  const showPalette = props.isFiltering ? props.palette.length > 0 : isPaletteOpen;

  if (props.semantic.length === 0 && props.palette.length === 0) {
    return null;
  }

  return (
    <>
      {props.semantic.length > 0 && (
        <>
          <div className="variants-header">
            <span>Design tokens</span>
          </div>

          {props.semantic.map((token) => (
            <TokenItem
              key={token.name}
              token={token}
              tokensModel={props.tokensModel}
              onSelect={props.onSelect}
              currentSelectedColor={props.currentSelectedColor}
            />
          ))}
        </>
      )}

      {props.paletteTotal > 0 && (
        <>
          <div
            className="variants-header is-toggle"
            onClick={() => setIsPaletteOpen((open) => !open)}
            data-test="palette-disclosure"
          >
            <Icon
              icon={showPalette ? IconName.CaretDown : IconName.CaretRight}
              size={IconSize.Small}
              UNSAFE_style={{ marginRight: 4 }}
            />
            <span>Palette</span>
            <span className="variants-header-count">
              {props.isFiltering ? `${props.palette.length} of ${props.paletteTotal}` : props.paletteTotal}
            </span>
          </div>

          {showPalette &&
            props.palette.map((token) => (
              <TokenItem
                key={token.name}
                token={token}
                tokensModel={props.tokensModel}
                onSelect={props.onSelect}
                currentSelectedColor={props.currentSelectedColor}
              />
            ))}
        </>
      )}
    </>
  );
}

/**
 * One token row.
 *
 * 🔴 **What it SETS is `var(--name)`, never the resolved hex.** That is the whole point of picking
 * a token: the parameter keeps the reference, so changing `--primary` in the Styles panel moves
 * every node that picked it. `ColorType.openStylePicker` passes `onItemSelected`'s argument
 * straight to `setParameter`, so the string handed over here is the string stored.
 *
 * What it SHOWS beside the name is the resolved value, because Richard's ask was the other
 * direction: *"when I see --var(someColour) I can go find out what that colour is"*.
 */
function TokenItem(props) {
  const ref = useRef();
  const reference = `var(${props.token.name})`;

  const resolved = props.tokensModel ? props.tokensModel.resolveToken(props.token.name) : undefined;
  const displayValue = resolved || props.token.value;

  useScrollToIfSelected(ref, reference, props.currentSelectedColor);

  return (
    <div
      className="variants-pick-variant-item"
      onClick={(e) => {
        props.onSelect(reference);
        e.stopPropagation();
      }}
      ref={ref}
      title={props.token.description ? `${props.token.description} — ${displayValue}` : displayValue}
      style={{ backgroundColor: props.currentSelectedColor === reference ? 'var(--hover-bg-color)' : null }}
    >
      <div className="variant-item-name">{props.token.name}</div>
      <div className="token-item-value">{displayValue}</div>
      <div className="color-thumbnail">
        <div className="color-thumbnail-content" style={{ backgroundColor: swatchColor(reference) }} />
      </div>
    </div>
  );
}

function ProjectColorsList(props) {
  if (props.colors.length === 0) {
    return null;
  }

  return (
    <>
      <div className="variants-header">
        <span>Colors in project</span>
      </div>

      {props.colors.map((color) => (
        <ColorItem
          key={color}
          color={color}
          onSelect={props.onSelect}
          currentSelectedColor={props.currentSelectedColor}
        />
      ))}
    </>
  );
}

function useScrollToIfSelected(ref, colorName, selectedColorName) {
  useEffect(() => {
    if (!ref.current || !colorName || !selectedColorName) return;
    if (colorName !== selectedColorName) return;

    ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [ref.current, colorName]);
}

function ColorStyleItem(props) {
  const [isEditing, setIsEditing] = useState(false);
  const ref = useRef(null);

  const [styleName, setStyleName] = useState(props.style.name);

  const isSelectedColor = props.style.name === props.currentSelectedColor;

  useScrollToIfSelected(ref, props.style.name, props.currentSelectedColor);

  const onSelectClicked = (e) => {
    props.onSelect(props.style.name);
    e.stopPropagation();
  };

  const onEditClicked = (e) => {
    props.onEditingName();
    setIsEditing(true);
    setStyleName(props.style.name);
    e.stopPropagation();
  };

  const onDeleteClicked = (e) => {
    props.onDelete(props.style.name);
    e.stopPropagation();
  };

  const onColorClicked = (e) => {
    e.stopPropagation();
    e.preventDefault();

    e.nativeEvent.stopPropagation();

    props.onEditValue(props.style, ref.current);
  };

  const onInputKeyUp = (e) => {
    if (e.key === 'Enter') {
      const newName = e.target.value;
      if (newName && props.style.name !== newName) {
        props.onChangeName(props.style.name, newName);
      }
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <div className="variants-pick-variant-item">
        <input
          className="variants-input"
          type="text"
          autoFocus
          onChange={(e) => setStyleName(e.target.value)}
          onKeyUp={onInputKeyUp}
          value={styleName}
          onBlur={() => setIsEditing(false)}
        />
        <div className="color-thumbnail">
          <div className="color-thumbnail-content" style={{ backgroundColor: swatchColor(props.style.style) }} />
        </div>
      </div>
    );
  }

  return (
    <div
      className="variants-pick-variant-item"
      onClick={onSelectClicked}
      ref={ref}
      style={{ backgroundColor: isSelectedColor ? 'var(--hover-bg-color)' : null }}
    >
      <div className="variant-item-name">{props.style.name}</div>
      <div className="variants-item-icon" onClick={onEditClicked}>
        <Icon icon={IconName.Pencil} size={IconSize.Small} />
      </div>
      <div className="variants-item-icon" onClick={onDeleteClicked}>
        <Icon icon={IconName.Trash} size={IconSize.Small} />
      </div>
      <div className="color-thumbnail" onClick={onColorClicked}>
        <div className="color-thumbnail-content" style={{ backgroundColor: swatchColor(props.style.style) }} />
      </div>
    </div>
  );
}

function ColorItem(props) {
  const ref = useRef();

  const onSelectClicked = (e) => {
    props.onSelect(props.color);
    e.stopPropagation();
  };

  useScrollToIfSelected(ref, props.color, props.currentSelectedColor);

  return (
    <div
      className="variants-pick-variant-item"
      onClick={onSelectClicked}
      ref={ref}
      style={{ backgroundColor: props.currentSelectedColor === props.color ? 'var(--hover-bg-color)' : null }}
    >
      <div className="variant-item-name">{props.color}</div>
      <div className="color-thumbnail">
        <div className="color-thumbnail-content" style={{ backgroundColor: swatchColor(props.color) }} />
      </div>
    </div>
  );
}

function CreateNewStyle(props) {
  const [isCreating, setIsCreating] = useState(false);
  const inputRef = useRef(null);

  const color = ProjectModel.instance.resolveColor(props.color);

  const onCreateNewColorStyle = () => {
    const name = inputRef.current.value;

    if (!name) return;

    if (props.stylesModel.styleExists('colors', name)) {
      ToastLayer.showError('Style already exists');
    } else {
      props.stylesModel.setStyle('colors', name, color, {
        undo: true,
        label: `create new color style: ${name}`
      });
      props.onColorStyleCreated(name);
      setIsCreating(false);
      ToastLayer.showSuccess(`Created color style ${name}`);
    }
  };

  if (isCreating) {
    return (
      <>
        <div className="variants-header">
          <span>New color style name</span>
        </div>
        <div>
          <div className="variants-input-container">
            <input
              autoFocus
              className="variants-input"
              ref={inputRef}
              onKeyUp={(e) => e.key === 'Enter' && onCreateNewColorStyle()}
              style={{ marginRight: 0 }}
            />
            <div className="color-thumbnail" style={{ height: 27, width: 27 }}>
              <div className="color-thumbnail-content" style={{ backgroundColor: color }} />
            </div>
          </div>
          <div style={{ padding: '0 8px 8px', display: 'flex', alignItems: 'center' }}>
            <button className="variants-button primary" onClick={onCreateNewColorStyle} style={{ width: '100%' }}>
              Create
            </button>
          </div>
        </div>
      </>
    );
  } else {
    return (
      <div className="variants-header variants-add-header">
        <span>Create new color style</span>

        <IconButton
          icon={IconName.Plus}
          size={IconSize.Small}
          UNSAFE_className="add-button"
          variant={IconButtonVariant.OpaqueOnHover}
          onClick={() => setIsCreating(true)}
        />
      </div>
    );
  }
}

export default ColorStylePicker;
