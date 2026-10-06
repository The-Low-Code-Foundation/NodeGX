'use strict';

import type { NodeDefinitionOptions, NodeInstance, NodeModule } from '@noodl/types';

/**
 * `this` inside the Substring node.
 *
 * The result is computed lazily in the getter and cached, so `resultDirty` is what makes
 * the three setters cheap — they only mark, they never recompute.
 */
interface SubStringNodeInstance extends NodeInstance {
  _internal: {
    startIndex: number;
    /** `-1` means "to the end of the string", not "one before the end". */
    endIndex: number;
    cachedResult: string;
    inputString: string;
    resultDirty: boolean;
  };
}

const SubStringNode: NodeDefinitionOptions = {
  name: 'Substring',
  docs: 'https://docs.noodl.net/nodes/string-manipulation/substring',
  category: 'String Manipulation',
  initialize: function (this: SubStringNodeInstance) {
    const internal = this._internal;
    internal.startIndex = 0;
    internal.endIndex = -1;
    internal.cachedResult = '';
    internal.inputString = '';
    internal.resultDirty = false;
  },
  inputs: {
    start: {
      group: 'Values',
      type: 'number',
      displayName: 'Start',
      description: 'Position of the first character to keep, counting from zero; a negative value counts back from the end',
      default: 0,
      set: function (this: SubStringNodeInstance, value: number) {
        this._internal.startIndex = value;
        this._internal.resultDirty = true;
        this.flagOutputDirty('result');
      }
    },
    end: {
      group: 'Values',
      type: 'number',
      displayName: 'End',
      // DEF-033: this declaration and `initialize` must say the same number. A declared default
      // never runs its setter (`registerInput` writes it straight into `_inputValues`), so the
      // getter answers from `_internal.endIndex` = -1 whatever the panel shows — and 0 is the
      // opposite answer, the empty string for every input. The panel showed 0 for a node that
      // was returning the rest of the string; `substring-declared-default.test.ts` pins them
      // together.
      description: 'Position to stop before; -1, the default, runs to the end of the string, and 0 yields an empty result',
      default: -1,
      set: function (this: SubStringNodeInstance, value: number) {
        this._internal.endIndex = value;
        this._internal.resultDirty = true;
        this.flagOutputDirty('result');
      }
    },
    string: {
      group: 'Values',
      type: {
        name: 'string'
      },
      displayName: 'String',
      description: 'Text to take the substring from; an empty value (null) counts as empty text',
      default: '',
      // P107-C4 (ISL-026, ruled "Read it as empty text"): null and undefined are empty text. The
      // setter once called `value.toString()`, which threw on both and left the frame dead.
      set: function (this: SubStringNodeInstance, value: unknown) {
        this._internal.inputString = value === null || value === undefined ? '' : String(value);
        this._internal.resultDirty = true;
        this.flagOutputDirty('result');
      }
    }
  },
  outputs: {
    result: {
      group: 'Values',
      type: 'string',
      displayName: 'Result',
      description: 'The section of String between Start and End',
      getter: function (this: SubStringNodeInstance) {
        const internal = this._internal;

        if (internal.resultDirty) {
          // P107-D7: the text '-1' (a text field, an expression) runs to the end too, as the number does.
          if (Number(internal.endIndex) === -1) {
            internal.cachedResult = internal.inputString.substr(internal.startIndex);
          } else {
            internal.cachedResult = internal.inputString.substr(
              internal.startIndex,
              internal.endIndex - internal.startIndex
            );
          }
          internal.resultDirty = false;
        }
        return internal.cachedResult;
      }
    }
  }
};

const SubStringNodeModule: NodeModule = {
  node: SubStringNode
};

export = SubStringNodeModule;
