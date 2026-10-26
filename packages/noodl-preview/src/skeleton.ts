/**
 * P26-SKELSHIP — the engine half. A deploy put create_project's placeholder in front of every visitor (lingo.nodegx.io),
 * and the person could not tell whether the deploy had worked. Ruled 2026-10-26: never refuse, warn loudly everywhere.
 * This engine (Studio's Publish, `nodegx deploy`, ship-to-vm.sh, `deploy_to_vm`) publishes it and says so in
 * `warnings`.
 *
 * The reading lives in the editor (`@noodl-utils/compilation/build/deploy-skeleton`), so the Deploy to folder tab asks
 * the same question before the folder is chosen. Its markers are held equal to create_project's by
 * tests/p26-skelship-engine.test.ts.
 */
export {
  isUntouchedSkeletonPage,
  LEGACY_SKELETON_PLACEHOLDER_MARKERS,
  SKELETON_PLACEHOLDER_MARKER,
  skeletonWarning,
  untouchedSkeletonPages
} from '@noodl-utils/compilation/build/deploy-skeleton';
