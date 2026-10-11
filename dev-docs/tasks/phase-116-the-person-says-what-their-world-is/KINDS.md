# The relation kinds, read off the apps on this machine

**Counts are about these 8 sources and no others** (ONT-000 §5): `template:members-area`, `template:nightbook`, `template:planning`, `template:todo-list`, `lessons`, `acme`, `tirion`, `sentinel`. Generated 2026-10-11 by `scripts/ontology/census.js` — do not edit by hand; edit `kinds.hand.json` and regenerate. Every source was present.

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
| **settled** | a {from} is agreed at some point, and after that it stays as it was agreed | 8 | · | 1 | 1 | · | 4 | · | 2 | · |

### belongs-to

*each {from} is attached to one {to}*

- **The question it asks:** Must every one have one, or can it stand alone? Could it ever be attached to several at once, now or later (then it is 'is-on', and changing your mind after real data exists is a migration)? Can it move to another later? When the one it belongs to goes, does this go with it, stay orphaned, or block the removal?
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

- **The question it asks:** Will you ever ask it the other way round ('which {from}s name this one')? Will the list grow to dozens? Will the list need details per entry? If any, each entry is its own link — a parent carrying dozens of list entries is the query that falls apart.
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

- **The question it asks:** When it ends, what stays and what goes — its record, its history, the things on it, its access elsewhere, the lists it is on? Can it come back, and does coming back make a new one or revive the old? Who may end it? When it ends, is a note or a reason written with it — which detail, and must it be there?
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

- **The question it asks:** Is there ever more than one? Does it exist without the thing it extends? Is it computed (then nobody edits it) or written by a person? Which of its fields will you filter or sort the main thing by — those stay on the main thing, or every such query goes through the extension and you end up copying the field back by hand.
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

### settled

*a {from} is agreed at some point, and after that it stays as it was agreed*

- **The question it asks:** Who agrees it, and what is it called when they do (issued, sent, sealed, published)? After that, which of its details may still change? To put a mistake right, is it withdrawn, or replaced by a new one that says which it replaces? May a draft be thrown away, and may an agreed one ever be deleted?
- **Told apart from its neighbours by:** a draft that becomes agreed (issued, sent, sealed, published) and is then frozen while still in force; 'ends' keeps a record that stopped, 'happened-to' was never editable
- **Projects to (P104's tiles / the contract):** a status Choice (draft / agreed / withdrawn), an agreed-at Date and an 'amends' Link to itself; the moves and the freeze kept inside the write (onlyWhile), and no deleting an agreed one if said
- **Private rows, held outside the repo:** tirion 2
- **Evidence in this repo:**

  | row | → | found by | evidence |
  |---|---|---|---|
  | `lessons|ArtifactSubmission.attempt@settled` | (its own status) | new-record-amends — a new attempt is a new record and the old one stays (unique with learner, concept and section): amend by a new record | `templates/digital-bricks-training/backend/schema.json:22` |
  | `lessons|Assignment.status@settled` | (its own status) | status-values-not-read — draft / issued / withdrawn, Frappe's draft / submitted / cancelled under other words | `templates/digital-bricks-training/backend/schema.json:112` |
  | `lessons|AssignmentSubmission.attempt@settled` | (its own status) | new-record-amends — a new attempt is a new record and the old one stays: amend by a new record | `templates/digital-bricks-training/backend/schema.json:147` |
  | `lessons|LessonDraft.publishedVersion@settled` | (its own status) | settled-field — a draft kept beside the version that was published | `templates/digital-bricks-training/backend/schema.json:789` |
  | `template:nightbook|Envelope.sealed@settled` | (its own status) | settled-field — sealed until a day; sealEnvelope refuses a day that is not still to come | `templates/nightbook/components/__cloud__/sealEnvelope/nodes.json:177` |
  | `template:planning|MoneyMark.sentOn@settled` | (its own status) | settled-field — a bill that is sent, then paid or lost; whether its amount may change after it is sent is the unasked question | `templates/planning/components/Commands/Add mark/nodes.json:274` |

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

**Status: taken down 2026-10-08 (s1), in Richard's words; each row names the kind it is a mutant of — ONT-005's seed.** 

Richard: "a lot of the mistakes were about query efficacy … that mistake gets repeated until you have a DB of patchwork solutions and duplicate data." The mutant that produces the patchwork is a question not asked before real data existed; every row below was fine on day one.

| the mistake, in his words | mutant of kind | why that kind |
|---|---|---|
| making a string field when it should have been a relation, to make product categories | **one-of** | a fixed list typed as free text; when categories need details or ordering it is a 'belongs-to' to a category record |
| designing appointment systems with on and off days, breaks, public holidays all taken into consideration when showing the available time slots, and keeping it free of race conditions | **is-on** | a booking is a person on a slot at a time; without a unique-pair rule in time two people land on one slot — the availability calendar is the question 'what can it be on, and when' |
| piling all the profile fields directly into the user table thinking there's only a few, when later the profiles needed a dozen fields and some users only use half of them | **extends** | extra detail folded into the thing it extends |
| making relation fields where the parent record has dozens of relations, and later needing a nested query of relation objects to find the right parent — the query falls apart | **many-by-list** | a list on the parent that nobody can query from the other side |
| putting a field inside the profile table that is later used very often to filter users and should have been in the user table from the start; too late once users have profile relations, so a nested relation query, and it sucks | **extends** | the field you filter or sort the main thing by was split off into the extension |
| making a one-to-many thinking 'this user only belongs to one company', then realising they can belong to several — but the field exists and real data is in it | **belongs-to** | a 'belongs-to' that was an 'is-on'; the question 'could it ever be several at once' was not asked before data existed |
| wanting to order users by the profile's last-updated date and having to choose between a nested query and a copied 'profile_updated' field on user kept in sync by hand — repeated until the DB is patchwork and duplicate data | **extends** | a derived field copied onto the parent and maintained by hand; the sort key belongs on the thing sorted, or the query goes through the path operation (ONT-004) |

## What Frappe asks (ONT-011 step 1)

Not kinds. Four things a Frappe DocType says about a kind of record, looked for in the same sources by the detectors in `census.js` and each candidate classified by meaning: **yes**, **no** (a word that matched with another meaning) or **neighbour** (next door, and step 2 decides where it goes). Step 2 makes a borrow part of the vocabulary only if it keeps rows here. 

**The detectors' reach, in (collection, field) pairs read:** `members-area` 37, `nightbook` 60, `planning` 265, `todo-list` 61, `lessons` 153, `acme` 133, `tirion` 414, `sentinel` 199. A template's fields are the ones its record nodes write or filter on; acme's are the field definitions in its schema scripts (the CMS's own UI-made fields are not read); tirion's the columns of its `CREATE TABLE` and `ADD COLUMN` statements; sentinel's the `Column(` lines of its models.

| borrow | a person's sentence | rows kept | `members-area` | `nightbook` | `planning` | `todo-list` | `lessons` | `acme` | `tirion` | `sentinel` |
|---|---|---|---|---|---|---|---|---|---|---|
| **secret** | Some details on a record are not for everyone who can see the record, and the system asked me which ones before anyone could read them. | 16 | 1 | 3 | · | · | · | 8 | 4 | · |
| **settled** | Once something is agreed, it stays as it was agreed. To change it I withdraw it or make a new one that says which one it replaces, and the old one is still there. | 8 | · | 1 | 1 | · | 4 | · | 2 | · |
| **facts** | The system asked whether there is only one of something, whether people read its number aloud, what I call one in a list, and whether I need to know who changed what. | 55 | 6 | 1 | 4 | 3 | 15 | 9 | 8 | 9 |
| **sometimes** | A detail that only matters in some cases is asked for in those cases, and never left empty when it mattered. | 9 | · | · | 2 | 2 | 3 | 2 | · | · |

### secret

*Some details on a record are not for everyone who can see the record, and the system asked me which ones before anyone could read them.*

- **The question it asks:** Is any detail on it not for everyone who can see it? Who may read that detail?

  | family | yes | no | neighbour | yes per source |
  |---|---|---|---|---|
  | secret | 16 | 3 | 7 | members-area 1, nightbook 3, acme 8, tirion 4 |

  In this repo:

  | candidate | found by | verdict | evidence |
  |---|---|---|---|
  | `lessons|CoachNote.visibility@secret` | hand — 'internal' hides the note from the learner (tools/check-read-functions.mjs) | **neighbour**: the whole note is hidden from the learner by a value on it, enforced by the read functions; a rule on a value, not a secret field | `templates/digital-bricks-training/backend/schema.json:225` |
  | `template:members-area|Member.token@secret` | secret-name — read by "role:admin" | **no**: the unsubscribe query's parameter name (its filter's input), not a field on Member | `templates/members-area/components/__cloud__/unsubscribe/nodes.json:57` |
  | `template:members-area|Member.unsubscribeToken@secret` | secret-name — read by "role:admin" | **yes**: every admin who can list members reads every member's unsubscribe token, and the rest of the member is theirs to read | `templates/members-area/components/__cloud__/claimAssociation/nodes.json:352` |
  | `template:nightbook|Profile.answerV@secret` | secret-name — read by "public" | **yes**: a salted verifier on a profile anyone may read; known and deliberate until V1-8 (TPL-011) | `templates/nightbook/components/__cloud__/saveProfile/nodes.json:235` |
  | `template:nightbook|Profile.codeV@secret` | secret-name — read by "public" | **yes**: a salted verifier on a profile anyone may read; known and deliberate until V1-8 (TPL-011) | `templates/nightbook/components/__cloud__/saveProfile/nodes.json:235` |
  | `template:nightbook|Profile.rescueV@secret` | secret-name — read by "public" | **yes**: a salted verifier on a profile anyone may read; known and deliberate until V1-8 (TPL-011) | `templates/nightbook/components/__cloud__/saveProfile/nodes.json:235` |

### settled

*Once something is agreed, it stays as it was agreed. To change it I withdraw it or make a new one that says which one it replaces, and the old one is still there.*

- **The question it asks:** Does it get agreed, signed, sent or published at some point? After that, may it still change, and how is a mistake in it put right?

  | family | yes | no | neighbour | yes per source |
  |---|---|---|---|---|
  | settled | 8 | 12 | 4 | nightbook 1, planning 1, lessons 4, tirion 2 |

  In this repo:

  | candidate | found by | verdict | evidence |
  |---|---|---|---|
  | `lessons|ArtifactSubmission.attempt@settled` | new-record-amends | **yes**: a new attempt is a new record and the old one stays (unique with learner, concept and section): amend by a new record | `templates/digital-bricks-training/backend/schema.json:22` |
  | `lessons|ArtifactSubmission.submittedAt@settled` | settled-field | **neighbour**: when it was handed in; the record is counted on `attempt`, and the coach's `evaluation` is written onto it afterwards, which answers 'may anything still change?' | `templates/digital-bricks-training/backend/schema.json:26` |
  | `lessons|Assignment.status@settled` | status-values-not-read | **yes**: draft / issued / withdrawn, Frappe's draft / submitted / cancelled under other words | `templates/digital-bricks-training/backend/schema.json:112` |
  | `lessons|AssignmentSubmission.attempt@settled` | new-record-amends | **yes**: a new attempt is a new record and the old one stays: amend by a new record | `templates/digital-bricks-training/backend/schema.json:147` |
  | `lessons|AssignmentSubmission.submittedAt@settled` | settled-field | **neighbour**: when it was handed in; counted on `attempt`; `evaluation` is written onto it afterwards | `templates/digital-bricks-training/backend/schema.json:151` |
  | `lessons|LearnerInvite.status@settled` | status-values-not-read | **no**: an invite that is claimed is used up (`ends`), not agreed | `templates/digital-bricks-training/backend/schema.json:606` |
  | `lessons|LessonDraft.publishedVersion@settled` | settled-field | **yes**: a draft kept beside the version that was published | `templates/digital-bricks-training/backend/schema.json:789` |
  | `lessons|PathStep.status@settled` | status-values-not-read | **no**: locked / available / complete; 'locked' means not yet available, not frozen | `templates/digital-bricks-training/backend/schema.json:832` |
  | `lessons|Programme.status@settled` | status-values-not-read | **no**: active / closed: an end, not an agreement | `templates/digital-bricks-training/backend/schema.json:870` |
  | `template:members-area|Announcement.postedAt@settled` | settled-field | **no**: when it was posted; an admin may still edit it, and nothing says otherwise | `templates/members-area/components/Pages/Post/nodes.json:779` |
  | `template:nightbook|Envelope.sealed@settled` | settled-field | **yes**: sealed until a day; sealEnvelope refuses a day that is not still to come | `templates/nightbook/components/__cloud__/sealEnvelope/nodes.json:177` |
  | `template:planning|MoneyMark.sentOn@settled` | settled-field | **yes**: a bill that is sent, then paid or lost; whether its amount may change after it is sent is the unasked question | `templates/planning/components/Commands/Add mark/nodes.json:274` |
  | `template:planning|Task.openStatus@settled` | status-values-not-read | **no**: a query parameter that asks for open tasks, not a field | `templates/planning/components/Logic/Planning data/nodes.json:555` |
  | `template:planning|Task.status@settled` | status-values-not-read | **no**: the todo list's open / done, written from the planning app: finished, not agreed | `templates/planning/components/Commands/Send to todo/nodes.json:168` |
  | `template:todo-list|Routine.status@settled` | status-values-not-read | **no**: running / stopped: an end (`ends`), not an agreement | `templates/todo-list/components/Commands/Add routine/nodes.json:121` |
  | `template:todo-list|Task.status@settled` | status-values-not-read | **no**: open / done: finished, not agreed | `templates/todo-list/components/Commands/Add task/nodes.json:128` |

### facts

*The system asked whether there is only one of something, whether people read its number aloud, what I call one in a list, and whether I need to know who changed what.*

- **The question it asks:** Is there only one of it? Do people read its number aloud? What do you call one in a list? Do you need to know who changed what?

  | family | yes | no | neighbour | yes per source |
  |---|---|---|---|---|
  | only-one — there is only one | 2 | 1 | 1 | members-area 1, planning 1 |
  | read-aloud — people read its number aloud | 1 | 1 | 3 | sentinel 1 |
  | called-by — what you call one in a list | 47 | 1 | 1 | members-area 5, nightbook 1, planning 3, todo-list 3, lessons 13, acme 8, tirion 6, sentinel 8 |
  | who-changed — who changed what | 5 | 2 | 10 | lessons 2, acme 1, tirion 2 |

  In this repo:

  | candidate | found by | verdict | evidence |
  |---|---|---|---|
  | `lessons|ArtifactSubmission.attempt@read-aloud` | number-name | **neighbour**: counted per learner and concept ('attempt 2'), not a number that names the record | `templates/digital-bricks-training/backend/schema.json:22` |
  | `lessons|Assignment.title@called-by` | title-field | **yes**: what one is called in a list | `templates/digital-bricks-training/backend/schema.json:88` |
  | `lessons|AssignmentSubmission.attempt@read-aloud` | number-name | **neighbour**: counted per learner and assignment, not a number that names the record | `templates/digital-bricks-training/backend/schema.json:147` |
  | `lessons|CoachingSession.title@called-by` | title-field | **yes**: what one is called in a list | `templates/digital-bricks-training/backend/schema.json:267` |
  | `lessons|CoachNote.editedAt@who-changed` | last-editor | **yes**: keeps that it was edited, not what changed or who changed it | `templates/digital-bricks-training/backend/schema.json:229` |
  | `lessons|Cohort.isDefault@only-one` | default-flag | **neighbour**: one of many cohorts marked as the default, not a collection of one | `templates/digital-bricks-training/backend/schema.json:326` |
  | `lessons|Cohort.name@called-by` | title-field | **yes**: what one is called in a list | `templates/digital-bricks-training/backend/schema.json:322` |
  | `lessons|CohortMember.displayName@called-by` | title-field | **yes**: what one is called in a list | `templates/digital-bricks-training/backend/schema.json:351` |
  | `lessons|Concept.title@called-by` | title-field | **yes**: what one is called in a list | `templates/digital-bricks-training/backend/schema.json:382` |
  | `lessons|Conversation.subject@called-by` | title-field | **yes**: what one is called in a list | `templates/digital-bricks-training/backend/schema.json:415` |
  | `lessons|LearnerDeliverable.slug@read-aloud` | number-name | **neighbour**: a name people type, not a number | `templates/digital-bricks-training/backend/schema.json:546` |
  | `lessons|LearnerDeliverable.title@called-by` | title-field | **yes**: what one is called in a list | `templates/digital-bricks-training/backend/schema.json:550` |
  | `lessons|LearnerInvite.label@called-by` | title-field | **yes**: what one is called in a list | `templates/digital-bricks-training/backend/schema.json:594` |
  | `lessons|Lesson.conceptVersion@who-changed` | version-field | **neighbour**: which version of another thing the lesson was built from: provenance, not a history of changes | `templates/digital-bricks-training/backend/schema.json:717` |
  | `lessons|Lesson.generationVersion@who-changed` | version-field | **neighbour**: which version of another thing the lesson was built from: provenance, not a history of changes | `templates/digital-bricks-training/backend/schema.json:725` |
  | `lessons|Lesson.projectContextVersion@who-changed` | version-field | **neighbour**: which version of another thing the lesson was built from: provenance, not a history of changes | `templates/digital-bricks-training/backend/schema.json:721` |
  | `lessons|Lesson.title@called-by` | title-field | **yes**: what one is called in a list | `templates/digital-bricks-training/backend/schema.json:705` |
  | `lessons|LessonDraft.publishedVersion@who-changed` | version-field | **no**: the version that was published, counted under settled | `templates/digital-bricks-training/backend/schema.json:789` |
  | `lessons|LessonDraft.title@called-by` | title-field | **yes**: what one is called in a list | `templates/digital-bricks-training/backend/schema.json:765` |
  | `lessons|LessonDraft.updatedByEmail@who-changed` | last-editor | **yes**: the last person to touch the draft, not what they changed | `templates/digital-bricks-training/backend/schema.json:797` |
  | `lessons|LessonDraft.version@who-changed` | version-field | **neighbour**: a counter of the draft's saves, not who changed what | `templates/digital-bricks-training/backend/schema.json:785` |
  | `lessons|Programme.title@called-by` | title-field | **yes**: what one is called in a list | `templates/digital-bricks-training/backend/schema.json:866` |
  | `lessons|ProgrammeDimension.label@called-by` | title-field | **yes**: what one is called in a list | `templates/digital-bricks-training/backend/schema.json:916` |
  | `lessons|ProjectContext.version@who-changed` | version-field | **neighbour**: a counter that Lesson.projectContextVersion reads: provenance | `templates/digital-bricks-training/backend/schema.json:1054` |
  | `lessons|SessionPrep.resourceLabel@called-by` | title-field | **yes**: what one is called in a list | `templates/digital-bricks-training/backend/schema.json:1091` |
  | `template:members-area|Announcement.title@called-by` | title-field | **yes**: what one is called in a list | `templates/members-area/components/Pages/Post/nodes.json:779` |
  | `template:members-area|Association.(collection)@only-one` | hand — claimAssociation refuses unless the association is still unclaimed | **yes**: one association per app; claimAssociation makes it only while none exists | `templates/members-area/components/__cloud__/claimAssociation/nodes.json:70` |
  | `template:members-area|Association.name@called-by` | title-field | **yes**: what one is called in a list | `templates/members-area/components/__cloud__/claimAssociation/nodes.json:235` |
  | `template:members-area|Meeting.title@called-by` | title-field | **yes**: what one is called in a list | `templates/members-area/components/Pages/Post/nodes.json:807` |
  | `template:members-area|Member.name@called-by` | title-field | **yes**: what one is called in a list | `templates/members-area/components/__cloud__/claimAssociation/nodes.json:352` |
  | `template:members-area|MemberRequest.name@called-by` | title-field | **yes**: what one is called in a list | `templates/members-area/components/__cloud__/requestAccess/nodes.json:207` |
  | `template:nightbook|Profile.name@called-by` | title-field | **yes**: what one is called in a list | `templates/nightbook/components/__cloud__/saveProfile/nodes.json:235` |
  | `template:planning|MoneyItem.label@called-by` | title-field | **yes**: what one is called in a list | `templates/planning/components/Commands/Add money item/nodes.json:314` |
  | `template:planning|Project.name@called-by` | title-field | **yes**: what one is called in a list | `templates/planning/components/Commands/Add project/nodes.json:527` |
  | `template:planning|Settings.(collection)@only-one` | single-name | **yes**: a collection meant to hold one record per person (creatorOwns) | `templates/planning/nodegx.security.json:75` |
  | `template:planning|Task.title@called-by` | title-field | **yes**: what one is called in a list | `templates/planning/components/Commands/Send to todo/nodes.json:168` |
  | `template:todo-list|Action.title@called-by` | title-field | **yes**: what one is called in a list | `templates/todo-list/components/Commands/Add action/nodes.json:135` |
  | `template:todo-list|Routine.title@called-by` | title-field | **yes**: what one is called in a list | `templates/todo-list/components/Commands/Add routine/nodes.json:121` |
  | `template:todo-list|Task.title@called-by` | title-field | **yes**: what one is called in a list | `templates/todo-list/components/Commands/Add task/nodes.json:128` |

### sometimes

*A detail that only matters in some cases is asked for in those cases, and never left empty when it mattered.*

- **The question it asks:** Is any detail needed only in some cases? Which cases, and must it be filled then?

  | family | yes | no | neighbour | yes per source |
  |---|---|---|---|---|
  | sometimes | 9 | 2 | 5 | planning 2, todo-list 2, lessons 3, acme 2 |

  In this repo:

  | candidate | found by | verdict | evidence |
  |---|---|---|---|
  | `lessons|AssignmentSubmission.linkUrl@sometimes` | hand — submissionModes is Assignment's (schema.json:100); the lessons app refuses a link the brief does not ask for (its assignments service) | **yes**: allowed only when the assignment's submissionModes includes link, a case decided on another record | `templates/digital-bricks-training/backend/schema.json:159` |
  | `lessons|CoachingSession.cancelledAt@sometimes` | ending-without-a-reason | **yes**: a cancelled session is still shown to the learner, with no field for why: the unasked question | `templates/digital-bricks-training/backend/schema.json:287` |
  | `lessons|CohortMember.removedAt@sometimes` | ending-without-a-reason | **neighbour**: an end with no reason field and no reader of a reason found; the `ends` kind's question | `templates/digital-bricks-training/backend/schema.json:355` |
  | `lessons|LearnerDeliverable.archivedAt@sometimes` | ending-without-a-reason | **neighbour**: an end with no reason field and no reader of a reason found; the `ends` kind's question | `templates/digital-bricks-training/backend/schema.json:566` |
  | `lessons|PathStep.removedAt@sometimes` | ending-without-a-reason | **no**: a removed step leaves the path (the read filters it out) and is not shown again; nobody is owed a reason | `templates/digital-bricks-training/backend/schema.json:840` |
  | `lessons|Programme.archivedAt@sometimes` | ending-without-a-reason | **neighbour**: an end with no reason field and no reader of a reason found; the `ends` kind's question | `templates/digital-bricks-training/backend/schema.json:882` |
  | `lessons|ProgrammeDimension.archivedAt@sometimes` | ending-without-a-reason | **neighbour**: an end with no reason field and no reader of a reason found; the `ends` kind's question | `templates/digital-bricks-training/backend/schema.json:932` |
  | `lessons|SessionPrep.resourceUrl@sometimes` | one-or-the-other — or resourceStorageKey | **yes**: one or the other with resourceStorageKey, never both | `templates/digital-bricks-training/backend/schema.json:1095` |
  | `template:planning|MoneyMark.lostOn@sometimes` | ending-without-a-reason | **neighbour**: a lost bill with no reason field of its own; the mark's general `note` may hold one | `templates/planning/components/Commands/Add mark/nodes.json:274` |
  | `template:planning|Project.move@sometimes` | detail-group — with moveWorth, moveWhen, moveDue, moveStop | **yes**: moveWorth, moveWhen, moveDue and moveStop matter only when the project has a next move | `templates/planning/components/Commands/Add project/nodes.json:527` |
  | `template:planning|Task.closingNote@sometimes` | note-beside-lifecycle — beside closedAt | **yes**: a note that matters only once the task is closed | `templates/planning/components/Commands/Send to todo/nodes.json:168` |
  | `template:todo-list|Routine.stopNote@sometimes` | note-beside-lifecycle — beside stoppedAt | **yes**: a note that matters only once the routine stops | `templates/todo-list/components/Commands/Add routine/nodes.json:121` |
  | `template:todo-list|Task.closingNote@sometimes` | note-beside-lifecycle — beside closedAt | **yes**: a note that matters only once the task is closed | `templates/todo-list/components/Commands/Add task/nodes.json:128` |

