# Upstream JSON Schemas

Last updated: 2026-03-24

This document defines the expected shape for the two upstream files used by ReviewHub:

- `approval_registry.json`
- `daily_channel_queue.json`

All timestamps should use ISO-8601 UTC strings (for example `2026-03-24T10:30:00.000Z`).

## 1) approval_registry.json

### Top-level

Required fields:

- `schema_version` (string)
- `updated_at_utc` (string, ISO-8601 UTC)
- `entries` (array of approval entries)

### entries[] object

Core fields used by ReviewHub:

- `entry_id` (string) unique approval record id
- `status` (string) expected values: `pending`, `approved`, `revoked`
- `platform` (string)
- `source` (string) source file path
- `item_id` (string)
- `notes` (string, optional)
- `reason` (string, optional but required in practice for pending approval quality)
- `requested_at_utc` (string, optional)
- `requested_by` (string, optional)
- `approval_ticket` (string, optional)

Additional passthrough fields supported (read-only):

- `approved`, `approved_at_utc`, `approved_by`
- `expires_at_utc`
- `item_type`
- `post_id`, `reply_id`
- `revoked_at_utc`, `revoked_by`
- `scope`

## 2) daily_channel_queue.json

### Top-level

Required fields:

- `schema_version` (string)
- `run_date` (string, date or ISO-like run marker)
- `items` (array of queue entries)

Optional summary fields:

- `total_items` (number)
- `status_counts` (object map)
- `platform_counts` (object map)
- `risk_counts` (object map)

### items[] object

Core fields used by ReviewHub:

- `item_id` (string) unique queue id
- `status` (string) expected values in current UI: `approval_pending`, `queued`
- `platform` (string)
- `title` (string)
- `source` (string)
- `risk` (string)
- `owner` (string; `-` is treated as missing)
- `notes` (string; `-` is treated as empty)
- `category` (string, optional)

## 3) Cross-file semantics

- Queue items with `status=approval_pending` are matched against `approval_registry.entries` where `status=pending`.
- Queue items with `status=queued` are treated as execution-ready unless other required context is missing (for example owner).
- Matching priority is:
1. Exact `source` match.
2. Platform + title/identifier fuzzy match.

## 4) Validation guidance

- Prefer keeping `item_id`, `source`, and `platform` stable across runs for better matching quality.
- Use explicit empty strings instead of placeholders when possible; ReviewHub normalizes `-` to empty.
- If upstream generators change field names, update this file and `lib/dashboard.js` in the same change.

## 5) Optional Ops run artifacts

These files are not required for the dashboard to load, but they drive the `Run Health` and `Execution Snapshot` cards when present under `Ops/runs/<date>/`.

### `posts/browser_post_queue_summary.json`

Fields currently consumed:

- `run_date`
- `mode`
- `total_items`, `ready_count`, `blocked_count`
- `generated_count`, `existing_count`
- `errors` (array)
- `records[]` with `item_id`, `platform`, `queue_status`, `status`, `target_url`, `blocked_reasons`, `source`

### `replies/browser_reply_queue_summary.json`

Fields currently consumed:

- `run_date`
- `mode`
- `total_packets`, `ready_count`, `blocked_count`
- `generated_job_count`, `generated_result_count`
- `existing_job_count`, `existing_result_count`
- `errors` (array)

### `browser_fill/browser_fill_queue_summary.json`

Fields currently consumed:

- `run_date`
- `mode`
- `posts.ready`, `posts.approval_pending`, `posts.blocked`, `posts.executed`
- `replies.ready`, `replies.approval_pending`, `replies.blocked`, `replies.executed`
- `cdp_start.status`
- `errors` (array)

### `metrics/metrics_summary_<date>.json`

Fields currently consumed:

- `run_date`
- `status.overall`, `status.kv`, `status.paddle`, `status.analytics`
- `kv.entries`
- `analytics.users`, `analytics.pageviews`
- `paddle.gross_total`, `paddle.currency`

### `supervisor/supervisor_run_summary_<date>.json`

Fields currently consumed:

- `run_date`
- `run_status`
- `run_started_at_utc`, `run_ended_at_utc`
- `dry_run`
- `steps[]` with `name` and `status`

### `feedback/lobster_feedback_report_<date>.md`

Markdown lines currently consumed:

- `- Total incidents captured: **<number>**`
- `- User feedback signals: **<number>**`
- `## Root cause buckets`
- `## Suggested operator actions`
- `## Recent incident timeline`
- `## User feedback highlights`
