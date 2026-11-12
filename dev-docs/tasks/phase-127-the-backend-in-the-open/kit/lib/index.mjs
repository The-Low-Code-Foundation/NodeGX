// @nodegx/backend-kit (P127 BKO-008; its own package by ruling R2) — what anyone needs to build their own backend editor
// or viewer, with no screen in it. The backend map (@nodegx/backend-map) is built on this and on nothing private.
//
//   What's in the backend          readFacts, tableRows, openProject, backend, projectBackend
//   Who may touch a table, in words words (ruleWords, tableRule, handWords, …), dryRuns, rulesOff
//   What functions and pages touch analyseProject, scriptTouches (a name in the code: names, not hands over)
//   What starts by itself          triggerFlows, readAutomationsFile
//   What one person actually got   asPerson, makeLens (reachOf, everyone), makeViews
//   Change it so it holds          setTableRule, makeHands (rule, addTrigger, removeTrigger, setEnabled, undo):
//                                  the backend and the project's file together, a stale page refused, rolled back
//   What ran just now              makeRuns
//   Is my editor right?            runSuite, referenceAdapter, EDIT_KINDS (and the `backend-suite` command); its read
//                                  half grades what an editor shows one person was handed (gradeHanded)

export { backend, BackendError } from './backend.mjs';
export { backendsRoot, localBackends, projectBackend } from './discover.mjs';
export { openProject, analyseProject, scriptTouches, projectTables, tableLinks } from './project.mjs';
export { readFacts, tableRows, rolesIn } from './facts.mjs';
export { idOf, personColumns, personKeys, profileTables, profilesFrom, profilesOf, signedInContext } from './people.mjs';
export { AUTOMATIONS_FILE, readAutomationsFile, functionNamed, triggerFlows } from './triggers.mjs';

export { KEY_SUFFIX, asPerson, personName, runnable, argsFor } from './asperson.mjs';
export { MAX_ASKS, loadWorld, personReach, anonymousReach, rowIndex, rowsIn } from './reach.mjs';
export { makeLens } from './lens.mjs';
export { makeViews } from './views.mjs';

export { SECURITY_FILE, Refusal, readSecurityFile, entryFor, setTableRule, verify, rulesOff, dryRuns, samplePeople } from './rules.mjs';
export { makeHands, projectTrigger } from './hands.mjs';

export { makeRuns } from './runs.mjs';

export * as words from './words.js';

export { EDIT_KINDS, editWords, referenceAdapter, runSuite } from './suite.mjs';
export { gradeHanded, samplePeopleByGroups } from './handed.mjs';
