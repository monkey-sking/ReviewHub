# ReviewHub Platform Rebuild PRD

Date: 2026-04-03
Workstream: `feature/reviewhub-platform-rebuild`
Status: Draft for review
Risk level: High
Primary audience: product, design, frontend/platform, backend/integration, QA, operations

## 1. Executive Summary

ReviewHub will be rebuilt as a local-first multi-project decision workbench on top of a mature platform shell, while preserving the current local data model and audited action behavior.

The current custom front-end is not meeting its core job. It overloads the operator with too many competing surfaces, mixes summary/report/diagnostic material into the main path, and depends on a monolithic client script that is difficult to evolve safely. The rebuild should keep the valuable parts of the current system, especially local data sources, audited actions, and project context, but replace the current front-end shell with a platform that gives the team a faster, more maintainable UI foundation.

Recommended product direction:

- use a mature platform for the operator-facing shell
- keep ReviewHub as the local integration and action service
- split current monolithic dashboard aggregation into stable resource APIs
- preserve local-first behavior and direct compatibility with Operations artifacts

## 2. Product Context

### 2.1 Current Situation

Today ReviewHub reads live artifacts from `Operations`, merges queue, thread, issue, review, and project context into one local dashboard payload, and provides audited actions for queue items, threads, ops records, and project board tasks.

The current implementation has three structural problems:

1. The product surface is overloaded.
   The operator is asked to navigate multiple top-level work modes (`workboard`, `queue`, `projects`, `operations`, `pipeline`, `overview`) inside one shell before a clear default action path is established.
2. The UI shell is too custom and too entangled.
   A very large front-end script and a monolithic aggregated response make even simple product changes expensive and risky.
3. The service boundary is unclear.
   UI decisions, file reads, schema validation, workflow state, and derived summaries are coupled together instead of being exposed as stable resources.

### 2.2 Product Identity

ReviewHub is not a public dashboard, BI tool, generic PM tool, or filesystem browser.

ReviewHub is:

- a local-first internal operator workbench
- task-first, not report-first
- designed to answer what needs human judgment now and what should move next
- traceable back to real source artifacts when needed

## 3. Target User and Core Job

### 3.1 Primary User

One internal operator on one Mac, working across multiple projects and handling:

- content review
- distribution review
- operations follow-up
- blockers and next steps
- thread/reply decisions
- project progress handoff

### 3.2 Core Job To Be Done

When the operator opens ReviewHub, they should be able to:

1. see what needs a decision now
2. see what can move next without re-reading everything
3. see what is blocked and why
4. open just enough project context to act confidently
5. record the action in a way that is auditable and reversible where appropriate

## 4. Goals

### 4.1 Product Goals

- Replace the current front-end shell with a stable platform-based workbench.
- Preserve current local data sources and audited actions.
- Make the default entry actionable within one screen.
- Reduce cognitive overhead by narrowing top-level surfaces.
- Allow a small team to iterate on the product without rewriting large custom front-end code for every change.

### 4.2 Delivery Goals

- Define a platform-ready information architecture.
- Introduce stable, role-friendly APIs between data adapters and UI.
- Make implementation parallelizable across product, design, backend, platform/frontend, and QA.
- Keep the rollout local-first and reversible.

### 4.3 Success Criteria

Success for V1 rebuild means:

- a new operator can explain ReviewHub as “the place where I handle decisions and next steps across projects”
- the default screen is a workboard, not a summary wall or file browser
- queue items, blockers, and project progress can be handled without switching between multiple unrelated top-level modes
- audited actions still work for queue, thread, ops, and project items
- the team can add or revise views by changing platform configuration and small backend modules, not by editing a multi-thousand-line front-end script

## 5. Non-Goals

This rebuild will not, in V1:

- introduce public deployment
- add multi-user collaboration or permission management
- replace Operations as the source of truth
- redesign Operations workflows themselves
- turn ReviewHub into a general document browser
- migrate all markdown/file artifacts into a database immediately
- guarantee exact visual continuity with the current custom UI

## 6. Decision Summary and Recommended Approach

### 6.1 Options Considered

#### Option A: Keep current shell and simplify it

Pros:

- lowest short-term change set
- no platform migration work

Cons:

- preserves the weakest part of the system
- hard to make team execution efficient
- does not solve the underlying shell and API coupling problem

#### Option B: Mature platform shell plus local adapter service

Pros:

- fastest path to a more usable, maintainable operator experience
- lets the team move faster on list/detail/action patterns
- preserves local data and current audited behavior
- creates cleaner backend boundaries for future growth

Cons:

- requires API refactoring before the UI can stabilize
- platform choice introduces constraints

#### Option C: Full custom rebuild in a new front-end framework

Pros:

- maximum flexibility
- no platform constraints

Cons:

- highest implementation cost
- rebuilds UI infrastructure the team can instead buy/borrow from a mature platform
- slower path to usable product recovery

### 6.2 Recommendation

Choose Option B.

ReviewHub should be rebuilt as:

- a mature platform shell for operator UI
- a local Node-based integration service for data aggregation and actions
- a filesystem adapter layer that reads from `Operations`

This keeps the differentiated logic local while removing most of the custom front-end burden.

## 7. Platform Requirements

The selected mature platform must support the following before implementation begins:

- local-first or self-hostable deployment on the operator machine or controlled local environment
- custom REST/HTTP data sources
- custom list/detail views with filters and action buttons
- basic tab/page/navigation structure
- search and form controls in Chinese UI
- support for calling custom action endpoints with payloads
- the ability to hide advanced diagnostics behind secondary disclosure
- enough layout flexibility to support a task-first workboard instead of only CRUD tables

Nice-to-have:

- reusable page templates and components
- local authentication toggle or operator-only access controls
- embeddable custom components for unusual inspector sections
- environment-based configuration for local file/service roots

Platform selection is not locked by this PRD. The team should choose a platform only if it can satisfy the requirements above without forcing ReviewHub back into a dashboard-first product shape.

## 8. Product Scope

### 8.1 V1 Surfaces

V1 should ship with four primary surfaces:

1. `Workboard`
   Default surface. Unified lane-based board for `needs decision`, `can move`, `blocked`, and `watch`.
2. `Inbox`
   Queue-oriented content and execution handling surface.
3. `Issues`
   Blockers, follow-up records, feedback signals, and review exceptions that need human handling.
4. `Projects`
   Per-project view with two explicit layers:
   - `推进层`
   - `资料层`

### 8.2 Deferred Surface

`Automation` should not be a first-class primary surface in the first rebuild milestone unless user testing shows it is necessary for daily handling. Its content can initially appear as a secondary section inside `Issues` or project detail.

### 8.3 Detail Model

Every primary surface must support a detail pane or inspector with:

- short summary
- source context
- current status and action state
- recommended next action
- advanced diagnostics behind secondary disclosure
- action controls only where mutation is supported

## 9. Functional Requirements

### 9.1 Workboard

The Workboard must:

- open by default
- group items into at least `决策中`, `可推进`, `阻塞中`, and `观察中`
- show one primary sentence per item
- show project attribution, status tags, and urgency/risk cues
- allow selection of an item to open inspector context
- support search and project filter without leaving the page

The Workboard must not:

- lead with JSON, raw logs, or file paths
- feel like a report dashboard
- force the operator to understand source-system structure before acting

### 9.2 Inbox

The Inbox must:

- handle queue items that still require queue-level decisions
- support filtered handling by state, project, platform, and risk
- expose single-item and batch actions where they are safe
- automatically advance to the next relevant item after action where appropriate

Required actions:

- approve
- reject
- mark missing info
- mark ready
- defer
- restore auto

### 9.3 Issues

The Issues surface must:

- combine blocker records, review exceptions, feedback incidents, and handoff records needing human intervention
- present them as action-oriented records, not as logs
- allow defer/review/execute/done/restore-auto behaviors where supported
- make the reason for attention visible in one short summary sentence

### 9.4 Projects

The Projects surface must:

- show one project at a time or a concise project list leading to one project workspace
- keep `推进层` and `资料层` visually and conceptually separate
- allow stage movement and field edits for project-board items where permitted
- treat materials as support context, not the main work surface

### 9.5 Inspector and Detail

The inspector must:

- remain task-first
- summarize what changed, why it matters, and what action is available
- expose source artifacts, links, files, and raw payloads only after the summary
- support notes, actor, and defer-until controls only on mutation-capable records

### 9.6 Search and Filtering

Global or surface-level filters must cover:

- project
- action state
- status
- platform
- risk
- free-text search across title, notes, next step, blocker, and source summary

## 10. Backend and Data Requirements

### 10.1 Required Architecture Change

The current monolithic `GET /api/dashboard` response must be decomposed into stable domain resources.

Required service layers:

1. `filesystem adapters`
   Read `Operations` files and artifacts.
2. `domain services`
   Normalize queue, thread, issue, project, and activity records.
3. `resource APIs`
   Expose platform-friendly endpoints.
4. `action services`
   Handle audited mutations.

### 10.2 Required API Groups

The implementation must expose platform-friendly API groups such as:

- `GET /api/workboard`
- `GET /api/inbox`
- `GET /api/issues`
- `GET /api/projects`
- `GET /api/projects/:projectId`
- `GET /api/activity`
- `GET /api/diagnostics/:recordId`
- `POST /api/queue/:id/action`
- `POST /api/thread/:id/action`
- `POST /api/ops/:id/action`
- `POST /api/project-board/:id/action`

Exact endpoint names may vary, but the platform UI must not depend on a single all-purpose mega-payload.

### 10.3 Action Behavior

Existing audited action behavior must be preserved:

- queue actions can update `approval_registry.json` and `daily_channel_queue.json`
- thread actions append to thread action logs
- ops actions append to ops action logs
- project board actions update `PROJECT_KANBAN.md`

Requirements:

- all mutation endpoints return a stable response format
- all mutation endpoints return user-facing error messages plus structured details for debugging
- all mutation endpoints preserve append-only audit behavior where currently used
- all mutation endpoints remain local-first

### 10.4 Future Data Improvement

Not required for the first rebuild milestone, but strongly recommended after stabilization:

- add structured exports from `Operations` for project board, ops review, and project material index
- reduce UI reliance on markdown table parsing and filesystem scanning

## 11. Role-Based Execution Plan

### 11.1 Product Owner

Owner:
- define scope boundaries and success criteria
- protect the task-first identity
- approve surface priorities and scope cuts

Deliverables:
- finalized PRD
- approved surface list and non-goals
- final decision on whether `Automation` is primary or deferred
- prioritized backlog for V1 and post-V1

Done when:
- scope is explicit enough that design and engineering are not inventing product shape on their own

### 11.2 Design

Owner:
- translate the PRD into platform-ready interaction flows and page structures
- define card/list/detail behavior and information hierarchy
- reduce first-screen overload

Deliverables:
- navigation model
- workboard wireframe
- inbox wireframe
- issues wireframe
- project view wireframe
- inspector behavior spec
- action-state/tag system

Done when:
- every surface has a default summary view and a detail behavior
- diagnostics are intentionally de-emphasized
- `推进层` and `资料层` are clearly separated

### 11.3 Backend / Integration Engineering

Owner:
- refactor current ReviewHub aggregation into adapters, services, and resource APIs
- preserve audited actions and file compatibility with Operations

Deliverables:
- filesystem adapter layer
- resource-oriented API endpoints
- action endpoint normalization
- schema contracts for each API
- compatibility layer for existing local data files

Done when:
- platform UI can render all required V1 surfaces without depending on `GET /api/dashboard`
- mutation flows work end-to-end with stable responses
- direct filesystem assumptions are not embedded in the UI layer

### 11.4 Frontend / Platform Engineering

Owner:
- implement the operator-facing UI inside the selected mature platform
- bind platform components to the new resource APIs

Deliverables:
- platform application shell
- Workboard page
- Inbox page
- Issues page
- Projects page
- shared inspector/detail pattern
- action forms and post-action refresh behavior

Done when:
- an operator can complete the core daily handling path in the platform UI
- the old custom shell is no longer needed for primary usage

### 11.5 QA

Owner:
- verify each surface against product requirements and regression-sensitive action flows
- ensure the rebuild is usable, not just technically wired

Deliverables:
- acceptance checklist by surface
- regression checklist for queue/thread/ops/project actions
- error-state checklist for missing files, invalid schemas, and unavailable data
- test evidence for role handoff

Done when:
- the rebuilt product passes both requirement checks and targeted workflow checks
- known gaps are documented clearly by severity

### 11.6 Operations / Release Coordination

Owner:
- prepare local deployment/run instructions for the selected platform and adapter service
- keep rollout reversible and local-first

Deliverables:
- local setup guide
- environment/config requirements
- rollback procedure to previous ReviewHub shell if needed
- operator migration notes

Done when:
- the rebuilt workbench can be started locally in a repeatable way
- rollback is documented before full cutover

## 12. Delivery Phases

### Phase 0: Platform Selection and Technical Slice

Goals:
- choose the platform shell
- verify that one representative screen can be built without fighting the platform

Output:
- platform decision memo
- one thin proof-of-fit slice using real local data

Exit criteria:
- the team has evidence that the platform supports the required list/detail/action model

### Phase 1: Backend Boundary Refactor

Goals:
- split the monolithic dashboard contract
- expose stable APIs for the platform UI

Output:
- adapter layer
- resource APIs
- action API normalization

Exit criteria:
- all V1 data needed by the platform is available without `GET /api/dashboard`

### Phase 2: Core Operator Surfaces

Goals:
- ship Workboard, Inbox, Issues, and Projects in the mature platform

Output:
- working platform UI bound to live local data
- inspector flows
- primary mutation flows

Exit criteria:
- operator can handle a normal daily triage cycle in the new UI

### Phase 3: Stabilization and Cutover

Goals:
- verify usability
- close gaps
- move primary daily usage to the new shell

Output:
- bug fixes
- acceptance evidence
- rollback notes
- old shell deprecation plan

Exit criteria:
- new shell is the default path for daily use
- remaining old-shell usage is explicitly limited or retired

## 13. Acceptance Criteria

### 13.1 Product Acceptance

- The first screen answers what needs decision now, what can move next, and what is blocked.
- The product feels like one workbench, not stitched dashboards.
- Project materials are secondary until needed.
- Diagnostics are available but do not dominate the default experience.

### 13.2 Engineering Acceptance

- The platform UI uses stable resource APIs rather than one monolithic payload.
- All required audited actions remain functional.
- Local file compatibility with `Operations` is preserved.
- Error states are explicit and diagnosable.

### 13.3 UX Acceptance

- A user can move from list to detail to action without confusion.
- One item’s key state can be understood in a few seconds.
- The top-level navigation has no competing or redundant surfaces.

### 13.4 QA Acceptance

- Happy-path triage works for queue, issue, thread, and project flows.
- Known broken data states are handled gracefully.
- Regression checks exist for action persistence and state restoration.

## 14. Dependencies

- Access to the `Operations` repository and its current file layout
- Agreement on the selected mature platform
- A backend refactor owner for ReviewHub service boundaries
- Real local test data from current queue, ops, thread, and project sources

## 15. Risks and Mitigations

### Risk: Platform cannot support the required workboard shape

Mitigation:
- require a proof-of-fit slice before full migration

### Risk: Backend remains too monolithic for platform iteration

Mitigation:
- make adapter/service/API separation a required Phase 1 deliverable

### Risk: Rebuild preserves too much dashboard-style clutter

Mitigation:
- use the reboot baseline as a scope gate and reject report-first layouts

### Risk: Team loses current behavior during migration

Mitigation:
- preserve audited action semantics and file compatibility as non-negotiable requirements

### Risk: Project scope expands into a broader operations suite

Mitigation:
- keep V1 limited to four primary surfaces and defer automation elevation unless proven necessary

## 16. Assumptions

- The team wants a mature platform shell rather than another custom UI rewrite.
- `Operations` remains the source of truth during the first rebuild.
- Local-first operation is still required.
- Multi-user support is not a V1 requirement.
- Platform selection will be made based on capability fit, not trend or familiarity alone.

## 17. Open Questions

- Which mature platform best satisfies local-first custom workbench requirements?
- Should `Automation` remain secondary in V1 or return as a primary surface after design review?
- Which diagnostic views still need first-class access versus being moved behind disclosure?
- After V1, should `Operations` emit more structured JSON to reduce markdown parsing in ReviewHub?

## 18. Immediate Next Actions

1. Product reviews and approves this PRD.
2. Design produces the interaction spec for the four V1 surfaces.
3. Engineering creates the platform proof-of-fit slice and backend boundary plan.
4. QA prepares the initial acceptance checklist before implementation starts.

