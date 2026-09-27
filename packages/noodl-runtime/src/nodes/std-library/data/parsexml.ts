'use strict';

/**
 * Parse XML (FED-001) — XML text that arrived at runtime, as an object.
 *
 * ## Shared runtime, both surfaces
 *
 * Registered in `@noodl/runtime`'s own list next to `Parse CSV`, so the browser gets it too.
 * Richard ruled that directly (phase 96 README §4, R1): a capability that lives only in a kit
 * module is invisible in the node picker, and invisible is the thing this phase exists to fix.
 * There is nothing here a browser must not have — the parser reads text and returns an object.
 *
 * ## Every value is a string
 *
 * Inherited from `src/xml.ts` and stated on the `Result` port, the same rule `Parse CSV` set. A
 * `<guid>0123</guid>` is an identifier, not the number 123.
 *
 * ## A hostile document fails, it does not hang
 *
 * Two guards, both documented on their ports: a size limit, and a refusal to read a document that
 * declares its own entities. The second is the billion-laughs attack, and the guard runs on the
 * text before the parser is handed a byte. See the module comment on `src/xml.ts`.
 */

import type { InspectInfo, NodeDefinitionOptions, NodeInstance, NodeModule } from '@noodl/types';

import { DEFAULT_MAX_BYTES, parseXML } from '../../../xml';

/** The editor's warning key as well as the runtime error code. */
const PARSE_ERROR_CODE = 'parse-xml/parse-failed';

interface ParseXMLNodeInstance extends NodeInstance {
  _internal: {
    text?: string;
    /** Whether anything has ever arrived on `XML`. The abstain — see `_parse`. */
    textSupplied?: boolean;
    attributePrefix: string;
    alwaysArray: string;
    trimValues: boolean;
    maxBytes: number;
    /** Replaced only on a successful parse. */
    result?: Record<string, unknown>;
    lastError?: string;
    lastErrorCode?: string;
    scheduled?: boolean;
  };
  _schedule(): void;
  _parse(): void;
}

const ParseXMLNode: NodeDefinitionOptions = {
  name: 'net.noodl.ParseXML',
  displayNodeName: 'Parse XML',
  docs: 'https://docs.noodl.net/nodes/data/array/parse-xml',
  category: 'Data',
  color: 'data',
  /**
   * ⚠️ A declared `default` never runs its setter, so these are the real defaults — the same trap
   * `Parse CSV` documents, and the reason its suite asserts them.
   */
  initialize: function (this: ParseXMLNodeInstance) {
    this._internal.attributePrefix = '@';
    this._internal.alwaysArray = '';
    this._internal.trimValues = true;
    this._internal.maxBytes = DEFAULT_MAX_BYTES;
  },
  getInspectInfo(this: ParseXMLNodeInstance): InspectInfo | void {
    if (this._internal.lastError) return this._internal.lastError;
    if (this._internal.result) return [{ type: 'value', value: this._internal.result }];
  },
  inputs: {
    text: {
      type: { name: 'string', codeeditor: 'text' },
      displayName: 'XML',
      group: 'General',
      description:
        'The XML text to parse. Wire an HTTP Request node\'s Response here with its Response Type ' +
        'set to Text, so the body reaches this node untouched whatever content-type the server claimed',
      set: function (this: ParseXMLNodeInstance, value: string) {
        this._internal.textSupplied = value !== undefined && value !== null;
        this._internal.text = value;
        this._schedule();
      }
    },
    attributePrefix: {
      type: 'string',
      displayName: 'Attribute Prefix',
      group: 'General',
      default: '@',
      description:
        'What an attribute\'s key starts with, so it cannot collide with a child element of the ' +
        'same name. With the default, <a href="x"/> is { "@href": "x" }',
      set: function (this: ParseXMLNodeInstance, value: string) {
        this._internal.attributePrefix = value === undefined || value === null ? '@' : value;
        this._schedule();
      }
    },
    alwaysArray: {
      type: 'string',
      displayName: 'Always Array',
      group: 'General',
      default: '',
      description:
        'Comma-separated tag names that are always an array, however many times they appear. ' +
        'Without this, a document with one <item> and a document with ten have different shapes ' +
        'and everything downstream needs a branch',
      set: function (this: ParseXMLNodeInstance, value: string) {
        this._internal.alwaysArray = value || '';
        this._schedule();
      }
    },
    trimValues: {
      type: 'boolean',
      displayName: 'Trim Values',
      group: 'General',
      default: true,
      description: 'Strip leading and trailing whitespace from text. Untick it to keep a document\'s indentation',
      set: function (this: ParseXMLNodeInstance, value: boolean) {
        this._internal.trimValues = !!value;
        this._schedule();
      }
    },
    maxBytes: {
      type: 'number',
      displayName: 'Max Bytes',
      group: 'General',
      default: DEFAULT_MAX_BYTES,
      description:
        'Refuse a document larger than this, before parsing it. A big document costs many times ' +
        'its own size in memory once it is an object, and a server can always send more than you expected',
      set: function (this: ParseXMLNodeInstance, value: number) {
        const n = Number(value);
        this._internal.maxBytes = isFinite(n) && n > 0 ? n : DEFAULT_MAX_BYTES;
        this._schedule();
      }
    }
  },
  outputs: {
    result: {
      type: 'object',
      displayName: 'Result',
      group: 'Values',
      description:
        'The document as an object. Every value is a string, including ones that look numeric — ' +
        'an id of 0123 stays "0123". A tag carrying both attributes and text becomes ' +
        '{ "@attr": "…", "#text": "…" }. Unchanged while the XML cannot be parsed',
      getter: function (this: ParseXMLNodeInstance) {
        return this._internal.result;
      }
    },
    changed: {
      type: 'signal',
      displayName: 'Changed',
      group: 'Events',
      description: 'Fires once Result holds the freshly parsed document'
    },
    failure: {
      type: 'signal',
      displayName: 'Failure',
      group: 'Events',
      description: 'Fires when the XML could not be parsed or was refused, leaving Result as it was'
    },
    error: {
      type: 'string',
      displayName: 'Error',
      group: 'Error',
      description: 'Why the XML could not be read; empty until a parse fails',
      getter: function (this: ParseXMLNodeInstance) {
        return this._internal.lastError;
      }
    },
    errorCode: {
      type: 'string',
      displayName: 'Error Code',
      group: 'Error',
      description:
        'A stable code for the failure, for a graph that branches rather than reads: xml/too-large, ' +
        'xml/entity-declaration, xml/doctype-subset, xml/parse-failed, xml/empty',
      getter: function (this: ParseXMLNodeInstance) {
        return this._internal.lastErrorCode;
      }
    }
  },
  methods: {
    _schedule: function (this: ParseXMLNodeInstance) {
      // Five inputs arriving in one update pass are one parse, not five — the guard `Parse CSV`
      // uses, and the reason setting Always Array and XML together does not parse once without it.
      if (this._internal.scheduled) return;
      this._internal.scheduled = true;
      this.scheduleAfterInputsHaveUpdated(() => {
        this._internal.scheduled = false;
        this._parse();
      });
    },
    _parse: function (this: ParseXMLNodeInstance) {
      // Nothing has arrived on XML yet: abstain. Failure Contract §2 — an unset input is not an
      // error, and a node that reports one at load is a node whose Failure port gets ignored.
      if (!this._internal.textSupplied) return;

      const result = parseXML(this._internal.text, {
        attributePrefix: this._internal.attributePrefix,
        alwaysArray: this._internal.alwaysArray
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        trimValues: this._internal.trimValues,
        maxBytes: this._internal.maxBytes
      });

      if (result.error) {
        this._internal.lastError = result.error.message;
        this._internal.lastErrorCode = result.error.code;
        this.flagOutputDirty('error');
        this.flagOutputDirty('errorCode');
        // Ungated by `editorConnection`, for the reason the Failure Contract names: a warning that
        // only exists on the canvas is total silence in a cloud function, which is exactly where
        // a document someone else's server sent you arrives.
        this.raiseRuntimeError(PARSE_ERROR_CODE, result.error.message, { code: result.error.code });
        this.sendSignalOnOutput('failure');
        return;
      }

      this._internal.lastError = undefined;
      this._internal.lastErrorCode = undefined;
      this.flagOutputDirty('error');
      this.flagOutputDirty('errorCode');

      this._internal.result = result.value;
      this.flagOutputDirty('result');
      this.sendSignalOnOutput('changed');
    }
  }
};

const ParseXMLNodeModule: NodeModule = { node: ParseXMLNode };

export = ParseXMLNodeModule;
