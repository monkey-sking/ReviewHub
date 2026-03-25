# ReviewHub Roadmap and Status

Last updated: 2026-03-25

## Current status (Phase 1 workbench)

Implemented now:

- Local-only HTTP dashboard (`server.js`) with read and controlled write APIs
- Live reads from `approval_registry.json` and `daily_channel_queue.json`
- Chinese single-page workbench with sectioned navigation (`今日概况 / 待处理内容 / 问题记录 / 自动执行`)
- Summary section, filterable queue list, right-side inspector, and raw JSON panes
- Single-item queue actions: approve, reject, mark missing info, mark ready, defer, restore auto inference
- Batch queue actions against the current filtered result set
- Continuous handling flow: after a single-item action, the UI advances to the next visible queue item
- Recent action log surfaced in the inspector for queue items
- `待人工回复` upgraded into a real inbox with local thread actions and per-thread history
- Operations section now includes a `日报待处理` lane that merges queue items, reply tasks, and follow-up review records
- Operations section now includes a `重要变化` stream that keeps only recent manual actions and feedback incidents
- Operations Review section backed by review ledger, experiment log, feedback snapshot, and browser handoff summaries, with drill-down, local audited actions, and per-record history in the inspector
- Latest Ops snapshot panels for run health and execution state, backed by supervisor, post, reply, browser-fill, metrics, and feedback artifacts
- Thread detail and cross-links between queue items, browser handoffs, source files, and thread artifacts
- Status/platform/risk/project filters plus text search
- Source-file diagnostics with structured API error details
- Regression coverage for queue-state logic, write actions, API safety checks, homepage contract, and source-preview parsing

Out of scope today:

- Public deployment and auth/permissions
- Full chat/comment ingestion
- Multi-user locking and permission boundaries
- Multi-user locking and permission boundaries

## Delivered in this round

- Inspector now includes source-file preview plus detected image / video / link artifacts for queue items
- Operations view now includes a recent-activity stream that combines queue, thread, and operations-record actions
- Added deterministic server/homepage regression coverage so the workbench shell and dashboard contract are verified end-to-end
- Restarted and verified the local runtime on port 4310 against live Ops data

## Remaining expansion ideas (not blockers for current delivery)

- Keep queue handling fast when the filtered result set grows further
- Tighten action semantics for mixed-source records and cross-link accuracy on edge cases
- Add richer media rendering if later you want inline thumbnails/video playback instead of artifact references only

## Next roadmap

### Phase 1.1 (stabilize current MVP) — delivered

- Workbench hardening around batch actions, follow-up visibility, and inspector clarity
- Deterministic regression coverage for homepage/dashboard contract and key queue flows
- Richer audit browsing beyond the selected queue item via the recent-activity stream
- Artifact expectations documented through source preview / artifact extraction in the inspector
- Naming/workflow stays operator-oriented and local-first

### Phase 2 (unified operations view)

- `待人工回复` now supports local handling states and inspector actions, while Ops review and latest-run surfaces remain visible from `review_index`, `experiment_log`, latest feedback report, post/reply queue summaries, browser-fill summary, metrics summary, and supervisor run summary
- Queue-backed `日报待处理` lane is now live, joining `daily_channel_queue.json`, review records, latest post-handoff summary, and reply packets into one jumpable inbox
- High-signal event stream is now live, combining recent queue/thread/ops actions with feedback incidents from the latest Ops report
- Keep default view concise, with traceable source context

### Phase 3 (controlled actions)

- Explicit action model is now live across queue and operations follow-up (`review / execute / defer / done`), while thread flow keeps its reply-specific states
- Audited write actions now cover queue items, reply threads, and operations follow-up records with local append-only logs and no upstream artifact mutation
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
