const path = require('path');
const fs = require('fs');
const { loadDashboardData } = require('./dashboard');
const { buildDailyProcessingQueue, buildSignalStream, loadActionLog, loadOpsActionLog } = require('./dashboard');

function getRecapData(targetDate) {
  const dateStr = targetDate || new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const dashboard = loadDashboardData();
  
  // 1. Calculate time window
  const startOfDay = new Date(`${dateStr}T00:00:00Z`);
  const endOfDay = new Date(`${dateStr}T23:59:59Z`);

  // 2. Fetch all historical audit logs for "completed" items
  const actionLog = loadActionLog(); // reviewhub_action_log.ndjson
  const opsLog = loadOpsActionLog(); // reviewhub_ops_action_log.ndjson
  
  // Filter completions on that date
  const completedInLog = actionLog.filter(entry => {
    const entryDate = new Date(entry.timestamp_utc);
    return entryDate >= startOfDay && entryDate <= endOfDay && (entry.action === 'approve' || entry.action === 'mark_ready');
  });

  const opsCompletions = opsLog.filter(entry => {
    const entryDate = new Date(entry.timestamp_utc);
    return entryDate >= startOfDay && entryDate <= endOfDay && entry.action === 'mark_done';
  });

  // 3. Fetch exceptions/incidents on that date
  const signalStream = buildSignalStream();
  const dailySignals = signalStream.entries.filter(s => {
    const sDate = new Date(s.timestamp_utc);
    return sDate >= startOfDay && sDate <= endOfDay;
  });

  const newExceptions = dailySignals.filter(s => s.severity === 'critical' || s.severity === 'warning');

  // 4. Calculate carryover (Unclosed items)
  // Logic: Items present in current queue/inbox that are NOT done and were requested on or before targetDate
  const inbox = dashboard.items || [];
  const carryoverItems = inbox.filter(item => {
    const reqDate = new Date(item.requested_at || item.timestamp_utc);
    return reqDate <= endOfDay && item.status !== 'done' && item.status !== 'archived';
  });

  // 5. Aggregate by Project
  const projectStats = {};
  completedInLog.concat(opsCompletions).forEach(item => {
    const p = item.project || 'General';
    projectStats[p] = (projectStats[p] || 0) + 1;
  });

  // 6. Build the Response (Following Lobster's spec)
  return {
    date: dateStr,
    summary: {
      completed_count: completedInLog.length + opsCompletions.length,
      new_exception_count: newExceptions.length,
      open_exception_count: dashboard.operations_review?.summary?.total_records || 0,
      pending_approval_count: dashboard.summary?.needs_review || 0,
      needs_human_count: dashboard.summary?.blocked || 0,
      carryover_count: carryoverItems.length,
      projects_touched_count: Object.keys(projectStats).length
    },
    buckets: {
      completed_by_project: Object.entries(projectStats).map(([name, count]) => ({ project_name: name, count })),
      exceptions_by_severity: [
        { severity: 'critical', count: newExceptions.filter(e => e.severity === 'critical').length },
        { severity: 'warning', count: newExceptions.filter(e => e.severity === 'warning').length }
      ]
    },
    top_items: {
      notable_completions: completedInLog.slice(0, 3).map(e => ({ title: e.item_id, project_name: e.project || 'General' })),
      new_exceptions: newExceptions.slice(0, 3).map(e => ({ title: e.title, severity: e.severity })),
      carryover_items: carryoverItems.slice(0, 3).map(e => ({ title: e.title, reason: e.action_label }))
    },
    metadata: {
      generated_at: new Date().toISOString(),
      coverage_flags: {
        activity_stream_covered: true,
        inbox_covered: true,
        exceptions_covered: true
      }
    }
  };
}

module.exports = { getRecapData };
