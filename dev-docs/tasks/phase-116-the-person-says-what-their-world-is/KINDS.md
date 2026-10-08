# The relation kinds, read off the apps on this machine

**Counts are about these 8 sources and no others** (ONT-000 §5): `template:members-area`, `template:nightbook`, `template:planning`, `template:todo-list`, `lessons`, `acme`, `tirion`, `sentinel`. Generated 2026-10-08 by `scripts/ontology/census.js` — do not edit by hand; edit `kinds.hand.json` and regenerate. Every source was present.

A kind enters this list only with an evidence row that names a file and a line, or a document and a heading; a kind with one row is marked **(1)**; a kind with none makes the script fail. A row is one (collection, field) pair, so a junction contributes one row per end and a relation seen in several places is one row with its sightings counted. The private sources' rows (the membership business and the two prototypes) are held outside the repository (README R6); only their counts are here. The sentence is written per kind and read per row with the row's names in it.

## Sources

| source | kind | collections | fields seen | read from |
|---|---|---|---|---|
| `template:members-area` | in-repo | 5 | 37 | the files named in the script header |
| `template:nightbook` | in-repo | 5 | 60 | the files named in the script header |
| `template:planning` | in-repo | 8 | 265 | the files named in the script header |
| `template:todo-list` | in-repo | 10 | 61 | the files named in the script header |
| `lessons` | in-repo | 26 | 172 | checked-in schema.json (the live admin API was not read: no admin token here) |
| `acme` | private | 24 |  | present |
| `tirion` | private | 39 |  | present |
| `sentinel` | private | 24 |  | present |

## The kinds

| kind | a person's sentence | rows | `members-area` | `nightbook` | `planning` | `todo-list` | `lessons` | `acme` | `tirion` | `sentinel` |
|---|---|---|---|---|---|---|---|---|---|---|
| **belongs-to** | each {from} is attached to one {to} | 78 | 1 | · | 7 | 1 | 30 | 15 | 3 | 21 |
| **is-on** | a {from} is on a {to} for a while, with details of its own | 20 | 1 | · | · | · | 9 | 8 | 2 | · |
| **together** | a {from} and a {to} go together | 4 | · | · | · | · | · | · | · | 4 |
| **one-of** | a {from}'s {field} is one of a fixed list | 24 | · | · | · | · | · | 24 | · | · |
| **many-by-list** | a {from} carries a list of {to} on itself | 8 | · | · | · | · | · | · | 8 | · |
| **part-of-tree** (1) | a {from} can sit under another {from} | 1 | · | · | · | · | · | · | · | 1 |
| **exists-elsewhere** | a {from} also exists in another system, known there by its own id | 16 | · | · | · | · | · | 4 | 11 | 1 |
| **same-as** | two {from}s turned out to be one thing | 5 | · | · | · | · | · | 2 | 1 | 2 |
| **ends** | a {from} can end without being deleted | 13 | · | · | · | · | 6 | 4 | 3 | · |
| **happened-to** | something happened to a {from} at a time, and the record of it is kept | 44 | · | · | 1 | 2 | 14 | 14 | 11 | 2 |
| **owned-by** | a {from} is seen and changed by whoever it belongs to, and by nobody else unless said | 71 | 8 | · | 8 | 10 | · | 4 | 41 | · |
| **extends** | a {from} is extra detail about one {to}, at most one each | 11 | · | · | · | · | 2 | 1 | 1 | 7 |
| **by-name** | a {from} names its {to} by something a person could retype (an email, a code) | 6 | · | · | · | · | 6 | · | · | · |
| **points-at-one-of** | a {from} points at one thing that may be any of several kinds, and says which | 2 | · | · | · | · | 2 | · | · | · |

### belongs-to

*each {from} is attached to one {to}*

- **The question it asks:** Must every one have one, or can it stand alone? Can it move to another later? When the one it belongs to goes, does this go with it, stay orphaned, or block the removal?
- **Told apart from its neighbours by:** one target, no details on the link itself; read the other way it is 'has many' (the same edge)
- **Projects to (P104's tiles / the contract):** Link (Pointer) with required/optional and an on-delete rule; the reverse read is a query, not a column
- **Private rows, held outside the repo:** acme 15, tirion 3, sentinel 21
- **Evidence in this repo:**

  | row | → | found by | evidence |
  |---|---|---|---|
  | `lessons|Assignment.cohortId` | Cohort | column-id | `templates/digital-bricks-training/backend/schema.json:80` |
  | `lessons|Assignment.deliverableId` | LearnerDeliverable | column-id | `templates/digital-bricks-training/backend/schema.json:108` |
  | `lessons|Assignment.learnerId` | LearnerProfile | column-id | `templates/digital-bricks-training/backend/schema.json:76` |
  | `lessons|Assignment.programmeId` | Programme | column-id | `templates/digital-bricks-training/backend/schema.json:84` |
  | `lessons|CoachingSession.cohortId` | Cohort | column-id | `templates/digital-bricks-training/backend/schema.json:259` |
  | `lessons|CoachingSession.learnerId` | LearnerProfile | column-id | `templates/digital-bricks-training/backend/schema.json:255` |
  | `lessons|CoachingSession.programmeId` | Programme | column-id | `templates/digital-bricks-training/backend/schema.json:263` |
  | `lessons|CoachNote.learnerId` | LearnerProfile | column-id | `templates/digital-bricks-training/backend/schema.json:201` |
  | `lessons|CoachNote.sessionId` | CoachingSession | column-id | `templates/digital-bricks-training/backend/schema.json:213` |
  | `lessons|Conversation.learnerId` | LearnerProfile | column-id | `templates/digital-bricks-training/backend/schema.json:403` |
  | `lessons|ConversationMessage.authorUserId` | _User | column-id | `templates/digital-bricks-training/backend/schema.json:449` |
  | `lessons|ConversationMessage.conversationId` | Conversation | column-id | `templates/digital-bricks-training/backend/schema.json:441` |
  | `lessons|DimensionRating.dimensionId` | ProgrammeDimension | column-id | `templates/digital-bricks-training/backend/schema.json:509` |
  | `lessons|DimensionRating.evaluationId` | ProgrammeEvaluation | column-id | `templates/digital-bricks-training/backend/schema.json:517` |
  | `lessons|DimensionRating.sessionId` | CoachingSession | column-id | `templates/digital-bricks-training/backend/schema.json:513` |
  | `lessons|LearnerDeliverable.learnerId` | LearnerProfile | column-id | `templates/digital-bricks-training/backend/schema.json:542` |
  | `lessons|LearnerInvite.claimedByLearnerId` | ? | column-id | `templates/digital-bricks-training/backend/schema.json:598` |
  | `lessons|LearningPath.learnerId` | LearnerProfile | column-id | `templates/digital-bricks-training/backend/schema.json:667` |
  | `lessons|LearningPath.programmeId` | Programme | column-id | `templates/digital-bricks-training/backend/schema.json:671` |
  | `lessons|Lesson.conceptId` | Concept | column-id | `templates/digital-bricks-training/backend/schema.json:701` |
  | `lessons|Lesson.learnerId` | LearnerProfile | column-id | `templates/digital-bricks-training/backend/schema.json:697` |
  | `lessons|LessonDraft.conceptId` | Concept | column-id — unique with learnerId | `templates/digital-bricks-training/backend/schema.json:761` |
  | `lessons|LessonDraft.copiedFromLearnerId` | ? | column-id | `templates/digital-bricks-training/backend/schema.json:793` |
  | `lessons|LessonDraft.learnerId` | LearnerProfile | column-id — unique with conceptId | `templates/digital-bricks-training/backend/schema.json:757` |
  | `lessons|Programme.learnerId` | LearnerProfile | column-id | `templates/digital-bricks-training/backend/schema.json:862` |
  | `lessons|ProgrammeDimension.deliverableId` | LearnerDeliverable | column-id | `templates/digital-bricks-training/backend/schema.json:924` |
  | `lessons|ProgrammeDimension.programmeId` | Programme | column-id | `templates/digital-bricks-training/backend/schema.json:912` |
  | `lessons|ProgrammeEvaluation.programmeId` | Programme | column-id | `templates/digital-bricks-training/backend/schema.json:958` |
  | `lessons|SessionPrep.assignmentId` | Assignment | column-id | `templates/digital-bricks-training/backend/schema.json:1087` |
  | `lessons|SessionPrep.conceptId` | Concept | column-id | `templates/digital-bricks-training/backend/schema.json:1083` |
  | `template:members-area|MemberRequest.userId` | _User | prop-port | `templates/members-area/components/__cloud__/requestAccess/nodes.json:207` |
  | `template:planning|Block.projectId` | Project | prop-port ×3 | `templates/planning/components/Commands/Add block/nodes.json:325` |
  | `template:planning|Block.todoActionId` | ? | prop-port | `templates/planning/components/Commands/Add block/nodes.json:325` |
  | `template:planning|Block.todoTaskId` | ? | prop-port ×2 | `templates/planning/components/Commands/Add block/nodes.json:325` |
  | `template:planning|Event.taskId` | ? | prop-port ×3 | `templates/planning/components/Commands/Add block/nodes.json:379` |
  | `template:planning|MoneyItem.projectId` | Project | prop-port ×4 | `templates/planning/components/Commands/Add money item/nodes.json:314` |
  | `template:planning|PlanEvent.blockId` | Block | prop-port ×7 | `templates/planning/components/Commands/Add block/nodes.json:335` |
  | `template:planning|PlanEvent.projectId` | Project | prop-port ×10 | `templates/planning/components/Commands/Add block/nodes.json:335` |
  | `template:todo-list|Event.taskId` | Task | filter,prop-port ×2 | `templates/todo-list/components/Logic/Todo data/nodes.json:124` |

### is-on

*a {from} is on a {to} for a while, with details of its own*

- **The question it asks:** Can it be on two at once? Does it start and end (dates, active)? What stays and what goes when it ends? Which details belong to the link and not to either end (a role, a type, a position)?
- **Told apart from its neighbours by:** a junction record that carries details; a plain pairing with none is 'together'
- **Projects to (P104's tiles / the contract):** a collection of its own with two Links and the details as fields; never a Links (Relation) column, which cannot hold a date
- **Private rows, held outside the repo:** acme 8, tirion 2
- **Evidence in this repo:**

  | row | → | found by | evidence |
  |---|---|---|---|
  | `lessons|CohortMember.cohortId` | Cohort | column-id — unique with learnerId | `templates/digital-bricks-training/backend/schema.json:343` |
  | `lessons|CohortMember.learnerId` | LearnerProfile | column-id — unique with cohortId | `templates/digital-bricks-training/backend/schema.json:347` |
  | `lessons|DeliverableConcept.conceptId` | Concept | column-id — unique with deliverableId | `templates/digital-bricks-training/backend/schema.json:483` |
  | `lessons|DeliverableConcept.deliverableId` | LearnerDeliverable | column-id — unique with conceptId | `templates/digital-bricks-training/backend/schema.json:479` |
  | `lessons|PathStep.conceptId` | Concept | column-id | `templates/digital-bricks-training/backend/schema.json:828` |
  | `lessons|PathStep.pathId` | LearningPath | column-id | `templates/digital-bricks-training/backend/schema.json:820` |
  | `lessons|Progress.conceptId` | Concept | column-id — unique with learnerId | `templates/digital-bricks-training/backend/schema.json:1008` |
  | `lessons|Progress.learnerId` | LearnerProfile | column-id — unique with conceptId | `templates/digital-bricks-training/backend/schema.json:1004` |
  | `lessons|SessionPrep.sessionId` | CoachingSession | column-id | `templates/digital-bricks-training/backend/schema.json:1075` |
  | `template:members-area|Member.userId` | _User | prop-port,filter ×4 | `templates/members-area/components/__cloud__/claimAssociation/nodes.json:352` |

### together

*a {from} and a {to} go together*

- **The question it asks:** Does the pairing ever need a date, a reason, a role or an order? (Then it is 'is-on'.) Can the same pair be listed twice?
- **Told apart from its neighbours by:** a junction with no details
- **Projects to (P104's tiles / the contract):** Links (Relation) or a junction collection; the unique pair rule
- **Private rows, held outside the repo:** sentinel 4

### one-of

*a {from}'s {field} is one of a fixed list*

- **The question it asks:** Who may add to the list, and does adding need a developer? Is the list the same for everyone? Does a value ever retire (then it is a lifecycle, not a choice)? Will you ever need details about a list entry (then it is a collection)?
- **Told apart from its neighbours by:** a value from a declared list on the record itself, not a link to a record
- **Projects to (P104's tiles / the contract):** Choice (String + oneOf rule); the mutant is free text where a list belongs
- **Private rows, held outside the repo:** acme 24

### many-by-list

*a {from} carries a list of {to} on itself*

- **The question it asks:** Will you ever ask it the other way round ('which {from}s name this one')? Will the list need details per entry? If either, each entry is its own link.
- **Told apart from its neighbours by:** ids or values stored as an array column, no record per entry
- **Projects to (P104's tiles / the contract):** List (Array); the mutant is a list of ids that nobody can query from the other side
- **Private rows, held outside the repo:** tirion 8

### part-of-tree — one row only

*a {from} can sit under another {from}*

- **The question it asks:** How deep can it go? Can a thing be moved under another? Can it be its own ancestor? Does a child inherit anything from its parent?
- **Told apart from its neighbours by:** a link from a collection to itself
- **Projects to (P104's tiles / the contract):** a Link to the same collection; the path operation walks it (ONT-004)
- **Private rows, held outside the repo:** sentinel 1

### exists-elsewhere

*a {from} also exists in another system, known there by its own id*

- **The question it asks:** Can it exist here before it exists there, or there before here — and what is silently skipped when it does? Which side wins when they disagree? What is it called over there? What happens over there when it ends here?
- **Told apart from its neighbours by:** an id or a provenance record naming another system, not a record in this one
- **Projects to (P104's tiles / the contract):** a Text field per system, unique, plus a sync log; the enrolment note is this kind's unasked question
- **Private rows, held outside the repo:** acme 4, tirion 11, sentinel 1

### same-as

*two {from}s turned out to be one thing*

- **The question it asks:** How do you tell? Who decides when the system is not sure? Which record survives and which fields win? Can a merge be undone?
- **Told apart from its neighbours by:** a link between records of the same collection that means identity, not hierarchy
- **Projects to (P104's tiles / the contract):** a 'superseded by' Link on the same collection plus a match record; never a delete
- **Private rows, held outside the repo:** acme 2, tirion 1, sentinel 2

### ends

*a {from} can end without being deleted*

- **The question it asks:** When it ends, what stays and what goes — its record, its history, the things on it, its access elsewhere, the lists it is on? Can it come back, and does coming back make a new one or revive the old? Who may end it?
- **Told apart from its neighbours by:** a status, an active flag, an end date, an archive or erasure record — the record is kept
- **Projects to (P104's tiles / the contract):** a status Choice or a Date, a rule for each linked thing, and a 'delete: nobody' permission; the archive note is this kind's unasked question
- **Private rows, held outside the repo:** acme 4, tirion 3
- **Evidence in this repo:**

  | row | → | found by | evidence |
  |---|---|---|---|
  | `lessons|CoachingSession.cancelledAt` | (lifecycle) | timestamp-column | `templates/digital-bricks-training/backend/schema.json:287` |
  | `lessons|CohortMember.removedAt` | (lifecycle) | timestamp-column | `templates/digital-bricks-training/backend/schema.json:355` |
  | `lessons|LearnerDeliverable.archivedAt` | (lifecycle) | timestamp-column | `templates/digital-bricks-training/backend/schema.json:566` |
  | `lessons|PathStep.removedAt` | (lifecycle) | timestamp-column | `templates/digital-bricks-training/backend/schema.json:840` |
  | `lessons|Programme.archivedAt` | (lifecycle) | timestamp-column | `templates/digital-bricks-training/backend/schema.json:882` |
  | `lessons|ProgrammeDimension.archivedAt` | (lifecycle) | timestamp-column | `templates/digital-bricks-training/backend/schema.json:932` |

### happened-to

*something happened to a {from} at a time, and the record of it is kept*

- **The question it asks:** Is it kept forever? Can it be undone, and does undoing make a new record or remove this one? Who did it, and who may see the history? Does the thing it happened to need it to exist?
- **Told apart from its neighbours by:** a record that is an event about another record (a log, an action, an attendance, a submission, a read receipt)
- **Projects to (P104's tiles / the contract):** a collection with a Link, a Date and a 'who' Link; update and delete: nobody
- **Private rows, held outside the repo:** acme 14, tirion 11, sentinel 2
- **Evidence in this repo:**

  | row | → | found by | evidence |
  |---|---|---|---|
  | `lessons|ArtifactSubmission.conceptId` | Concept | column-id | `templates/digital-bricks-training/backend/schema.json:38` |
  | `lessons|ArtifactSubmission.deliverableId` | LearnerDeliverable | column-id | `templates/digital-bricks-training/backend/schema.json:46` |
  | `lessons|ArtifactSubmission.learnerId` | LearnerProfile | column-id | `templates/digital-bricks-training/backend/schema.json:18` |
  | `lessons|ArtifactSubmission.sectionId` | ? | column-id | `templates/digital-bricks-training/backend/schema.json:42` |
  | `lessons|AssignmentSubmission.assignmentId` | Assignment | column-id | `templates/digital-bricks-training/backend/schema.json:167` |
  | `lessons|AssignmentSubmission.learnerId` | LearnerProfile | column-id | `templates/digital-bricks-training/backend/schema.json:143` |
  | `lessons|CoachNote.editedAt` | (lifecycle) | timestamp-column | `templates/digital-bricks-training/backend/schema.json:229` |
  | `lessons|ConversationMessage.readAt` | (lifecycle) | timestamp-column | `templates/digital-bricks-training/backend/schema.json:457` |
  | `lessons|LearnerInvite.claimedAt` | (lifecycle) | timestamp-column | `templates/digital-bricks-training/backend/schema.json:602` |
  | `lessons|ProgrammeEvaluation.completedAt` | (lifecycle) | timestamp-column | `templates/digital-bricks-training/backend/schema.json:970` |
  | `lessons|Progress.completedAt` | (lifecycle) | timestamp-column | `templates/digital-bricks-training/backend/schema.json:1020` |
  | `lessons|Signal.conceptId` | Concept | column-id | `templates/digital-bricks-training/backend/schema.json:1131` |
  | `lessons|Signal.learnerId` | LearnerProfile | column-id | `templates/digital-bricks-training/backend/schema.json:1127` |
  | `lessons|Signal.sectionId` | ? | column-id | `templates/digital-bricks-training/backend/schema.json:1135` |
  | `template:planning|MoneyMark.itemId` | MoneyItem | prop-port ×2 | `templates/planning/components/Commands/Add mark/nodes.json:274` |
  | `template:todo-list|Action.taskId` | Task | prop-port | `templates/todo-list/components/Commands/Add action/nodes.json:135` |
  | `template:todo-list|RoutineCheck.routineId` | Routine | prop-port | `templates/todo-list/components/Commands/Tick routine/nodes.json:135` |

### owned-by

*a {from} is seen and changed by whoever it belongs to, and by nobody else unless said*

- **The question it asks:** Who else may see it — a role, an admin of the thing it sits on, everyone? Does ownership follow a path (the holder of the account the person is on)? What happens to it when its owner ends?
- **Told apart from its neighbours by:** a rule about visibility, not a fact about the world: creator-owns, an access list, a tenant, an admin link
- **Projects to (P104's tiles / the contract):** the security file's permissions and creatorOwns; a path-shaped rule needs ONT-004
- **Private rows, held outside the repo:** acme 4, tirion 41
- **Evidence in this repo:**

  | row | → | found by | evidence |
  |---|---|---|---|
  | `template:members-area|Announcement.acl-admin` | role | acl-target — role admin | `templates/members-area/components/Pages/Post/nodes.json:779` |
  | `template:members-area|Announcement.acl-member` | role | acl-target — role member | `templates/members-area/components/Pages/Post/nodes.json:779` |
  | `template:members-area|Association.acl-admin` | role | acl-target — role admin | `templates/members-area/components/__cloud__/claimAssociation/nodes.json:235` |
  | `template:members-area|Association.acl-world` | everyone | acl-target — role ? | `templates/members-area/components/__cloud__/claimAssociation/nodes.json:235` |
  | `template:members-area|Meeting.acl-admin` | role | acl-target — role admin | `templates/members-area/components/Pages/Post/nodes.json:807` |
  | `template:members-area|Meeting.acl-member` | role | acl-target — role member | `templates/members-area/components/Pages/Post/nodes.json:807` |
  | `template:members-area|Member.acl-admin` | role | acl-target ×2 — role admin | `templates/members-area/components/__cloud__/claimAssociation/nodes.json:352` |
  | `template:members-area|MemberRequest.acl-admin` | role | acl-target — role admin | `templates/members-area/components/__cloud__/requestAccess/nodes.json:207` |
  | `template:planning|BalanceReading.creatorOwns` | _User | security-creatorOwns | `templates/planning/nodegx.security.json:65` |
  | `template:planning|Block.creatorOwns` | _User | security-creatorOwns | `templates/planning/nodegx.security.json:25` |
  | `template:planning|MoneyItem.creatorOwns` | _User | security-creatorOwns | `templates/planning/nodegx.security.json:45` |
  | `template:planning|MoneyMark.creatorOwns` | _User | security-creatorOwns | `templates/planning/nodegx.security.json:55` |
  | `template:planning|MonthPlan.creatorOwns` | _User | security-creatorOwns | `templates/planning/nodegx.security.json:35` |
  | `template:planning|PlanEvent.creatorOwns` | _User | security-creatorOwns | `templates/planning/nodegx.security.json:85` |
  | `template:planning|Project.creatorOwns` | _User | security-creatorOwns | `templates/planning/nodegx.security.json:15` |
  | `template:planning|Settings.creatorOwns` | _User | security-creatorOwns | `templates/planning/nodegx.security.json:75` |
  | `template:todo-list|Action.creatorOwns` | _User | security-creatorOwns | `templates/todo-list/nodegx.security.json:25` |
  | `template:todo-list|BalanceReading.creatorOwns` | _User | security-creatorOwns | `templates/todo-list/nodegx.security.json:95` |
  | `template:todo-list|Event.creatorOwns` | _User | security-creatorOwns | `templates/todo-list/nodegx.security.json:35` |
  | `template:todo-list|MoneyItem.creatorOwns` | _User | security-creatorOwns | `templates/todo-list/nodegx.security.json:75` |
  | `template:todo-list|MoneyMark.creatorOwns` | _User | security-creatorOwns | `templates/todo-list/nodegx.security.json:85` |
  | `template:todo-list|Project.creatorOwns` | _User | security-creatorOwns | `templates/todo-list/nodegx.security.json:65` |
  | `template:todo-list|PushSubscription.creatorOwns` | _User | security-creatorOwns | `templates/todo-list/nodegx.security.json:105` |
  | `template:todo-list|Routine.creatorOwns` | _User | security-creatorOwns | `templates/todo-list/nodegx.security.json:45` |
  | `template:todo-list|RoutineCheck.creatorOwns` | _User | security-creatorOwns | `templates/todo-list/nodegx.security.json:55` |
  | `template:todo-list|Task.creatorOwns` | _User | security-creatorOwns | `templates/todo-list/nodegx.security.json:15` |

### extends

*a {from} is extra detail about one {to}, at most one each*

- **The question it asks:** Is there ever more than one? Does it exist without the thing it extends? Is it computed (then nobody edits it) or written by a person?
- **Told apart from its neighbours by:** a one-to-one link, usually unique or the record's own key
- **Projects to (P104's tiles / the contract):** a Link with a unique rule; or fields on the thing itself when it is small
- **Private rows, held outside the repo:** acme 1, tirion 1, sentinel 7
- **Evidence in this repo:**

  | row | → | found by | evidence |
  |---|---|---|---|
  | `lessons|LearnerProfile.userId` | _User | column-id-unique — one per target | `templates/digital-bricks-training/backend/schema.json:636` |
  | `lessons|ProjectContext.learnerId` | LearnerProfile | column-id-unique — one per target | `templates/digital-bricks-training/backend/schema.json:1038` |

### by-name

*a {from} names its {to} by something a person could retype (an email, a code)*

- **The question it asks:** What if it is misspelled, or changes, or two things share it? Should it be a link instead?
- **Told apart from its neighbours by:** a natural key stored as text where a Link would be
- **Projects to (P104's tiles / the contract):** a Link; the mutant is the text itself
- **Evidence in this repo:**

  | row | → | found by | evidence |
  |---|---|---|---|
  | `lessons|CoachingSession.createdByEmail` | _User | column-by-email | `templates/digital-bricks-training/backend/schema.json:291` |
  | `lessons|CoachNote.authorEmail` | _User | column-by-email | `templates/digital-bricks-training/backend/schema.json:205` |
  | `lessons|LearnerInvite.createdByEmail` | _User | column-by-email | `templates/digital-bricks-training/backend/schema.json:610` |
  | `lessons|LearnerProfile.coachEmail` | _User | column-by-email | `templates/digital-bricks-training/backend/schema.json:640` |
  | `lessons|LessonDraft.updatedByEmail` | _User | column-by-email | `templates/digital-bricks-training/backend/schema.json:797` |
  | `lessons|Programme.createdByEmail` | _User | column-by-email | `templates/digital-bricks-training/backend/schema.json:886` |

### points-at-one-of

*a {from} points at one thing that may be any of several kinds, and says which*

- **The question it asks:** Which kinds can it point at, exactly? What happens when the thing it points at goes? Can it be re-pointed?
- **Told apart from its neighbours by:** an id beside a kind field; no single target collection
- **Projects to (P104's tiles / the contract):** a kind Choice plus a Text id; the mutant is an id with no kind beside it
- **Evidence in this repo:**

  | row | → | found by | evidence |
  |---|---|---|---|
  | `lessons|CoachNote.anchorId` | (one of several, named by anchorKind) | polymorphic-pair | `templates/digital-bricks-training/backend/schema.json:221` |
  | `lessons|Conversation.anchorId` | (one of several, named by anchorKind) | polymorphic-pair | `templates/digital-bricks-training/backend/schema.json:411` |

## The three notes, read as answers (ONT-000 step 3)

| note | kind | the question it answers, in general words |
|---|---|---|
| the archive note (what stays, what ends when a person is archived) | **ends** | When a person stops, what stays and what goes — their record and its history, the account they are on, their access to the things elsewhere, the lists they are on? Can they come back, and is that the old record revived or a new one? |
| the enrolment note (enrolment elsewhere silently skipped) | **exists-elsewhere** | Can a person be added here before they exist over there — and if they can, what is silently skipped, and how would anyone notice? |
| the incident report (a paying member invisible for an unknown period; the remediation that made a person without the links) | **is-on** | What must be linked for a thing to count as what you call it — is a person with no link to an account a member, or just a contact? When something arrives from elsewhere, which links must be made for it to count? |

## The depth number (ONT-000 step 4)

| source | deepest path (hops) | how it was counted | the sentence it stands for |
|---|---|---|---|
| `template:members-area` | 1 | a Query Records filter names one field of the collection it queries | the members of one association, by the person signed in |
| `template:nightbook` | 1 | a Query Records filter names one field of the collection it queries | one page, by its id |
| `template:planning` | 1 | a Query Records filter names one field of the collection it queries | the blocks of one project |
| `template:todo-list` | 1 | a Query Records filter names one field of the collection it queries | the history of one task |
| `lessons` | n/a | a schema carries no path |  |
| `acme` | 5 (219 paths, 108 distinct, 546 literals not resolvable to a relation) | dotted path, every hop a harvested relation field | the company each person who attended a session works for (attendance → the attendee row → the person → their employment → the company); the account-holder rule, used eight times, is four hops (person-on-account → account → company → its admins → the person asking) |
| `tirion` | 4 | JOINs in one statement | for each person: the editions they registered for, how many sessions they attended and what they paid (registration → edition, attendance, transaction, joined per person) |
| `sentinel` | 2 | attribute chain over relationship names | the portfolio a question's segment family belongs to |

## Richard's list (ONT-000 step 5, oral)

**Status: not yet taken down — ONT-000 step 5 needs Richard in conversation.** Taken down in conversation, not read off a file; marked oral.

