# Findings

## 2026-04-03

- User assessment: ReviewHub is currently "basically unusable," so the immediate task is diagnosis and reboot direction rather than incremental polish.
- The repo already contains a reboot baseline in `REBOOT_DECISION.md` that argues for a task-first workbench and explicitly rejects a dashboard-first default surface.
- Current `public/index.html` still exposes multiple competing top-level surfaces (`workboard`, `queue`, `projects`, `operations`, `pipeline`, `overview`) inside one shell.
- Current shell mixes high-level summary, filtering, multiple section panels, modal detail, and project editing controls in the initial document, suggesting the product scope is still too broad for a clear default path.
- Current base CSS uses a fairly generic dashboard visual language and appears to preserve legacy layout classes (`page-shell`, `topbar`, `workspace-shell`, `queue-shell`) alongside newer concepts, which hints at an incomplete reboot rather than a clean reset.
- `server.js` is a very thin HTTP shell: one `GET /api/dashboard` endpoint plus action endpoints for queue, thread, ops, and project-board mutations.
- `lib/dashboard.js` is the main coupling hotspot: it hardcodes Operations paths, reads multiple source files directly from disk, validates schemas, builds unified items, merges action logs, computes recent activity/signal streams, builds ops snapshot, builds project hub, and returns one large dashboard payload.
- Queue actions mutate `approval_registry.json` and `daily_channel_queue.json` directly; thread and ops actions append local audit logs under `Operations/Ops/state`; project-board actions rewrite `Operations/PROJECT_KANBAN.md`.
- `operationsReview.js`, `projectBoard.js`, and `projectMaterials.js` all read local markdown/filesystem structures directly from the Operations repo, which means the current frontend contract depends on filesystem conventions instead of a stable service boundary.
- A mature platform migration can likely keep the action/API concepts, but it should not depend on the current monolithic `loadDashboardData()` response or direct filesystem assumptions inside the UI layer.
