const fs = require('fs');
const path = require('path');
const { loadOperationsReviewData } = require('./operationsReview');

const DEFAULT_OPERATIONS_ROOT = '/Volumes/SSD/Projects/Operations';
const DEFAULT_APPROVAL_PATH = '/Volumes/SSD/Projects/Operations/Ops/state/approval_registry.json';
const DEFAULT_QUEUE_PATH = '/Volumes/SSD/Projects/Operations/Ops/state/daily_channel_queue.json';
const DEFAULT_RUNS_ROOT = '/Volumes/SSD/Projects/Operations/Ops/runs';
const ACTION_LOG_FILENAME = 'reviewhub_action_log.ndjson';
const THREAD_ACTION_LOG_FILENAME = 'reviewhub_thread_action_log.ndjson';
const THREAD_MANUAL_STATES = new Set(['ready', 'needs_reply', 'follow_up', 'blocked', 'done']);

class DashboardDataError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'DashboardDataError';
    this.details = options.details || [];
    this.source_files = options.source_files || {};
  }
}

function createSourceIssue(source, filePath, issue, hint) {
  return {
    source,
    path: path.resolve(filePath),
    issue,
    hint
  };
}

function readJsonSource(source, filePath) {
  const resolvedPath = path.resolve(filePath);

  try {
    const raw = fs.readFileSync(resolvedPath, 'utf8');

    try {
      return {
        ok: true,
        data: JSON.parse(raw),
        source,
        path: resolvedPath
      };
    } catch (error) {
      return {
        ok: false,
        data: null,
        source,
        path: resolvedPath,
        detail: createSourceIssue(source, resolvedPath, 'JSON 内容无效。', error.message)
      };
    }
  } catch (error) {
    const issue = error.code === 'ENOENT'
      ? '源文件不存在。'
      : '源文件无法读取。';

    return {
      ok: false,
      data: null,
      source,
      path: resolvedPath,
      detail: createSourceIssue(source, resolvedPath, issue, error.message)
    };
  }
}

function validateApprovalData(data, filePath) {
  const issues = [];

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    issues.push(
      createSourceIssue(
        'approval_registry',
        filePath,
        '审批数据顶层必须是对象。',
        '期望字段：schema_version、updated_at_utc、entries。'
      )
    );
    return issues;
  }

  if (!Array.isArray(data.entries)) {
    issues.push(
      createSourceIssue(
        'approval_registry',
        filePath,
        '缺少或无效的 "entries" 数组。',
        '期望 approval_registry.entries 为数组。'
      )
    );
  }

  return issues;
}

function validateQueueData(data, filePath) {
  const issues = [];

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    issues.push(
      createSourceIssue(
        'daily_channel_queue',
        filePath,
        '队列数据顶层必须是对象。',
        '期望字段：schema_version、run_date、items、status_counts。'
      )
    );
    return issues;
  }

  if (!Array.isArray(data.items)) {
    issues.push(
      createSourceIssue(
        'daily_channel_queue',
        filePath,
        '缺少或无效的 "items" 数组。',
        '期望 daily_channel_queue.items 为数组。'
      )
    );
  }

  return issues;
}

function createArtifactWarning(source, filePath, issue, hint) {
  return {
    source,
    path: path.resolve(filePath),
    issue,
    hint
  };
}

function readOptionalJsonArtifact(source, filePath) {
  try {
    return {
      ok: true,
      data: JSON.parse(fs.readFileSync(filePath, 'utf8'))
    };
  } catch (error) {
    const issue = error.code === 'ENOENT'
      ? '可选产物不存在。'
      : error.name === 'SyntaxError'
        ? '可选产物中的 JSON 无效。'
        : '可选产物无法读取。';

    return {
      ok: false,
      data: null,
      warning: createArtifactWarning(source, filePath, issue, error.message)
    };
  }
}

function readOptionalTextArtifact(source, filePath) {
  try {
    return {
      ok: true,
      data: fs.readFileSync(filePath, 'utf8')
    };
  } catch (error) {
    const issue = error.code === 'ENOENT'
      ? '可选产物不存在。'
      : '可选产物无法读取。';

    return {
      ok: false,
      data: null,
      warning: createArtifactWarning(source, filePath, issue, error.message)
    };
  }
}

function getRunsRoot() {
  return process.env.REVIEWHUB_OPS_RUNS_ROOT || process.env.OPS_RUNS_ROOT || process.env.OPERATIONS_RUNS_ROOT || DEFAULT_RUNS_ROOT;
}

function getOperationsRoot() {
  return process.env.REVIEWHUB_OPERATIONS_ROOT || process.env.OPERATIONS_ROOT || DEFAULT_OPERATIONS_ROOT;
}

function listRunDates(runsRoot) {
  try {
    return fs.readdirSync(runsRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(entry.name))
      .map((entry) => entry.name)
      .sort((left, right) => right.localeCompare(left, 'en'));
  } catch (_error) {
    return [];
  }
}

function findLatestRunArtifact(runsRoot, relativePathBuilder) {
  for (const runDate of listRunDates(runsRoot)) {
    const candidatePath = path.join(runsRoot, runDate, relativePathBuilder(runDate));

    try {
      if (fs.statSync(candidatePath).isFile()) {
        return {
          run_date: runDate,
          path: candidatePath
        };
      }
    } catch (_error) {
      continue;
    }
  }

  return null;
}

function findLatestReplyPacketArtifacts(runsRoot) {
  for (const runDate of listRunDates(runsRoot)) {
    const repliesDir = path.join(runsRoot, runDate, 'replies');
    let replyDirs = [];

    try {
      replyDirs = fs.readdirSync(repliesDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory());
    } catch (_error) {
      continue;
    }

    const packets = replyDirs
      .map((entry) => {
        const outputDir = path.join(repliesDir, entry.name);
        return {
          reply_id: entry.name,
          output_dir: outputDir,
          packet_path: path.join(outputDir, 'packet.json'),
          job_path: path.join(outputDir, 'browser_reply_job.json')
        };
      })
      .filter((artifact) => {
        try {
          return fs.statSync(artifact.packet_path).isFile();
        } catch (_error) {
          return false;
        }
      });

    if (packets.length > 0) {
      return {
        run_date: runDate,
        directory: repliesDir,
        packets
      };
    }
  }

  return null;
}

function safeNumber(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function buildStepStatusCounts(steps) {
  const counts = {};

  for (const step of Array.isArray(steps) ? steps : []) {
    const status = cleanValue(step && step.status) || 'unknown';
    counts[status] = (counts[status] || 0) + 1;
  }

  return counts;
}

function buildSupervisorSnapshot(payload, artifact) {
  const steps = Array.isArray(payload.steps) ? payload.steps : [];
  const stepStatusCounts = buildStepStatusCounts(steps);

  return {
    run_date: cleanValue(payload.run_date) || artifact.run_date,
    run_status: cleanValue(payload.run_status) || 'unknown',
    started_at: cleanValue(payload.run_started_at_utc),
    ended_at: cleanValue(payload.run_ended_at_utc),
    dry_run: Boolean(payload.dry_run),
    step_status_counts: stepStatusCounts,
    failing_steps: steps
      .filter((step) => {
        const status = cleanValue(step && step.status);
        return status && status !== 'ok' && status !== 'skipped_by_flag' && status !== 'skipped_not_requested';
      })
      .slice(0, 5)
      .map((step) => ({
        name: cleanValue(step.name) || 'unknown',
        status: cleanValue(step.status) || 'unknown'
      })),
    artifact_path: artifact.path
  };
}

function buildPostSnapshot(payload, artifact, queueItemsById) {
  const records = Array.isArray(payload.records) ? payload.records : [];
  const readyForBrowserReviewCount = records.filter((record) => cleanValue(record.status) === 'ready_for_browser_review').length;
  const missingTargetUrlCount = records.filter((record) => {
    return cleanValue(record.status) === 'needs_target_url'
      || (Array.isArray(record.blocked_reasons) && record.blocked_reasons.includes('missing target_url'));
  }).length;
  const prioritizedRecords = records
    .slice()
    .sort((left, right) => {
      const leftPriority = cleanValue(left.status) === 'ready_for_browser_review' ? 0 : 1;
      const rightPriority = cleanValue(right.status) === 'ready_for_browser_review' ? 0 : 1;
      return leftPriority - rightPriority;
    })
    .slice(0, 8)
    .map((record) => {
      const queueItem = queueItemsById.get(cleanValue(record.item_id)) || null;

      return {
        item_id: cleanValue(record.item_id),
        title: cleanValue(queueItem && queueItem.title) || cleanValue(record.item_id),
        platform: cleanValue(record.platform) || '未知',
        queue_status: cleanValue(record.queue_status) || 'unknown',
        status: cleanValue(record.status) || 'unknown',
        target_url: cleanValue(record.target_url),
        reason: Array.isArray(record.blocked_reasons) && record.blocked_reasons.length > 0
          ? cleanValue(record.blocked_reasons[0])
          : '',
        source: cleanValue(record.source)
      };
    });

  return {
    run_date: cleanValue(payload.run_date) || artifact.run_date,
    mode: cleanValue(payload.mode) || 'unknown',
    total_items: safeNumber(payload.total_items),
    ready_count: safeNumber(payload.ready_count),
    blocked_count: safeNumber(payload.blocked_count),
    ready_for_browser_review_count: readyForBrowserReviewCount,
    missing_target_url_count: missingTargetUrlCount,
    generated_count: safeNumber(payload.generated_count),
    existing_count: safeNumber(payload.existing_count),
    error_count: Array.isArray(payload.errors) ? payload.errors.length : 0,
    blockers: prioritizedRecords.filter((record) => Boolean(record.reason)).slice(0, 5),
    records: prioritizedRecords,
    artifact_path: artifact.path
  };
}

function buildReplySnapshot(payload, artifact) {
  return {
    run_date: cleanValue(payload.run_date) || artifact.run_date,
    mode: cleanValue(payload.mode) || 'unknown',
    total_packets: safeNumber(payload.total_packets),
    ready_count: safeNumber(payload.ready_count),
    blocked_count: safeNumber(payload.blocked_count),
    generated_job_count: safeNumber(payload.generated_job_count),
    generated_result_count: safeNumber(payload.generated_result_count),
    existing_job_count: safeNumber(payload.existing_job_count),
    existing_result_count: safeNumber(payload.existing_result_count),
    error_count: Array.isArray(payload.errors) ? payload.errors.length : 0,
    artifact_path: artifact.path
  };
}

function inferDefaultThreadState(record) {
  if (record.blocked_reasons.length > 0) {
    return 'blocked';
  }

  if (record.manual_required || record.needs_manual_review || record.has_sensitive_content) {
    return 'needs_reply';
  }

  if (record.handoff_ready) {
    return 'ready';
  }

  return 'needs_reply';
}

function applyThreadReviewState(record, threadStateEntry) {
  const manualState = cleanValue(threadStateEntry && threadStateEntry.manual_state);
  const resolvedState = THREAD_MANUAL_STATES.has(manualState)
    ? manualState
    : inferDefaultThreadState(record);

  return {
    ...record,
    review_state: resolvedState,
    review_override: Boolean(THREAD_MANUAL_STATES.has(manualState)),
    review_last_action: cleanValue(threadStateEntry && threadStateEntry.last_action),
    review_note: cleanValue(threadStateEntry && threadStateEntry.note),
    review_updated_at: cleanValue(threadStateEntry && threadStateEntry.updated_at_utc),
    review_updated_by: cleanValue(threadStateEntry && threadStateEntry.updated_by)
  };
}

function buildThreadRecord(packetPayload, artifact, jobPayload, threadStateEntry) {
  const executionContext = packetPayload.execution_context || {};
  const classification = packetPayload.classification || {};
  const sensitivity = packetPayload.sensitivity || {};
  const reply = packetPayload.reply || {};
  const gates = jobPayload && jobPayload.gates ? jobPayload.gates : {};
  const handoff = jobPayload && jobPayload.handoff ? jobPayload.handoff : {};
  const blockedReasons = Array.isArray(gates.blocked_reasons) ? gates.blocked_reasons.map(cleanValue).filter(Boolean) : [];
  const manualRequired = Boolean(
    classification.manual_required
    || reply.needs_manual_review
    || gates.manual_required
    || handoff.requires_manual_review
  );
  const draftText = cleanValue(reply.draft_text);

  return applyThreadReviewState({
    reply_id: cleanValue(packetPayload.reply_id) || artifact.reply_id,
    run_date: cleanValue(packetPayload.run_date) || artifact.run_date,
    created_at: cleanValue(packetPayload.created_at_utc),
    platform: cleanValue(executionContext.platform) || cleanValue(jobPayload && jobPayload.platform) || 'unknown',
    channel_name: cleanValue(executionContext.channel_name) || cleanValue(jobPayload && jobPayload.channel_name),
    target_url: cleanValue(executionContext.target_url) || cleanValue(jobPayload && jobPayload.target_url),
    approval_ticket: cleanValue(executionContext.approval_ticket) || cleanValue(jobPayload && jobPayload.approval_ticket),
    source_kind: cleanValue(packetPayload.input && packetPayload.input.source_kind),
    classification_bucket: cleanValue(classification.bucket) || 'unknown',
    classification_score: safeNumber(classification.score),
    manual_required: manualRequired,
    has_sensitive_content: Boolean(sensitivity.has_sensitive_content),
    handoff_ready: Boolean(handoff.ready_for_human_checkpoint),
    blocked_reasons: blockedReasons,
    needs_manual_review: Boolean(reply.needs_manual_review),
    draft_preview: draftText ? draftText.split(/\r?\n/)[0] : '',
    packet_path: artifact.packet_path,
    job_path: jobPayload ? artifact.job_path : null,
    selectors: jobPayload && jobPayload.selectors ? jobPayload.selectors : null,
    gates: jobPayload && jobPayload.gates ? jobPayload.gates : null,
    raw: {
      packet: packetPayload,
      job: jobPayload || null
    }
  }, threadStateEntry);
}

function buildThreadsSnapshot(artifactSet, threadStateMap = new Map()) {
  const warnings = [];
  const records = [];

  for (const artifact of artifactSet.packets) {
    const packetResult = readOptionalJsonArtifact('ops_snapshot.threads.packet', artifact.packet_path);

    if (!packetResult.ok) {
      if (packetResult.warning) {
        warnings.push(packetResult.warning);
      }
      continue;
    }

    let jobPayload = null;
    const declaredJobPath = cleanValue(packetResult.data && packetResult.data.execution_context && packetResult.data.execution_context.job_path);
    const resolvedJobPath = declaredJobPath || artifact.job_path;

    if (resolvedJobPath) {
      const jobResult = readOptionalJsonArtifact('ops_snapshot.threads.job', resolvedJobPath);
      if (jobResult.ok) {
        jobPayload = jobResult.data;
      } else if (jobResult.warning) {
        warnings.push(jobResult.warning);
      }
    }

    records.push(buildThreadRecord(
      packetResult.data,
      {
        ...artifact,
        run_date: artifactSet.run_date,
        job_path: resolvedJobPath
      },
      jobPayload,
      threadStateMap.get(cleanValue(packetResult.data && packetResult.data.reply_id) || artifact.reply_id)
    ));
  }

  const prioritizedRecords = records
    .slice()
    .sort((left, right) => {
      if (left.manual_required !== right.manual_required) {
        return Number(right.manual_required) - Number(left.manual_required);
      }

      if (left.has_sensitive_content !== right.has_sensitive_content) {
        return Number(right.has_sensitive_content) - Number(left.has_sensitive_content);
      }

      if (left.classification_score !== right.classification_score) {
        return right.classification_score - left.classification_score;
      }

      return cleanValue(right.created_at).localeCompare(cleanValue(left.created_at), 'en');
    });
  const primaryRecord = prioritizedRecords[0] || null;

  return {
    snapshot: {
      run_date: artifactSet.run_date,
      reply_id: primaryRecord ? primaryRecord.reply_id : '',
      platform: primaryRecord ? primaryRecord.platform : '',
      target_url: primaryRecord ? primaryRecord.target_url : '',
      approval_ticket: primaryRecord ? primaryRecord.approval_ticket : '',
      classification: primaryRecord
        ? {
          bucket: primaryRecord.classification_bucket,
          score: primaryRecord.classification_score,
          manual_required: primaryRecord.manual_required
        }
        : null,
      needs_manual_review: primaryRecord ? primaryRecord.needs_manual_review : false,
      draft_preview: primaryRecord ? primaryRecord.draft_preview : '',
      review_state: primaryRecord ? primaryRecord.review_state : 'needs_reply',
      packet_path: primaryRecord ? primaryRecord.packet_path : null,
      job_path: primaryRecord ? primaryRecord.job_path : null,
      selectors: primaryRecord ? primaryRecord.selectors : null,
      gates: primaryRecord ? primaryRecord.gates : null,
      total_packets: records.length,
      needs_reply_count: records.filter((record) => record.review_state === 'needs_reply').length,
      ready_count: records.filter((record) => record.review_state === 'ready').length,
      follow_up_count: records.filter((record) => record.review_state === 'follow_up').length,
      done_count: records.filter((record) => record.review_state === 'done').length,
      manual_review_count: records.filter((record) => record.manual_required).length,
      sensitive_count: records.filter((record) => record.has_sensitive_content).length,
      handoff_ready_count: records.filter((record) => record.handoff_ready).length,
      blocked_count: records.filter((record) => record.blocked_reasons.length > 0).length,
      blocked_inbox_count: records.filter((record) => record.review_state === 'blocked').length,
      platform_count: new Set(records.map((record) => record.platform).filter(Boolean)).size,
      artifact_root: path.resolve(artifactSet.directory),
      records: prioritizedRecords
    },
    warnings
  };
}

function buildFillSnapshot(payload, artifact) {
  const countBucket = (bucket) => {
    if (!bucket || typeof bucket !== 'object') {
      return 0;
    }

    return Object.values(bucket).reduce((total, value) => {
      return total + (Array.isArray(value) ? value.length : 0);
    }, 0);
  };

  const posts = payload.posts || {};
  const replies = payload.replies || {};
  const postsApprovalPending = Array.isArray(posts.approval_pending) ? posts.approval_pending.length : 0;
  const repliesApprovalPending = Array.isArray(replies.approval_pending) ? replies.approval_pending.length : 0;

  return {
    run_date: cleanValue(payload.run_date) || artifact.run_date,
    mode: cleanValue(payload.mode) || 'unknown',
    posts: {
      ready: Array.isArray(posts.ready) ? posts.ready.length : 0,
      approval_pending: postsApprovalPending,
      blocked: Array.isArray(posts.blocked) ? posts.blocked.length : 0,
      executed: Array.isArray(posts.executed) ? posts.executed.length : 0
    },
    replies: {
      ready: Array.isArray(replies.ready) ? replies.ready.length : 0,
      approval_pending: repliesApprovalPending,
      blocked: Array.isArray(replies.blocked) ? replies.blocked.length : 0,
      executed: Array.isArray(replies.executed) ? replies.executed.length : 0
    },
    approval_pending_total: postsApprovalPending + repliesApprovalPending,
    total_records: countBucket(posts) + countBucket(replies),
    cdp_status: cleanValue(payload.cdp_start && payload.cdp_start.status) || 'unknown',
    error_count: Array.isArray(payload.errors) ? payload.errors.length : 0,
    artifact_path: artifact.path
  };
}

function buildMetricsSnapshot(payload, artifact) {
  return {
    run_date: cleanValue(payload.run_date) || artifact.run_date,
    overall_status: cleanValue(payload.status && payload.status.overall) || 'unknown',
    kv_status: cleanValue(payload.status && payload.status.kv) || 'unknown',
    paddle_status: cleanValue(payload.status && payload.status.paddle) || 'unknown',
    analytics_status: cleanValue(payload.status && payload.status.analytics) || 'unknown',
    kv_entries: safeNumber(payload.kv && payload.kv.entries),
    analytics_users: safeNumber(payload.analytics && payload.analytics.users),
    analytics_pageviews: safeNumber(payload.analytics && payload.analytics.pageviews),
    paddle_gross_total: payload.paddle && payload.paddle.gross_total !== null && payload.paddle.gross_total !== undefined
      ? Number(payload.paddle.gross_total)
      : null,
    paddle_currency: cleanValue(payload.paddle && payload.paddle.currency),
    artifact_path: artifact.path
  };
}

function extractMarkdownSection(markdown, heading) {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`## ${escapedHeading}\\n([\\s\\S]*?)(?=\\n## |$)`);
  const match = markdown.match(pattern);
  return match ? cleanValue(match[1]) : '';
}

function parseMarkdownTable(sectionBody) {
  const rows = cleanValue(sectionBody)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|'));

  if (rows.length < 3) {
    return [];
  }

  const headers = rows[0]
    .split('|')
    .map((cell) => cell.trim())
    .filter(Boolean);

  return rows.slice(2).map((line) => {
    const cells = line
      .split('|')
      .map((cell) => cell.trim())
      .filter(Boolean);

    return headers.reduce((accumulator, header, index) => {
      accumulator[header] = cells[index] || '';
      return accumulator;
    }, {});
  });
}

function parseFeedbackHighlights(sectionBody) {
  return cleanValue(sectionBody)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => {
      const match = line.match(/^- `(.+?)` `(.+?)`: (.+)$/);

      if (!match) {
        return {
          timestamp: '',
          session: '',
          summary: line.replace(/^- /, '')
        };
      }

      return {
        timestamp: cleanValue(match[1]),
        session: cleanValue(match[2]),
        summary: cleanValue(match[3])
      };
    });
}

function parseFeedbackReport(markdown) {
  const lines = markdown.split(/\r?\n/);
  const rootCauses = [];
  const suggestedActions = [];
  let section = '';
  let totalIncidents = 0;
  let userFeedbackSignals = 0;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line === '## Root cause buckets') {
      section = 'root_causes';
      continue;
    }

    if (line === '## Suggested operator actions') {
      section = 'actions';
      continue;
    }

    if (/^##\s+/.test(line)) {
      section = '';
      continue;
    }

    const incidentMatch = line.match(/^- Total incidents captured: \*\*(\d+)\*\*/);
    if (incidentMatch) {
      totalIncidents = Number(incidentMatch[1]);
      continue;
    }

    const feedbackMatch = line.match(/^- User feedback signals: \*\*(\d+)\*\*/);
    if (feedbackMatch) {
      userFeedbackSignals = Number(feedbackMatch[1]);
      continue;
    }

    if (section === 'root_causes') {
      const rootCauseMatch = line.match(/^- \*\*(.+?)\*\*: (\d+) incidents/);
      if (rootCauseMatch) {
        rootCauses.push({
          label: rootCauseMatch[1],
          incidents: Number(rootCauseMatch[2])
        });
      }
      continue;
    }

    if (section === 'actions' && line.startsWith('- ')) {
      suggestedActions.push(line.replace(/^- /, ''));
    }
  }

  const recentIncidents = parseMarkdownTable(extractMarkdownSection(markdown, 'Recent incident timeline'))
    .slice(0, 6)
    .map((row) => ({
      time_utc: cleanValue(row['Time (UTC)']),
      kind: cleanValue(row.Kind),
      session: cleanValue(row.Session),
      source: cleanValue(row.Source),
      summary: cleanValue(row.Summary)
    }));

  return {
    total_incidents: totalIncidents,
    user_feedback_signals: userFeedbackSignals,
    root_causes: rootCauses.slice(0, 5),
    suggested_actions: suggestedActions.slice(0, 5),
    recent_incidents: recentIncidents,
    feedback_highlights: parseFeedbackHighlights(extractMarkdownSection(markdown, 'User feedback highlights')).slice(0, 4)
  };
}

function buildFeedbackSnapshot(markdown, artifact) {
  const parsed = parseFeedbackReport(markdown);

  return {
    run_date: artifact.run_date,
    total_incidents: parsed.total_incidents,
    user_feedback_signals: parsed.user_feedback_signals,
    root_causes: parsed.root_causes,
    suggested_actions: parsed.suggested_actions,
    recent_incidents: parsed.recent_incidents,
    feedback_highlights: parsed.feedback_highlights,
    artifact_path: artifact.path
  };
}

function buildOpsSnapshot(queueData, threadStateMap = new Map()) {
  const runsRoot = getRunsRoot();
  const warnings = [];
  const artifacts = {
    supervisor: findLatestRunArtifact(runsRoot, (runDate) => `supervisor/supervisor_run_summary_${runDate}.json`),
    posts: findLatestRunArtifact(runsRoot, () => 'posts/browser_post_queue_summary.json'),
    replies: findLatestRunArtifact(runsRoot, () => 'replies/browser_reply_queue_summary.json'),
    fill: findLatestRunArtifact(runsRoot, () => 'browser_fill/browser_fill_queue_summary.json'),
    metrics: findLatestRunArtifact(runsRoot, (runDate) => `metrics/metrics_summary_${runDate}.json`),
    feedback: findLatestRunArtifact(runsRoot, (runDate) => `feedback/lobster_feedback_report_${runDate}.md`),
    threads: findLatestReplyPacketArtifacts(runsRoot)
  };
  const modules = {};
  const queueItemsById = new Map(((queueData && queueData.items) || []).map((item) => [cleanValue(item.item_id), item]));

  if (artifacts.supervisor) {
    const result = readOptionalJsonArtifact('ops_snapshot.supervisor', artifacts.supervisor.path);
    if (result.ok) {
      modules.supervisor = buildSupervisorSnapshot(result.data, artifacts.supervisor);
    } else if (result.warning) {
      warnings.push(result.warning);
    }
  }

  if (artifacts.posts) {
    const result = readOptionalJsonArtifact('ops_snapshot.posts', artifacts.posts.path);
    if (result.ok) {
      modules.posts = buildPostSnapshot(result.data, artifacts.posts, queueItemsById);
    } else if (result.warning) {
      warnings.push(result.warning);
    }
  }

  if (artifacts.replies) {
    const result = readOptionalJsonArtifact('ops_snapshot.replies', artifacts.replies.path);
    if (result.ok) {
      modules.replies = buildReplySnapshot(result.data, artifacts.replies);
    } else if (result.warning) {
      warnings.push(result.warning);
    }
  }

  if (artifacts.fill) {
    const result = readOptionalJsonArtifact('ops_snapshot.fill', artifacts.fill.path);
    if (result.ok) {
      modules.fill = buildFillSnapshot(result.data, artifacts.fill);
    } else if (result.warning) {
      warnings.push(result.warning);
    }
  }

  if (artifacts.metrics) {
    const result = readOptionalJsonArtifact('ops_snapshot.metrics', artifacts.metrics.path);
    if (result.ok) {
      modules.metrics = buildMetricsSnapshot(result.data, artifacts.metrics);
    } else if (result.warning) {
      warnings.push(result.warning);
    }
  }

  if (artifacts.feedback) {
    const result = readOptionalTextArtifact('ops_snapshot.feedback', artifacts.feedback.path);
    if (result.ok) {
      modules.feedback = buildFeedbackSnapshot(result.data, artifacts.feedback);
    } else if (result.warning) {
      warnings.push(result.warning);
    }
  }

  if (artifacts.threads) {
    const result = buildThreadsSnapshot(artifacts.threads, threadStateMap);
    if (result.snapshot.total_packets > 0) {
      modules.threads = result.snapshot;
    }
    warnings.push(...result.warnings);
  }

  const latestRunDate = Object.values(modules)
    .map((module) => cleanValue(module && module.run_date))
    .filter(Boolean)
    .sort((left, right) => right.localeCompare(left, 'en'))[0] || '';

  return {
    available: Object.keys(modules).length > 0,
    latest_run_date: latestRunDate,
    runs_root: path.resolve(runsRoot),
    summary: {
      post_review_ready_count: safeNumber(modules.posts && modules.posts.ready_for_browser_review_count),
      post_missing_target_url_count: safeNumber(modules.posts && modules.posts.missing_target_url_count),
      fill_approval_pending_count: safeNumber(modules.fill && modules.fill.approval_pending_total),
      feedback_incident_count: safeNumber(modules.feedback && modules.feedback.total_incidents),
      thread_manual_review_count: safeNumber(modules.threads && modules.threads.manual_review_count),
      thread_handoff_ready_count: safeNumber(modules.threads && modules.threads.handoff_ready_count),
      metrics_overall_status: cleanValue(modules.metrics && modules.metrics.overall_status) || 'unknown',
      supervisor_run_status: cleanValue(modules.supervisor && modules.supervisor.run_status) || 'unknown'
    },
    warnings,
    modules
  };
}

function cleanValue(value) {
  if (value === null || value === undefined) {
    return '';
  }

  const normalized = String(value).trim();
  return normalized === '-' ? '' : normalized;
}

function mergeNotes(...parts) {
  return [...new Set(parts.map(cleanValue).filter(Boolean))].join(' • ');
}

function normalizeReviewhub(queueItem) {
  return queueItem && queueItem.reviewhub && typeof queueItem.reviewhub === 'object'
    ? queueItem.reviewhub
    : null;
}

function normalizePlatform(value) {
  return cleanValue(value).toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function normalizeText(value) {
  return cleanValue(value).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
}

function findApprovalMatch(queueItem, pendingApprovals) {
  const exactSourceMatches = pendingApprovals.filter((entry) => {
    return (
      cleanValue(entry.source).toLowerCase() === cleanValue(queueItem.source).toLowerCase()
    );
  });

  if (exactSourceMatches.length === 1) {
    return exactSourceMatches[0];
  }

  if (exactSourceMatches.length > 1) {
    const platformMatch = exactSourceMatches.find((entry) => {
      return normalizePlatform(entry.platform) === normalizePlatform(queueItem.platform);
    });

    return platformMatch || exactSourceMatches[0];
  }

  const queueTitle = normalizeText(queueItem.title);

  return (
    pendingApprovals.find((entry) => {
      return (
        normalizePlatform(entry.platform) === normalizePlatform(queueItem.platform) &&
        [entry.notes, entry.post_id, entry.item_id].some((candidate) => {
          const normalizedCandidate = normalizeText(candidate);
          return normalizedCandidate && queueTitle.includes(normalizedCandidate);
        })
      );
    }) || null
  );
}

function getApprovalCandidates(queueItem, approvalEntries) {
  const status = cleanValue(queueItem.status);

  if (status === 'approval_pending') {
    return approvalEntries.filter((entry) => cleanValue(entry.status) === 'pending');
  }

  if (status === 'queued') {
    const approvedApprovals = approvalEntries.filter((entry) => cleanValue(entry.status) === 'approved');
    return approvedApprovals.length > 0 ? approvedApprovals : approvalEntries;
  }

  return approvalEntries;
}

function resolveApprovalForQueueItem(queueItem, approvalEntries) {
  const reviewhub = normalizeReviewhub(queueItem);
  const linkedApprovalEntryId = cleanValue(reviewhub && reviewhub.linked_approval_entry_id);

  if (linkedApprovalEntryId) {
    const linkedApproval = approvalEntries.find((entry) => cleanValue(entry.entry_id) === linkedApprovalEntryId);
    if (linkedApproval) {
      return linkedApproval;
    }
  }

  return findApprovalMatch(queueItem, getApprovalCandidates(queueItem, approvalEntries));
}

function getPlatformCount(queueData, items) {
  const configuredPlatforms = Object.keys(queueData.platform_counts || {});

  if (configuredPlatforms.length > 0) {
    return configuredPlatforms.length;
  }

  return new Set(items.map((item) => item.platform).filter(Boolean)).size;
}

function detectProjectFromText(text) {
  const haystack = cleanValue(text).toLowerCase();

  if (/\baion\b|灵汐/.test(haystack)) {
    return 'Aion';
  }

  if (/\baether\b/.test(haystack)) {
    return 'Aether';
  }

  if (/reviewhub/.test(haystack)) {
    return 'ReviewHub';
  }

  return '';
}

function readSourceSnippet(sourcePath) {
  const relativePath = cleanValue(sourcePath);
  const operationsRoot = path.resolve(getOperationsRoot());

  if (!relativePath) {
    return '';
  }

  try {
    const absolutePath = path.resolve(operationsRoot, relativePath);

    if (!absolutePath.startsWith(operationsRoot)) {
      return '';
    }

    if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
      return '';
    }

    return fs.readFileSync(absolutePath, 'utf8').slice(0, 4000);
  } catch (_error) {
    return '';
  }
}

function inferProject(queueItem, approval) {
  const metadataText = [
    cleanValue(queueItem.title),
    cleanValue(queueItem.notes),
    cleanValue(queueItem.source),
    cleanValue(queueItem.category),
    cleanValue(approval && approval.notes),
    cleanValue(approval && approval.post_id),
    cleanValue(approval && approval.item_id),
    cleanValue(approval && approval.source)
  ].join(' ');

  const metadataProject = detectProjectFromText(metadataText);

  if (metadataProject) {
    return metadataProject;
  }

  const sourceProject = detectProjectFromText(readSourceSnippet(queueItem.source || (approval && approval.source)));

  if (sourceProject) {
    return sourceProject;
  }

  return 'Unassigned';
}

function inferActionState(queueItem, approval) {
  const reviewhub = normalizeReviewhub(queueItem);
  const manualActionState = cleanValue(reviewhub && reviewhub.manual_action_state);
  const manualMissingInfo = Array.isArray(reviewhub && reviewhub.missing_info_reasons)
    ? reviewhub.missing_info_reasons.map(cleanValue).filter(Boolean)
    : [];

  if (manualActionState === 'missing_info') {
    return {
      key: 'missing_info',
      label: 'Needs info',
      missing_info: manualMissingInfo.length > 0 ? manualMissingInfo : ['manual review']
    };
  }

  if (manualActionState === 'ready_to_execute') {
    return {
      key: 'ready_to_execute',
      label: 'Ready to execute',
      missing_info: []
    };
  }

  if (manualActionState === 'needs_review') {
    return {
      key: 'needs_review',
      label: 'Needs review',
      missing_info: []
    };
  }

  const status = cleanValue(queueItem.status) || cleanValue(approval && approval.status);
  const hasApproval = Boolean(approval);
  const hasReason = Boolean(cleanValue(approval && approval.reason));
  const hasOwner = Boolean(cleanValue(queueItem.owner) || cleanValue(approval && approval.requested_by));
  const missingInfo = [];

  if (status === 'approval_pending' && !hasApproval) {
    missingInfo.push('approval match');
  }

  if (status === 'approval_pending' && !hasReason) {
    missingInfo.push('approval reason');
  }

  if (!hasOwner) {
    missingInfo.push('owner');
  }

  if (missingInfo.length > 0) {
    return {
      key: 'missing_info',
      label: 'Needs info',
      missing_info: missingInfo
    };
  }

  if (status === 'approval_pending') {
    return {
      key: 'needs_review',
      label: 'Needs review',
      missing_info: []
    };
  }

  return {
    key: 'ready_to_execute',
    label: 'Ready to execute',
    missing_info: []
  };
}

function buildItems(queueData, approvalData) {
  const approvalEntries = approvalData.entries || [];

  return (queueData.items || [])
    .filter((item) => item.status === 'approval_pending' || item.status === 'queued')
    .map((queueItem, index) => {
      const reviewhub = normalizeReviewhub(queueItem);
      const approval = resolveApprovalForQueueItem(queueItem, approvalEntries);
      const queueNotes = cleanValue(queueItem.notes);
      const approvalNotes = cleanValue(approval && approval.notes);
      const actionState = inferActionState(queueItem, approval);

      return {
        id: cleanValue(queueItem.item_id) || `queue-item-${index + 1}`,
        record_type: 'queue_item',
        title: cleanValue(queueItem.title) || cleanValue(approval && approval.notes) || 'Untitled',
        platform: cleanValue(queueItem.platform) || cleanValue(approval && approval.platform) || '未知',
        project: inferProject(queueItem, approval),
        status: cleanValue(queueItem.status) || cleanValue(approval && approval.status) || 'unknown',
        risk: cleanValue(queueItem.risk) || 'unknown',
        category: cleanValue(queueItem.category),
        owner: cleanValue(queueItem.owner) || cleanValue(approval && approval.requested_by),
        notes: mergeNotes(queueNotes, approvalNotes),
        reason: cleanValue(approval && approval.reason),
        source: cleanValue(queueItem.source) || cleanValue(approval && approval.source),
        requested_at: cleanValue(approval && approval.requested_at_utc),
        requested_by: cleanValue(approval && approval.requested_by),
        approval_ticket: cleanValue(approval && approval.approval_ticket),
        approval_entry_id: cleanValue(approval && approval.entry_id) || cleanValue(reviewhub && reviewhub.linked_approval_entry_id),
        approval_match: Boolean(approval),
        action_state: actionState.key,
        action_label: actionState.label,
        missing_info: actionState.missing_info,
        review_override: Boolean(cleanValue(reviewhub && reviewhub.manual_action_state)),
        review_last_action: cleanValue(reviewhub && reviewhub.last_action),
        review_note: cleanValue(reviewhub && reviewhub.action_note),
        review_updated_at: cleanValue(reviewhub && reviewhub.updated_at_utc),
        review_updated_by: cleanValue(reviewhub && reviewhub.updated_by),
        raw: {
          queue: queueItem,
          approval: approval || null
        }
      };
    });
}

function buildFilterValues(items) {
  const unique = (field) => {
    return [...new Set(items.map((item) => item[field]).filter(Boolean))].sort((left, right) => {
      return left.localeCompare(right, 'en', { sensitivity: 'base' });
    });
  };

  return {
    action_states: unique('action_state'),
    statuses: unique('status'),
    platforms: unique('platform'),
    projects: unique('project'),
    risks: unique('risk')
  };
}

function getApprovalPath() {
  return process.env.APPROVAL_REGISTRY_PATH || DEFAULT_APPROVAL_PATH;
}

function getQueuePath() {
  return process.env.DAILY_CHANNEL_QUEUE_PATH || DEFAULT_QUEUE_PATH;
}

function getActionLogPath() {
  return process.env.REVIEWHUB_ACTION_LOG_PATH
    || path.join(path.resolve(getOperationsRoot()), 'Ops', 'state', ACTION_LOG_FILENAME);
}

function getThreadActionLogPath() {
  return process.env.REVIEWHUB_THREAD_ACTION_LOG_PATH
    || path.join(path.resolve(getOperationsRoot()), 'Ops', 'state', THREAD_ACTION_LOG_FILENAME);
}

function normalizeActionLogEntry(entry, index) {
  return {
    id: cleanValue(entry.id) || `action-log-${index + 1}`,
    timestamp_utc: cleanValue(entry.timestamp_utc),
    actor: cleanValue(entry.actor),
    item_id: cleanValue(entry.item_id),
    action: cleanValue(entry.action),
    note: cleanValue(entry.note),
    reasons: Array.isArray(entry.reasons) ? entry.reasons.map(cleanValue).filter(Boolean) : [],
    linked_approval_entry_id: cleanValue(entry.linked_approval_entry_id)
  };
}

function loadActionLog(limit = 40) {
  const actionLogPath = path.resolve(getActionLogPath());

  try {
    const raw = fs.readFileSync(actionLogPath, 'utf8');
    const issues = [];
    const entries = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, index) => {
        try {
          return normalizeActionLogEntry(JSON.parse(line), index);
        } catch (error) {
          issues.push({
            source: 'action_log',
            path: actionLogPath,
            message: '审计日志中有无法解析的记录。',
            hint: error.message
          });
          return null;
        }
      })
      .filter(Boolean)
      .slice(-limit)
      .reverse();

    return {
      available: true,
      path: actionLogPath,
      entries,
      issues
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {
        available: false,
        path: actionLogPath,
        entries: [],
        issues: []
      };
    }

    return {
      available: false,
      path: actionLogPath,
      entries: [],
      issues: [{
        source: 'action_log',
        path: actionLogPath,
        message: '审计日志暂时无法读取。',
        hint: error.message
      }]
    };
  }
}

function normalizeThreadActionEntry(entry, index) {
  const manualState = cleanValue(entry.manual_state);

  return {
    id: cleanValue(entry.id) || `thread-action-log-${index + 1}`,
    timestamp_utc: cleanValue(entry.timestamp_utc),
    actor: cleanValue(entry.actor),
    reply_id: cleanValue(entry.reply_id),
    action: cleanValue(entry.action),
    note: cleanValue(entry.note),
    manual_state: THREAD_MANUAL_STATES.has(manualState) ? manualState : '',
    approval_ticket: cleanValue(entry.approval_ticket)
  };
}

function loadThreadActionLog(limit = 120) {
  const threadActionLogPath = path.resolve(getThreadActionLogPath());

  try {
    const raw = fs.readFileSync(threadActionLogPath, 'utf8');
    const issues = [];
    const entries = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, index) => {
        try {
          return normalizeThreadActionEntry(JSON.parse(line), index);
        } catch (error) {
          issues.push({
            source: 'thread_action_log',
            path: threadActionLogPath,
            message: '线程处理日志中有无法解析的记录。',
            hint: error.message
          });
          return null;
        }
      })
      .filter(Boolean)
      .slice(-limit)
      .reverse();

    return {
      available: true,
      path: threadActionLogPath,
      entries,
      issues
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {
        available: false,
        path: threadActionLogPath,
        entries: [],
        issues: []
      };
    }

    return {
      available: false,
      path: threadActionLogPath,
      entries: [],
      issues: [{
        source: 'thread_action_log',
        path: threadActionLogPath,
        message: '线程处理日志暂时无法读取。',
        hint: error.message
      }]
    };
  }
}

function buildThreadStateMap(threadActionLog) {
  const stateMap = new Map();

  for (const entry of [...(threadActionLog.entries || [])].reverse()) {
    const replyId = cleanValue(entry.reply_id);

    if (!replyId) {
      continue;
    }

    stateMap.set(replyId, {
      manual_state: cleanValue(entry.manual_state),
      last_action: cleanValue(entry.action),
      note: cleanValue(entry.note),
      updated_at_utc: cleanValue(entry.timestamp_utc),
      updated_by: cleanValue(entry.actor),
      approval_ticket: cleanValue(entry.approval_ticket)
    });
  }

  return stateMap;
}

function createUnavailableOperationsReview(error) {
  const issue = {
    source: 'operations_review',
    path: '',
    message: error.message
  };

  return {
    available: false,
    source_files: {},
    summary: {
      review_count: 0,
      attention_count: 0,
      experiment_count: 0,
      active_experiment_count: 0,
      feedback_incidents: 0,
      browser_ready_count: 0,
      browser_blocked_count: 0
    },
    reviews: { entries: [], updated_at: '', path: '', issues: [issue] },
    experiments: { entries: [], updated_at: '', path: '', issues: [issue] },
    feedback: {
      run_date: '',
      generated_at: '',
      summary: {
        total_incidents: 0,
        session_errors: 0,
        gateway_errors: 0,
        user_feedback_signals: 0
      },
      root_causes: [],
      path: '',
      issues: [issue]
    },
    post_handoffs: {
      run_date: '',
      total_items: 0,
      ready_count: 0,
      blocked_count: 0,
      path: '',
      records: [],
      issues: [issue]
    },
    issues: [issue]
  };
}

function loadDashboardData() {
  const approvalPath = getApprovalPath();
  const queuePath = getQueuePath();
  const approvalResult = readJsonSource('approval_registry', approvalPath);
  const queueResult = readJsonSource('daily_channel_queue', queuePath);
  const sourceFiles = {
    approval_registry: path.resolve(approvalPath),
    daily_channel_queue: path.resolve(queuePath)
  };
  const readIssues = [approvalResult.detail, queueResult.detail].filter(Boolean);

  if (readIssues.length > 0) {
    throw new DashboardDataError('ReviewHub 无法读取一个或多个源文件。', {
      details: readIssues,
      source_files: sourceFiles
    });
  }

  const validationIssues = [
    ...validateApprovalData(approvalResult.data, approvalPath),
    ...validateQueueData(queueResult.data, queuePath)
  ];

  if (validationIssues.length > 0) {
    throw new DashboardDataError('ReviewHub 源文件不符合预期 schema。', {
      details: validationIssues,
      source_files: sourceFiles
    });
  }

  const approvalData = approvalResult.data;
  const queueData = queueResult.data;
  const items = buildItems(queueData, approvalData);
  const pendingApprovals = (approvalData.entries || []).filter((entry) => entry.status === 'pending');
  const actionLog = loadActionLog();
  const threadActionLog = loadThreadActionLog();
  const opsSnapshot = buildOpsSnapshot(queueData, buildThreadStateMap(threadActionLog));
  let operationsReview;

  try {
    operationsReview = {
      available: true,
      ...loadOperationsReviewData()
    };
  } catch (error) {
    operationsReview = createUnavailableOperationsReview(error);
  }

  const actionBuckets = {
    needs_review: items.filter((item) => item.action_state === 'needs_review'),
    ready_to_execute: items.filter((item) => item.action_state === 'ready_to_execute'),
    missing_info: items.filter((item) => item.action_state === 'missing_info')
  };

  return {
    generated_at: new Date().toISOString(),
    source_files: sourceFiles,
    summary: {
      pending_approvals: pendingApprovals.length,
      approval_pending_items: Number(queueData.status_counts && queueData.status_counts.approval_pending) || items.filter((item) => item.status === 'approval_pending').length,
      queued_items: Number(queueData.status_counts && queueData.status_counts.queued) || items.filter((item) => item.status === 'queued').length,
      platform_count: getPlatformCount(queueData, items),
      status_count: new Set(items.map((item) => item.status).filter(Boolean)).size,
      total_items: items.length,
      needs_review_count: actionBuckets.needs_review.length,
      ready_to_execute_count: actionBuckets.ready_to_execute.length,
      missing_info_count: actionBuckets.missing_info.length
    },
    metadata: {
      approval_schema: cleanValue(approvalData.schema_version),
      approval_updated_at: cleanValue(approvalData.updated_at_utc),
      queue_schema: cleanValue(queueData.schema_version),
      queue_run_date: cleanValue(queueData.run_date),
      action_log_available: actionLog.available,
      thread_action_log_available: threadActionLog.available
    },
    filters: buildFilterValues(items),
    action_buckets: {
      needs_review: actionBuckets.needs_review.map((item) => item.id),
      ready_to_execute: actionBuckets.ready_to_execute.map((item) => item.id),
      missing_info: actionBuckets.missing_info.map((item) => item.id)
    },
    action_log: actionLog,
    thread_action_log: threadActionLog,
    ops_snapshot: opsSnapshot,
    operations_review: operationsReview,
    items
  };
}

module.exports = {
  DashboardDataError,
  buildOpsSnapshot,
  buildItems,
  createSourceIssue,
  findApprovalMatch,
  getApprovalCandidates,
  getOperationsRoot,
  getApprovalPath,
  getActionLogPath,
  getQueuePath,
  getThreadActionLogPath,
  getRunsRoot,
  inferActionState,
  loadDashboardData,
  readJsonSource,
  validateApprovalData,
  validateQueueData
};
