# ReviewHub Reboot Decision

Workstream: `feature/reviewhub-reboot`

## Product baseline

- Primary user: one internal operator on one Mac, across multiple projects, handling content, distribution, review, operations, blockers, and next steps.
- Core job: open one page, see what needs human judgment now, decide, push the next action, and keep project context attached without drowning in raw diagnostics.
- ReviewHub is not a BI dashboard, generic PM tool, filesystem browser, or public multi-user product.

## V1 identity

ReviewHub is a local multi-project decision workbench.

The default screen must answer four questions quickly:

1. What needs my decision now?
2. What can move next?
3. What is blocked?
4. Which project context and materials do I need before acting?

## Information architecture

- `Workboard`: default surface. Unified board for decision items, next actions, blockers, and watch items.
- `Inbox`: content and execution entries that still need queue-level handling.
- `Issues`: blocker, handoff, feedback, and review exceptions.
- `Automation`: reply flow and machine handoff status.
- `Projects`: per-project view with `推进层` and `资料层` explicitly separated.

## Interaction rules

- First screen is task-first, not report-first.
- Project materials stay secondary until the user opens a project or item detail.
- Raw JSON, source dumps, and technical diagnostics stay behind lower-priority disclosure.
- Desktop uses a persistent inspector; narrow screens can still use a modal/sheet presentation.

## Visual rules

- One shell, one accent system, one card language.
- Dark rail for navigation, calm light work surface for action.
- Compact cards with strong tags, visible project attribution, and one main sentence per card.
- No hero-dashboard stack, no pseudo big-screen overview as the primary experience.

## Scope cuts

- No “data big screen” as a first-class product surface.
- No filesystem-heavy project materials browser as the default center panel.
- No separate pseudo-products for queue / pipeline / operations / projects that compete for the same top level.

## Acceptance criteria

- A new user can describe ReviewHub as “the place where I handle multi-project decisions and next steps”.
- The default surface opens to an actionable board, not a summary wall.
- Project progress and project materials are visibly distinct.
- Detail is secondary to the board, not the primary layout driver.
- The shell feels like one product instead of stitched dashboards.
