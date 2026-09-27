import { ProjectModel } from '@noodl-models/projectmodel';
import { StyleTokensModel } from '@noodl-models/StyleTokensModel/StyleTokensModel';
import { tokenCategoriesForPort, tokensForPicking } from '@noodl-models/StyleTokensModel/TokensForPicking';
import FileSystem from '@noodl-utils/filesystem';

import { ContentPickerItem } from './ContentPicker';

export const COMMON_FONTS = [
  'Arial',
  'Helvetica',
  'Times New Roman',
  'Arial Black',
  'Impact',
  'Tahoma',
  'Courier New',
  'Lucida Console'
];

export function folderForProjectPath(pathInProjectFolder: string): string {
  const parts = pathInProjectFolder.split('/');
  if (parts.length === 1) return '/';
  return parts.splice(0, parts.length - 1).join('/');
}

const fontDataURLCache: Record<string, string> = {};
const injectedFontFaces = new Set<string>();

function getFontDataURL(fileEntry: TSFixme, callback: (content: string) => void) {
  if (fontDataURLCache[fileEntry.name]) {
    callback(fontDataURLCache[fileEntry.name]);
    return;
  }

  FileSystem.instance.downloadAsDataURI(fileEntry.fullPath, (content: string) => {
    fontDataURLCache[fileEntry.name] = content;
    callback(content);
  });
}

/** Register a project font with the document so pickers can preview it */
function injectFontFace(family: string, dataURL: string) {
  if (injectedFontFaces.has(family)) return;
  injectedFontFaces.add(family);

  const style = document.createElement('style');
  style.textContent = '@font-face {font-family: "' + family + '"; src: url(' + dataURL + ');}';
  document.head.appendChild(style);
}

/**
 * Load the font picker's item list: the project's typography-family tokens and the common
 * built-in fonts synchronously, then the project's font files (with @font-face registration for
 * preview) as they resolve.
 */
export function loadFontItems(push: (items: ContentPickerItem[]) => void) {
  push(designTokenFontItems());

  push(
    COMMON_FONTS.map((name) => ({
      name,
      fullPath: name,
      folder: 'Common fonts',
      fontFamily: name
    }))
  );

  ProjectModel.instance.listFilesInProjectDirectory(
    (files) => {
      const items: ContentPickerItem[] = [];
      let filesLeft = files.length;
      if (!filesLeft) return;

      files.forEach((fileEntry) => {
        getFontDataURL(fileEntry, (dataURL) => {
          if (dataURL) {
            const nameWithoutExtension = fileEntry.name.slice(0, -4);
            const family = nameWithoutExtension.replace(/\s/g, '');
            const pathInProjectFolder = fileEntry.fullPath.substring(
              ProjectModel.instance._retainedProjectDirectory.length + 1
            );

            injectFontFace(family, dataURL);

            items.push({
              name: nameWithoutExtension,
              fullPath: pathInProjectFolder,
              folder: folderForProjectPath(pathInProjectFolder),
              fontFamily: family
            });
          }

          if (--filesLeft === 0) push(items);
        });
      });
    },
    ['otf', 'ttf', 'woff', 'woff2']
  );
}

/**
 * HLT-012 — the project's font-family tokens, offered in the font picker.
 *
 * 🔴 **This field is the one HLT-012's §2 does not mention, and the editor stamps a token onto it
 * on every new Text.** `TextConfig` writes `fontFamily: 'var(--font-sans)'`; `Puppy test 3` holds
 * `var(--font-mono)` on a Font Family port today. The port is `type: { name: 'font' }`, so it is a
 * `PickerTypeView` and not one of the three numeric fields §2 lists — §4's *"the numeric and
 * dimension fields"* excludes the field that was already a picker and cost five lines to fix
 * ([[a-tasks-out-of-scope-line-can-contain-the-defect]]).
 *
 * ⚠️ **`fontFamily` is what `tokenCategoriesForPort` is asked**, not a hard-coded category, so the
 * one table still decides. A `font` port under some other name would correctly get nothing.
 *
 * ⚠️ The row previews in the family it names, like every other row here: a token resolves to a
 * real stack (`ui-sans-serif, system-ui, …`) and `fontFamily` takes it verbatim.
 */
function designTokenFontItems(): ContentPickerItem[] {
  const categories = tokenCategoriesForPort('fontFamily');
  if (categories.length === 0) return [];

  const tokensModel = new StyleTokensModel();
  try {
    const groups = tokensForPicking(tokensModel.getTokens(), categories);

    return groups.flatMap((group) =>
      group.tokens.map((token) => ({
        name: token.name,
        // What is STORED — the reference, never the resolved stack. Same rule as every other
        // surface that offers a token: the parameter keeps the link to the Styles panel.
        fullPath: `var(${token.name})`,
        folder: 'Design tokens',
        fontFamily: tokensModel.resolveToken(token.name) || token.value
      }))
    );
  } finally {
    // The picker streams items and then forgets them; nothing here outlives this call, so the
    // model's listeners must not either.
    tokensModel.dispose();
  }
}
