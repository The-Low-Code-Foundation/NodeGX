import NoodlViewerReact, { ssrSetupRuntime } from './noodl-viewer-react';
import { applyDeployConfig } from './src/deploy-config';

export { NoodlViewerReact, ssrSetupRuntime };
globalThis.NoodlSSR = { createElement: NoodlViewerReact.createElement, ssrSetupRuntime, applyDeployConfig };
