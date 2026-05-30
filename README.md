# ReviewHub

A local multi-project decision workbench for one internal operator: handle what needs judgment now, push the next step, and only open project materials when needed.

## Project status and roadmap

- Current implementation status and next phases: `ROADMAP_STATUS.md`
- Upstream data file schema reference: `UPSTREAM_SCHEMAS.md`
- Reboot product/design baseline: `REBOOT_DECISION.md`

## Stack

- Node.js built-in `http` server
- Vanilla HTML/CSS/JavaScript
- No external runtime dependencies

## Data sources

By default the app reads these local files directly on every API request:

- `/Volumes/SSD/Projects/Operations/Ops/state/approval_registry.json`
- `/Volumes/SSD/Projects/Operations/Ops/state/daily_channel_queue.json`
- `/Volumes/SSD/Projects/Operations/Ops/state/review_index.md`
- `/Volumes/SSD/Projects/Operations/Ops/state/experiment_log.md`
- latest available `Ops/runs/<date>/feedback/lobster_feedback_report_<date>.md`
- latest available `Ops/runs/<date>/posts/browser_post_queue_summary.json`
- latest available `Ops/runs/<date>/replies/browser_reply_queue_summary.json`
- latest available `Ops/runs/<date>/metrics/metrics_summary_<date>.json`
- latest available `Ops/runs/<date>/browser_fill/browser_fill_queue_summary.json`
- latest available `Ops/runs/<date>/supervisor/supervisor_run_summary_<date>.json`

You can override them if needed:

```bash
APPROVAL_REGISTRY_PATH=/path/to/approval_registry.json \
DAILY_CHANNEL_QUEUE_PATH=/path/to/daily_channel_queue.json \
REVIEWHUB_OPERATIONS_ROOT=/path/to/Operations \
REVIEWHUB_OPS_RUNS_ROOT=/path/to/Operations/Ops/runs \
npm start
```

## Install

No external packages are required. Make sure Node.js 18+ is installed.

Optional:

```bash
npm install
```

## Start

```bash
cd /Volumes/SSD/Projects/ReviewHub
npm start
```

Then open:

```text
http://127.0.0.1:4310
```

## Test

```bash
npm test
```

## What this workbench includes

- Summary cards for pending approvals, queued items, platform count, and status count
- Queue workbench with single-item actions: approve, reject, mark missing info, mark ready, defer, restore auto inference
- Batch actions for the current filtered queue result set
- Automatic advance to the next visible queue item after a single-item action
- Recent action log for the selected queue item in the inspector
- Source-file preview in the inspector, including detected image/video/link artifacts for queue items
- Daily processing lane in the Operations view that merges queue items, reply tasks, and follow-up review records
- Recent activity stream that combines queue, thread, and operations-record actions in the Operations view
- High-signal stream that surfaces recent manual actions plus feedback incidents with one-click jumps into the right work area
- Thread inbox with local actions: mark ready, follow up, blocked, done, restore auto inference
- Operations Review panels for review ledger, experiments, feedback snapshot, and browser handoffs, each with local audited actions (`需复核 / 推进执行 / 暂缓 / 已处理 / 恢复系统判断`)
- Latest Ops run panels for run health and execution snapshot, backed by supervisor, post, reply, fill, metrics, and feedback artifacts
- Latest reply-thread detail view, including packet/job payloads and artifact links
- Cross-links between queue items, browser handoffs, source files, and thread artifacts
- Main list for `approval_pending` and `queued` items
- Filters for project, status, platform, and risk
- Search across title, notes, source, and project text
- Detail pane with title, platform, project, status, risk, notes, reason, source, requested time, and approval metadata
- Raw JSON preview for the queue item and matched approval entry
- Structured diagnostics for missing/invalid source files

## File overview

- `server.js` — local HTTP server and static/API routing
- `lib/dashboard.js` — reads JSON, normalizes records, matches approvals to queue items, and builds the latest Ops run snapshot
- `lib/operationsReview.js` — reads review ledger markdown plus latest Ops review artifacts
- `lib/operationsRecords.js` — builds stable record identifiers for operations entries
- `lib/operationsActions.js` — applies local audited mutations to operations follow-up state
- `lib/queueActions.js` — applies audited queue mutations to queue and approval files
- `lib/threadActions.js` — applies local audited mutations to reply-thread review state
- `public/index.html` — single-page dashboard shell
- `public/app.js` — data fetch, queue actions, filters, list rendering, and inspector rendering
- `public/styles.css` — minimal dashboard styles
