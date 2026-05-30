# Task Plan

## Goal
Assess why ReviewHub is currently failing as a usable decision workbench, identify the primary product and UI problems, and decide whether the next step should be a reboot or a targeted salvage plan.

## Current Phase
Phase 4

## Phases
### Phase 1: Requirements & Discovery
- [x] Understand user intent
- [x] Identify constraints and requirements
- [x] Document findings in findings.md
- **Status:** complete

### Phase 2: Product Diagnosis
- [x] Review current information architecture and default flow
- [x] Identify highest-impact usability failures
- [x] Compare against the stated reboot/product baseline
- **Status:** complete

### Phase 3: Direction Decision
- [x] Define realistic reset options
- [x] Confirm whether to salvage, reboot shell, or rebuild front-end entirely
- **Status:** complete

### Phase 4: Design & Plan
- [x] Present recommended direction
- [x] Write a concise design/spec if proceeding
- [x] Prepare implementation plan (Phase 0-2)
- **Status:** complete

### Phase 5: Implementation (Reboot)
- [x] Phase 0: Platform Selection (Ant Design + React + Vite)
- [x] Phase 1: Backend Boundary Refactor (Resource-based APIs)
- [x] Phase 2: Core Operator Surfaces (Workboard, Inbox, Issues, Projects, Activity)
- [ ] Phase 3: Stabilization & Action Hardening (Write actions, UI polish)
- **Status:** in_progress

## Key Questions
1. Which mature platform best satisfies the required workbench layout and local-first constraints?
2. Should `Automation` remain secondary in V1 or be restored as a first-class surface?
3. When should `Operations` add structured exports to reduce markdown/file parsing in ReviewHub?

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Start with diagnosis before implementation | User says the current app is basically unusable; product reset decisions come before code changes |
| Treat this as a product/UI reboot question, not a styling pass | Existing reboot doc already indicates information architecture concerns |
| Recommend a mature platform shell plus local adapter service | Preserves local data/audited actions while replacing the weakest part of the system |
| Write a role-executable PRD before implementation planning | User asked for a product requirements scheme the team can execute |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| None yet | 1 | N/A |
