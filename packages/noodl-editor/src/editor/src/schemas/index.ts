/**
 * OpenNoodl v2 Project Format — Schema Exports
 *
 * 🔴 **The format moved to `@nodegx/project-contract/format`** (P112 OWN-001): the eight JSON
 * Schemas, the structural validator and the file types now live there, so a page, a script or
 * another editor can read and write a project without this editor. This barrel re-exports them
 * for one release; import from the package in new code.
 *
 * @module noodl-editor/schemas
 * @since 1.2.0
 */

export {
  projectV2Schema,
  componentSchema,
  nodesSchema,
  connectionsSchema,
  registrySchema,
  routesSchema,
  stylesSchema,
  modelSchema,
  SchemaValidator,
  validateSchema,
  formatValidationErrors,
  SCHEMA_IDS
} from '@nodegx/project-contract/format';

export type {
  ValidationResult,
  ValidationError,
  SchemaId,
  ProjectV2File,
  PortDefinition,
  ComponentV2File,
  NodePort,
  NodeV2,
  NodesV2File,
  ConnectionV2,
  ConnectionsV2File,
  RegistryComponentEntry,
  RegistryV2File,
  RouteDefinition,
  RoutesV2File,
  StylesV2File,
  ModelField,
  ModelV2File
} from '@nodegx/project-contract/format';
