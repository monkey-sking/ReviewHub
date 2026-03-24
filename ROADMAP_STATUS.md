# ReviewHub Roadmap and Status

Last updated: 2026-03-24

## Current status (Phase 1 workbench)

Implemented now:

- Local-only HTTP dashboard (`server.js`) with read and controlled write APIs
- Live reads from `approval_registry.json` and `daily_channel_queue.json`
- Chinese single-page workbench with sectioned navigation (`今日概况 / 待处理内容 / 问题记录 / 自动执行`)
- Summary section, filterable queue list, right-side inspector, and raw JSON panes
- Single-item queue actions: approve, reject, mark missing info, mark ready, restore auto inference
- Batch queue actions against the current filtered result set
- Continuous handling flow: after a single-item action, the UI advances to the next visible queue item
- Recent action log surfaced in the inspector for queue items
- `待人工回复` upgraded into a real inbox with local thread actions and per-thread history
- Operations Review section backed by review ledger, experiment log, feedback snapshot, and browser handoff summaries, with drill-down in the inspector
- Latest Ops snapshot panels for run health and execution state, backed by supervisor, post, reply, browser-fill, metrics, and feedback artifacts
- Thread detail and cross-links between queue items, browser handoffs, source files, and thread artifacts
- Status/platform/risk/project filters plus text search
- Source-file diagnostics with structured API error details
- Regression coverage for queue-state logic, write actions, and API safety checks

Out of scope today:

- Public deployment and auth/permissions
- Full chat/comment ingestion
- Multi-user locking and permission boundaries
- Rich action history UI and audit browsing

## Active hardening work

These are immediate stability and correctness items:

- Keep queue handling fast when the filtered result set grows
- Tighten action semantics for mixed-source records and cross-link accuracy
- Add broader browser-level regression around the queue workbench

## Next roadmap

### Phase 1.1 (stabilize current MVP)

- Finish workbench hardening around batch actions, follow-up visibility, and inspector clarity
- Add deterministic browser regressions for queue flows and empty-state transitions
- Add richer audit browsing beyond the selected queue item
- Document artifact expectations for ops snapshot and reply/job files
- Normalize naming and workflows so non-technical operators can use the tool without internal jargon

### Phase 2 (unified operations view)

- Current first step landed: `待人工回复` now supports local handling states and inspector actions, while Ops review and latest-run surfaces remain visible from `review_index`, `experiment_log`, latest feedback report, post/reply queue summaries, browser-fill summary, metrics summary, and supervisor run summary
- Add B站 comments / daily processing queue view
- Add event stream with high-signal state changes only
- Keep default view concise, with traceable source context

### Phase 3 (controlled actions)

- Introduce explicit action model (review, execute, defer)
- Add audited write actions with clear side-effect boundaries
- Add local agent-assisted workflows for repetitive operations
- Evaluate controlled remote access only after local model is stable

## Working rules for future changes

- Keep local-first and read-safe behavior as default
- Prefer small, test-backed iterations over broad rewrites
- Every new module must define:
  - problem solved
  - default summary view
  - source-of-truth fields
  - whether it is read-only or mutating
