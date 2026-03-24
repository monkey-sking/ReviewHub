# ReviewHub MVP

A local, read-only ReviewHub prototype for viewing approval requests and the daily channel queue in one place.

## Stack

- Node.js built-in `http` server
- Vanilla HTML/CSS/JavaScript
- No external runtime dependencies

## Data sources

By default the app reads these local files directly on every API request:

- `/Volumes/SSD/Projects/Operations/Ops/state/approval_registry.json`
- `/Volumes/SSD/Projects/Operations/Ops/state/daily_channel_queue.json`

You can override them if needed:

```bash
APPROVAL_REGISTRY_PATH=/path/to/approval_registry.json \
DAILY_CHANNEL_QUEUE_PATH=/path/to/daily_channel_queue.json \
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

## What this MVP includes

- Summary cards for pending approvals, approval-pending items, queued items, and platform count
- Main list for `approval_pending` and `queued` items
- Filters for status, platform, and risk
- Detail pane with title, platform, status, risk, notes, reason, source, requested time, and approval metadata
- Raw JSON preview for the queue item and matched approval entry
- Read-only behavior only; no approve/revoke write actions

## File overview

- `server.js` — local HTTP server and static/API routing
- `lib/dashboard.js` — reads JSON, normalizes records, matches approvals to queue items
- `public/index.html` — single-page dashboard shell
- `public/app.js` — data fetch, filters, list rendering, detail rendering
- `public/styles.css` — minimal dashboard styles
