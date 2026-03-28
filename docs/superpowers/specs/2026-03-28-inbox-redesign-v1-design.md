# ReviewHub Inbox Redesign V1

Date: 2026-03-28
Workstream: `feature/inbox-redesign-v1`
Status: Draft for user review

## 1. Problem

ReviewHub has been iterated multiple times, but the operator path is still unsatisfying because the product behaves like several tools at once: dashboard, workbench, monitor, and data viewer. A human entering the app cannot immediately tell:

- what matters now
- where to click first
- which action is the default forward path

The current structure makes the operator pay an information-architecture tax before any work can begin.

## 2. V1 Goal

Redesign ReviewHub around one clear operator-first path:

`Open Inbox -> choose the next item -> review in a focused modal -> act -> see state return -> continue to the next item`

V1 is successful when this path feels obvious and fast without requiring the operator to parse unrelated project, automation, or diagnostic surfaces.

## 3. User and Primary Intent

### Primary user

An internal operator who processes queued review/execution items and needs to make quick, confident decisions.

### Primary intent

The dominant action in V1 is:

`通过并继续`

This is the forward-moving action the layout should privilege. Other outcomes exist, but they should not own the screen.

## 4. Scope

### In scope

- Default app entry for the operator workflow
- Inbox list structure and prioritization
- Item detail modal
- Primary and secondary action model
- Post-action feedback and list/state return

### Out of scope

- Full redesign of `Projects`
- Full redesign of `Issues`
- Full redesign of `Automation`
- Deep backend/state-model rearchitecture
- Packaging, release, or production-operation changes

## 5. Baseline References

This design follows the previously agreed competitor baseline from verified local history:

- Linear Triage
- Intercom Inbox
- Zendesk Agent Workspace
- Front
- GitHub PR review as a workflow comparison

Shared pattern:

`one main inbox + clear states + focused context + a small set of main actions`

## 6. Product Strategy

V1 uses an `Inbox First` strategy instead of a full product-wide unification.

The app should stop acting like several equal homepages. Inbox becomes the default work surface. Other areas remain available, but they are demoted from primary stage owners to secondary work areas.

This is intentionally narrower than a total product rewrite. The goal is to rescue the main operator path without pulling the entire app into a large multi-surface redesign.

## 7. Information Architecture

### 7.1 Entry hierarchy

Top-level navigation remains:

- `Inbox`
- `Projects`
- `Issues`
- `Automation`

But only `Inbox` is the default landing surface.

### 7.2 First-screen structure

The first screen should have three layers:

1. Light navigation
2. Inbox list
3. Lightweight summary strip

The previous hero-like stage header should no longer dominate the page. The app should not ask the operator to interpret a large dashboard before finding the queue.

### 7.3 Summary strip

The top summary becomes a compact strip instead of a hero block. It should show only the minimum state buckets needed to orient the operator:

- `待审核`
- `可继续`
- `资料不全`
- `已暂缓`

It is not a report surface. It is only a context cue.

## 8. Inbox List Design

The Inbox list is responsible for only three jobs:

- prioritize
- help selection
- signal likely next action

It should not try to be a mini detail page.

### 8.1 State tabs

The list keeps five state buckets:

- `待审核`
- `可继续`
- `资料不全`
- `已暂缓`
- `全部`

Default tab:

`可继续`

Reason: V1 is built around the operator's most common forward path, which is `通过并继续`.

### 8.2 List item structure

Each row should present only two primary lines.

Line 1:

- item title
- platform/source
- current state

Line 2:

- one-line next step or blocker reason
- optional time cue such as `12 分钟前` or `今天 14:20`

### 8.3 Visual priority

Most prominent:

- title
- state

Secondary:

- platform
- project name
- time

Demoted:

- raw internal identifiers
- technical labels
- multi-button action clusters

### 8.4 Selection behavior

Clicking a row opens the detail modal. The list does not navigate to a new page and does not run complex actions directly.

The selected row should remain visually obvious until the modal closes or the item leaves the current filtered bucket.

### 8.5 Empty states

If a bucket is empty, use a plain-language empty state:

`这一组现在没有需要你处理的内容`

Do not auto-jump to another bucket. Do not fill the space with technical explanation.

## 9. Detail Modal Design

The item detail surface should be a focused modal, not a persistent right-side inspector.

Reason:

- the operator flow is row-by-row
- modal focus reduces surrounding noise
- it better supports short decision loops
- it avoids the feeling of a permanent engineering side panel

Closing the modal should preserve list position, selection context, and current filters.

### 9.1 Modal structure

The modal should scroll as one page, with the action area pinned near the top. It should not add another internal navigation layer unless future complexity demands it.

Recommended vertical structure:

1. Header
2. Decision summary
3. Action area
4. Detailed information sections

### 9.2 Header

The header includes:

- title
- platform/source
- current state
- close control

This section answers: `what is this item`.

### 9.3 Decision summary

This section answers:

- why this item deserves attention now
- what the operator needs to know before deciding

Content:

- one concise system summary sentence
- two to four key context bullets or short blocks

Examples of valid context:

- what is missing
- why it is ready
- what risk exists
- why it is blocked

### 9.4 Action area

The action area is the modal's decision center.

Primary action:

- `通过并继续`

Secondary actions:

- `退回`
- `补资料`
- `暂缓`

The primary action must be visually dominant and structurally first.

Semantic rule:

- `通过并继续` means forward motion
- `退回` means reject or send back
- `补资料` means the item cannot proceed without missing information
- `暂缓` means defer for later, optionally with a time

These actions must not be blurred together.

### 9.5 Progressive disclosure for inputs

The modal should not open with all inputs visible.

Optional fields such as notes or defer time should only expand when the chosen action requires them.

Examples:

- `通过并继续` may allow an optional note
- `补资料` may reveal a note or category field
- `暂缓` may reveal a time picker and note

This keeps the top of the modal focused on decision-making instead of form noise.

### 9.6 Detailed information sections

Detailed information still exists, but it is demoted below the decision area.

Suggested sections:

- `上下文`
- `历史记录`
- `原始内容`
- `审核依据`
- `JSON / artifacts`

These sections may use collapsible containers. They must not lead the modal.

## 10. State Return

The flow does not end at button click. It ends when the operator can see that the system accepted the action and that the next unit of work is ready.

### 10.1 Success feedback

After action, show a short human-readable confirmation, for example:

- `已继续处理`
- `已退回`
- `已标记资料不全`
- `已暂缓`

Do not lead with technical wording.

### 10.2 Modal close behavior

After a successful action:

1. show short feedback
2. close the modal
3. update the list state immediately
4. update the summary strip

### 10.3 List behavior after action

If the item no longer belongs in the current state bucket, it should leave the visible list.

Focus should remain stable on the next most relevant item so the operator can continue without re-orienting.

## 11. Error Handling

Error feedback should stay human-readable:

- `没有保存成功，请重试`
- `暂时无法更新状态`

Technical details can exist in an expanded diagnostics area, but should not dominate the main feedback surface.

## 12. Acceptance Criteria

V1 is acceptable when the following are true:

### Entry and orientation

- On open, the operator lands in `Inbox` by default
- Within 5 seconds, the operator can tell where to start
- The top summary does not overpower the queue

### List comprehension

- Within 5 seconds, the operator can identify the next likely item to process
- List rows feel scannable without requiring technical interpretation
- The default bucket favors forward progress

### Modal comprehension

- Within 10 seconds of opening an item, the operator can understand:
  - what the item is
  - why it matters now
  - what the primary action is

### Action confidence

- `通过并继续` is clearly the dominant forward action
- Secondary actions remain available without overpowering the layout
- Actions do not reuse misleading labels or mixed semantics

### State return

- After action, the operator sees immediate confirmation
- List and summary state update without manual refresh
- The next relevant item becomes easy to continue with

### Detail balance

- Detailed information is available
- Detailed information does not outrank decision information in the modal

## 13. Non-Goals for V1

This redesign does not try to:

- solve the entire product navigation system forever
- unify all modules into one universal queue
- perfect every backend state model
- expose every technical artifact in the main path

V1 is a focused recovery of the operator's core decision workflow.

## 14. Implementation Implications

This spec implies likely changes in:

- `public/index.html`
- `public/app.js`
- `public/styles_premium.css`

But implementation planning is intentionally deferred until after user review of this spec.
