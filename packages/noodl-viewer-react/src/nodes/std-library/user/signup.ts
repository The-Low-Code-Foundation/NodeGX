'use strict';

import type {
  EditorConnectionLike,
  GraphModelLike,
  GraphNodeModel,
  NodeContextLike,
  NodeDefinitionOptions,
  NodeInstance,
  NodeModule,
  OutcomeToken
} from '@noodl/types';
import { isParseWireContext } from '@noodl/runtime/src/nodes/std-library/data/record-ports';
import { sendSchemaPorts, staticPortNames } from '@noodl/runtime/src/nodes/std-library/data/schema-ports';
import {
  USER_INPUT_IGNORE_PARSE_BROWSER,
  USER_INPUT_IGNORE_REST,
  userPropertyPorts,
  userSchemaContext
} from '@noodl/runtime/src/nodes/std-library/user/user-ports';
import { outcomeOutputs, reportOutcomes } from '@noodl/runtime/src/outcome';

import UserService from './userservice';

/**
 * NDA-004 §2 / FINDINGS B-iv — the code this node raises when it cannot sign up.
 *
 * The graph half was always right: `failure` and `error` are real ports. The *diagnosis*
 * went to `editorConnection.sendWarning` and therefore existed only on the canvas.
 *
 * Per node rather than one code for the family (`record/storage-op-failed`'s choice),
 * because there the family shares a single `setError` funnel and the message is what
 * distinguishes the cases; here every node has its own funnel and the *operation* is the
 * distinguishing fact, so the code should carry it.
 *
 * It is also the editor's warning key — the bus's editor subscriber keys by `code` — so
 * `clearWarnings` names this same constant. Raise and clear move together, always.
 */
const SIGN_UP_ERROR_CODE = 'user/sign-up-failed';

/** `this` inside the Sign Up node. */
interface SignUpInstance extends NodeInstance {
  _internal: {
    username?: string;
    password?: string;
    email?: string;
    /** Extra columns of the accounts table, collected from the `prop-…` inputs. */
    userProperties: Record<string, unknown>;
    /** Message from the last failed attempt. */
    error?: string;
    /** ERG-001. Invocations of `Do` that have not reported yet — see `login.ts`. */
    pendingSignUp?: OutcomeToken[];
  };
  signUpScheduled?: boolean;
  setError(err: string, tokens?: OutcomeToken[]): void;
  setUserProperty(name: string, value: unknown): void;
  scheduleSignUp(): void;
}

const SignUpNodeDefinition: NodeDefinitionOptions = {
  name: 'net.noodl.user.SignUp',
  docs: 'https://docs.noodl.net/nodes/data/user/sign-up',
  displayNodeName: 'Sign Up',
  category: 'Cloud Services',
  color: 'data',
  initialize(this: SignUpInstance) {
    const internal = this._internal;
    internal.userProperties = {};
  },
  outputs: {
    // ── the outcome contract ────────────────────────────────────────────────
    //
    // ERG-001 §4. `Success` renamed to `Done`, plus the universal `Completed`.
    //
    // ⚠️ **No `Unchanged`.** A sign-up either creates an account or is refused; an address that
    // already has one is a backend refusal, not a post-condition that already held.
    ...outcomeOutputs({
      done: 'Fires once the account has been created and signed in',
      failure: 'Fires when the account could not be created, after the reason has been reported on the error channel'
    }),
    error: {
      description: 'Why the last sign-up failed; empty until one does',
      type: 'string',
      displayName: 'Error',
      group: 'Error',
      getter(this: SignUpInstance) {
        return this._internal.error;
      }
    }
  },
  inputs: {
    signup: {
      description: 'Creates an account from the values below and signs it in',
      displayName: 'Do',
      group: 'Actions',
      valueChangedToTrue(this: SignUpInstance) {
        this.scheduleSignUp();
      }
    },
    username: {
      description: 'Username for the new account',
      displayName: 'Username',
      type: 'string',
      group: 'General',
      set(this: SignUpInstance, value: string) {
        this._internal.username = value;
      }
    },
    password: {
      description: 'Password for the new account',
      displayName: 'Password',
      type: 'string',
      group: 'General',
      set(this: SignUpInstance, value: string) {
        this._internal.password = value;
      }
    },
    email: {
      description: 'Email address for the new account; leave blank if the project does not ask for one',
      displayName: 'Email',
      type: 'string',
      group: 'General',
      set(this: SignUpInstance, value: string) {
        this._internal.email = value;
      }
    }
  },
  methods: {
    /** ERG-001 — the funnel now reports the outcome too. See `login.ts::setError`. */
    setError(this: SignUpInstance, err: string, tokens?: OutcomeToken[]) {
      this._internal.error = err;
      this.flagOutputDirty('error');

      reportOutcomes(this, tokens || [this.beginOutcome()], 'failure', {
        code: SIGN_UP_ERROR_CODE,
        message: err
      });
    },
    clearWarnings(this: SignUpInstance) {
      if (this.context.editorConnection) {
        const component = this.nodeScope.componentOwner.name;
        this.context.editorConnection.clearWarning(component, this.id, SIGN_UP_ERROR_CODE);
        this.context.editorConnection.clearWarning(component, this.id, 'user-login-warning');
      }
    },
    scheduleSignUp(this: SignUpInstance) {
      const internal = this._internal;

      // ERG-001. Minted before the coalescing guard — see `login.ts::scheduleLogIn`.
      const pending = internal.pendingSignUp || (internal.pendingSignUp = []);
      pending.push(this.beginOutcome());

      if (this.signUpScheduled === true) return;
      this.signUpScheduled = true;

      this.scheduleAfterInputsHaveUpdated(() => {
        this.signUpScheduled = false;

        const tokens = internal.pendingSignUp || [];
        internal.pendingSignUp = [];

        UserService.instance.signUp({
          username: this._internal.username,
          password: this._internal.password,
          email: this._internal.email,
          properties: internal.userProperties,
          success: () => {
            reportOutcomes(this, tokens, 'done');
          },
          error: (e) => {
            this.setError(e, tokens);
          }
        });
      });
    },
    setUserProperty(this: SignUpInstance, name: string, value: unknown) {
      this._internal.userProperties[name] = value;
    },
    // The `runtime-discovered` mechanism: `prop-<column>` inputs are created on demand,
    // and `updatePorts` below is what tells the editor they exist.
    registerInputIfNeeded(this: SignUpInstance, name: string) {
      if (this.hasInput(name)) {
        return;
      }

      if (name.startsWith('prop-')) {
        return this.registerInput(name, {
          set: this.setUserProperty.bind(this, name.substring('prop-'.length))
        });
      }
    }
  }
};

/**
 * The node's ports: one `prop-<column>` per column of the ACTIVE backend's accounts table (user-ports.ts), the same
 * reading `Set User Properties` makes. Until P107-S102-SIGNUPBACKEND this read the Parse `_User` from `systemCollections`
 * whatever backend was active, so a Directus app was offered the built-in's columns, which `directus_users` does not have.
 *
 * The node has no Backend input and its sign-up always goes to the active backend (`UserService.signUp` with no
 * `backendId`), so a saved `backendId` parameter is not read: the ports follow the wire. On the Parse wire the ignore list
 * is the browser's (the same seven names this node always skipped); off it, the REST list, because the REST adapter sends
 * every `prop-` value in the sign-up body and a server-owned column would be refused or dropped (user-ports.ts rule 3).
 */
function updatePorts(nodeId: string, editorConnection: EditorConnectionLike, graphModel: GraphModelLike): void {
  const ctx = userSchemaContext(graphModel, {});
  const ignore = isParseWireContext(ctx) ? USER_INPUT_IGNORE_PARSE_BROWSER : USER_INPUT_IGNORE_REST;

  sendSchemaPorts(editorConnection, nodeId, userPropertyPorts(ctx, { plug: 'input', ignore }), {
    staticPorts: staticPortNames(SignUpNodeDefinition as { inputs?: Record<string, unknown>; outputs?: Record<string, unknown> })
  });
}

const SignUpModule: NodeModule = {
  node: SignUpNodeDefinition,
  setup(context: NodeContextLike, graphModel: GraphModelLike) {
    const editorConnection = context.editorConnection;
    if (!editorConnection || !editorConnection.isRunningLocally()) {
      return;
    }

    function _managePortsForNode(node: GraphNodeModel) {
      const rebuild = () => updatePorts(node.id, editorConnection, graphModel);

      rebuild();
      // The port set depends on the active backend and its introspected schema as well as on the Parse-wire cache:
      // the three keys `Set User Properties` listens to.
      graphModel.on('metadataChanged.systemCollections', rebuild);
      graphModel.on('metadataChanged.dbCollections', rebuild);
      graphModel.on('metadataChanged.backendServices', rebuild);
    }

    // Unlike every other node here, the ports depend on project *metadata* rather than on
    // the node's own parameters — so the wiring waits for the import to finish and then
    // covers both the nodes already present and any added later.
    graphModel.on('editorImportComplete', () => {
      graphModel.on('nodeAdded.net.noodl.user.SignUp', function (node: GraphNodeModel) {
        _managePortsForNode(node);
      });

      for (const node of graphModel.getNodesWithType('net.noodl.user.SignUp')) {
        _managePortsForNode(node);
      }
    });
  }
};

export default SignUpModule;
