import { portTitle } from '@nodegx/project-contract/node-title';
import { RuntimeType } from '@noodl-models/nodelibrary/NodeLibraryData';

import Model from '../../../../shared/model';

export class BasicNodeType extends Model {
  private displayNodeName: TSFixme; // TODO: Where is this from?

  allowAsChild: boolean;
  allowAsExportRoot: boolean;
  allowChildrenWithCategory: string[];
  public category: string;
  color: string;
  connectionPanel: TSFixme;
  public docs: string;
  dynamicports: TSFixme[];
  listeners: TSFixme[];
  listenersOnce: TSFixme[];
  public name: string;
  /**
   * CN-006b — the kit that registered this type, when one did. Copied in by the
   * `for (const i in args)` loop below like everything else; declared here so the
   * property panel's provenance row can read it without a cast.
   */
  public module?: string;
  ports: TSFixme[];
  public runtimeTypes: RuntimeType[];
  shortDocs: string;
  useVariants: boolean;
  visualStates: { name: string; label: string }[];
  nodeDoubleClickAction?: {
    focusPort: string;
  };
  public searchTags: string[];

  public get localName() {
    return this.name;
  }

  public get fullName() {
    return (this.category ? this.category + '/' : '') + this.name;
  }

  public get displayName() {
    return this.displayNodeName ? this.displayNodeName : this.localName;
  }

  constructor(args) {
    super();

    // Set default variable
    this.runtimeTypes = [];
    this.searchTags = [];

    // Add anything...
    // TODO: Try to get rid of this args loop
    for (const i in args) {
      this[i] = args[i];
    }

    return this;
  }

  /**
   * The auto-generated name of a node — what the canvas card and the property panel header
   * show when the author has not typed a label of their own.
   *
   * The label port's parameter is NOT necessarily a primitive: setting fx on it stores
   * `{ mode: 'expression', expression, fallback, version }` (see `ExpressionParameter`), and this
   * used to be handed straight to the canvas painter, which stringified it to "[object Object]"
   * (FH-003). Resolve it here, at the one place the label is produced, so that every consumer —
   * the painter, the wrap-height cache, the label/type comparison, the property panel — agrees
   * on one string.
   *
   * The expression TEXT is what is shown, not the fallback: `Noodl.Variables.foo` is the name the
   * author typed, and it is the more useful thing to read off a card.
   */
  labelForNode(node: TSFixme) {
    // P107 R24 — the rule's one body is `@nodegx/project-contract/node-title`, which the agent server calls too.
    return portTitle(node.parameters, node.type) ?? this.displayName;
  }

  /**
   * Module is undefined for basic types
   */
  getModule() {}
}
