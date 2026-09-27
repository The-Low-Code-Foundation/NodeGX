import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';

import { StylesModel } from '@noodl-models/StylesModel';

import { Icon, IconName, IconSize } from '../../../../../../noodl-core-ui/src/components/common/Icon';
import { escapeHtml } from '../../utils/escapeHtml';
import FontLoader from '../../utils/fontloader';
import PopupLayer from '../popuplayer';
import TextStylePopup from './TextStylePopup';
import utils from './utils';
import { unmountReactRoot } from '../../../../shared/utils/unmountReactRoot';

require('../../styles/propertyeditor/variantseditor.css');
require('./TextStylePicker.css');

function TextStylePicker(props) {
  const [stylesModel, setStylesModel] = useState(null);
  const [textStyles, setTextStyles] = useState([]);
  const [styleToEdit, setStyleToEdit] = useState(null);
  const [popupAnchor, setPopupAnchor] = useState(null);

  useLayoutEffect(() => {
    const stylesModel = new StylesModel();
    setStylesModel(stylesModel);

    setTextStyles(stylesModel.getStyles('text'));

    stylesModel.on('stylesChanged', (args) => {
      if (args.type === 'text') {
        setTextStyles(stylesModel.getStyles('text'));
      }
    });

    return () => {
      stylesModel.dispose();
    };
  }, []);

  useEffect(() => {
    if (!styleToEdit || !popupAnchor) return;

    const div = document.createElement('div');
    const root = createRoot(div);
    // Synchronous so showPopout can measure real content (DEBT-010).
    flushSync(() => root.render(<TextStylePopup style={styleToEdit} stylesModel={stylesModel} />));

    const popout = PopupLayer.instance.showPopout({
      content: { el: div },
      attachTo: popupAnchor,
      position: 'right',
      onClose: () => {
        unmountReactRoot(root);
      }
    });

    return () => {
      PopupLayer.instance.hidePopout(popout);
    };
  }, [styleToEdit, popupAnchor, stylesModel]);

  let filteredStyles = textStyles;

  const filterString = props.filter ? props.filter.toLowerCase() : undefined;

  if (filterString) {
    filteredStyles = textStyles.filter((style) => style.name.toLowerCase().includes(filterString));
  }

  filteredStyles.sort((a, b) => {
    if (!a.style || !a.style.fontSize || !b.style || !b.style.fontSize) return 0;
    return a.style.fontSize - b.style.fontSize;
  });

  const onDelete = (name) => {
    const { nodeCount, variantCount } = utils.getStyleUsage('textStyle', name);

    if (nodeCount > 0 || variantCount > 0) {
      // The style name is user- and AI-authorable and this string is rendered
      // through `dangerouslySetInnerHTML` by ConfirmModal — escape it (FIX-003).
      let message = `Are you sure you want to delete <strong>${escapeHtml(name)}</strong>?<br>This text style is used by `;
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
        title: 'CONFIRM DELETE TEXT STYLE',
        message: message,
        confirmLabel: 'Yes, delete',
        onConfirm: () => {
          stylesModel.deleteStyle('text', name, { undo: true, label: 'delete text style' });
        }
      });
    } else {
      stylesModel.deleteStyle('text', name, { undo: true, label: 'delete text style' });
    }
  };

  const onChangeName = (name, newName) => {
    stylesModel.changeStyleName('text', name, newName, {
      undo: true,
      label: 'change text style name'
    });
  };

  const onEdit = (style, popupAnchor) => {
    setStyleToEdit(style);
    setPopupAnchor(popupAnchor);
  };

  return (
    <div style={{ width: '270px', maxHeight: '400px', display: 'flex', flexDirection: 'column', fontSize: '16px' }}>
      <div style={{ overflow: 'hidden auto', flexGrow: 1 }}>
        {/* No "Create new text style" (P100 R6): text styles are a closed layer that 0.3.0
            converts to Looks on load, so nothing may mint a new one after the conversion. */}
        {filteredStyles.map((style) => (
          <TextStyleItem
            key={style.name}
            style={style}
            onSelect={props.onItemSelected}
            onChangeName={onChangeName}
            onDelete={onDelete}
            onEdit={(popupAnchor) => onEdit(style, popupAnchor)}
            onEditingName={() => setStyleToEdit(null)}
          />
        ))}
        {/* With Create gone and UPG-003 converting on load, most projects have no text styles
            left — and a list of nothing drew a 0px popout: just its arrow. Say why instead. */}
        {filteredStyles.length === 0 && (
          <div className="textstyles-empty">
            {textStyles.length === 0
              ? 'This project has no text styles. Since 0.3.0, set type with the Font Size, Font Weight and Line Height fields below — they take the Type tokens under Styles → Type.'
              : 'No text style matches that name.'}
          </div>
        )}
      </div>
    </div>
  );
}

function TextStyleItem(props) {
  const [isEditing, setIsEditing] = useState(false);
  const [styleName, setStyleName] = useState(props.style.name);

  const popupAnchorRef = useRef(null);

  const onSelectClicked = (e) => {
    props.onSelect(props.style.name);
    e.stopPropagation();
  };

  const onDeleteClicked = (e) => {
    props.onDelete(props.style.name);
    e.stopPropagation();
  };

  const onEditStyleClicked = (e) => {
    props.onEdit(popupAnchorRef.current);
    e.stopPropagation();
  };

  const onEditClicked = (e) => {
    props.onEditingName();
    setIsEditing(true);
    setStyleName(props.style.name);
    e.stopPropagation();
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

  const fontStyle = props.style.style || {};

  //style object is in the following format: {fontSize: 12, unit: 'px', ...}
  //lets convert it to CSS
  const propertiesToIgnore = ['fontSize', 'lineHeight'];

  const css = {};
  for (const prop in fontStyle) {
    if (!propertiesToIgnore.includes(prop)) {
      const value = fontStyle[prop];
      css[prop] = typeof value === 'object' ? value.value + value.unit : value;
    }
  }

  if (fontStyle.fontFamily && fontStyle.fontFamily.indexOf('.') !== -1) {
    const fontPath = fontStyle.fontFamily;
    const paths = fontPath.split('/');
    const fileName = paths[paths.length - 1];
    const nameWithoutExtension = fileName.split('.')[0];
    const nameWithoutExtensionAndSpaces = nameWithoutExtension.replace(/\s/g, '');
    FontLoader.instance.loadFont(nameWithoutExtensionAndSpaces, fontPath);
    css.fontFamily = nameWithoutExtensionAndSpaces;
  }

  //if the text style color is too dark, add a light gray plate behind it
  if (css.color && colorToLuminance(css.color) < 0.5) {
    css.backgroundColor = '#ccc';
    css.padding = '0 4px';
  }

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
      </div>
    );
  }

  return (
    <div className="variants-pick-variant-item" onClick={onSelectClicked}>
      <div className="variant-item-name">
        <span style={css}>{props.style.name}</span>
      </div>
      <div className="variants-item-icon" onClick={onEditClicked}>
        <Icon icon={IconName.Pencil} size={IconSize.Small} />
      </div>
      <div className="variants-item-icon" onClick={onDeleteClicked}>
        <Icon icon={IconName.Trash} size={IconSize.Small} />
      </div>
      <div className="textstyles-edit-style" onClick={onEditStyleClicked} ref={popupAnchorRef}>
        <Icon icon={IconName.Sliders} UNSAFE_style={{ width: 20, height: 20 }} />
      </div>
    </div>
  );
}

function colorToLuminance(color) {
  const rgba = colorToRGBA(color);
  return 0.299 * rgba[0] + 0.587 * rgba[1] + 0.114 * rgba[2];
}

function colorToRGBA(color) {
  if (color === 'transparent' || !color) {
    return [0, 0, 0, 0];
  }

  if (color[0] !== '#') color = '#' + color;

  const numComponents = (color.length - 1) / 2;

  const result = [0, 0, 0, 1];
  for (let i = 0; i < numComponents; ++i) {
    const index = 1 + i * 2;
    result[i] = parseInt(color.substring(index, index + 2), 16) / 255;
  }

  return result;
}

export default TextStylePicker;
