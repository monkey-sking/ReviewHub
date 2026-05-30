# ReviewHub Docs Index

This docs folder is the future home for repo-level supporting docs, but the higher-level status, design, and schema documents still live at the repository root today. This index points you at those files and explains why they have not moved yet.

## Root-level docs you still read first
- `ROADMAP_STATUS.md` captures the current status, execution decisions, and what we are tracking for the next milestone.
- `REBOOT_DECISION.md` explains the rationale behind the most recent architecture/stack reset and any outstanding action items that resulted from it.
- `UPSTREAM_SCHEMAS.md` documents the schema definitions that the services downstream still depend on.

### Why they remain at the root
These files are referenced by automation, status trackers, and standing reports that expect them at the repository top level. Moving them into `docs/` would require updating those flows, so we keep them where the existing integrations already look.
