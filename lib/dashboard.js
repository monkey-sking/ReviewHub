const fs = require('fs');
const path = require('path');
const { loadOperationsReviewData } = require('./operationsReview');
const { buildOperationsRecordCatalog } = require('./operationsRecords');

const DEFAULT_OPERATIONS_ROOT = '/Volumes/SSD/Projects/Operations';
const DEFAULT_APPROVAL_PATH = '/Volumes/SSD/Projects/Operations/Ops/state/approval_registry.json';
const DEFAULT_QUEUE_PATH = '/Volumes/SSD/Projects/Operations/Ops/state/daily_channel_queue.json';
const DEFAULT_RUNS_ROOT = '/Volumes/SSD/Projects/Operations/Ops/runs';
const ACTION_LOG_FILENAME = 'reviewhub_action_log.ndjson';
const THREAD_ACTION_LOG_FILENAME = 'reviewhub_thread_action_log.ndjson';
const OPS_ACTION_LOG_FILENAME = 'reviewhub_ops_action_log.ndjson';
const THREAD_MANUAL_STATES = new Set(['ready', 'needs_reply', 'follow_up', 'blocked', 'done']);
const OPS_MANUAL_STATES = new Set(['review', 'execute', 'defer', 'done']);

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



function normalizeSourceArtifactReference(reference) {
  return cleanValue(reference)
    .replace(/[)>]+$/g, '')
    .replace(/[.,]+$/g, '');
}

function normalizeSourceArtifactLabel(label) {
  const value = cleanValue(label);
  return value || '未命名资源';
}

function inferSourceArtifactKind(candidate) {
  const value = cleanValue(candidate).toLowerCase();

  if (!value) {
    return 'reference';
  }

  if (/\.(png|jpe?g|gif|webp|svg)(\?.*)?$/.test(value) || /image/.test(value)) {
    return 'image';
  }

  if (/\.(mp4|mov|m4v|webm)(\?.*)?$/.test(value) || /video/.test(value)) {
    return 'video';
  }

  return 'reference';
}

function extractSourceArtifacts(snippet) {
  const artifacts = [];
  const seen = new Set();
  const lines = cleanValue(snippet).split(/\r?\n/);

  const pushArtifact = (artifact) => {
    const ref = normalizeSourceArtifactReference(artifact.reference);
    const dedupeKey = `${artifact.kind}|${ref}`;

    if (!ref || seen.has(dedupeKey)) {
      return;
    }

    seen.add(dedupeKey);
    artifacts.push({
      kind: artifact.kind || inferSourceArtifactKind(ref),
      label: normalizeSourceArtifactLabel(artifact.label),
      reference: ref
    });
  };

  for (const line of lines) {
    const markdownImageMatches = [...line.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)];
    for (const match of markdownImageMatches) {
      pushArtifact({
        kind: 'image',
        label: match[1],
        reference: match[2]
      });
    }

    const markdownLinkMatches = [...line.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)];
    for (const match of markdownLinkMatches) {
      if (line.includes(`![${match[1]}](${match[2]})`)) {
        continue;
      }

      pushArtifact({
        kind: inferSourceArtifactKind(match[2]),
        label: match[1],
        reference: match[2]
      });
    }

    const htmlCommentMatch = line.match(/<!--\s*(.*?)\s*-->/);
    if (htmlCommentMatch) {
      const body = cleanValue(htmlCommentMatch[1]);
      const urlMatch = body.match(/https?:\/\/\S+/i);
      pushArtifact({
        kind: inferSourceArtifactKind(urlMatch ? urlMatch[0] : body),
        label: body.replace(/https?:\/\/\S+/i, '').trim() || body,
        reference: urlMatch ? urlMatch[0] : body
      });
    }

    const bareUrlMatches = [...line.matchAll(/https?:\/\/\S+/ig)];
    for (const match of bareUrlMatches) {
      pushArtifact({
        kind: inferSourceArtifactKind(match[0]),
        label: match[0],
        reference: match[0]
      });
    }
  }

  return artifacts.slice(0, 12);
}

function buildSourceDetails(relativePath) {
  const operationsRoot = path.resolve(getOperationsRoot());
  const relative = cleanValue(relativePath);

  if (!relative) {
    return {
      relative_path: '',
      absolute_path: '',
      available: false,
      preview: '',
      artifact_count: 0,
      artifacts: []
    };
  }

  try {
    const absolutePath = path.resolve(operationsRoot, relative);

    if (!absolutePath.startsWith(operationsRoot)) {
      return {
        relative_path: relative,
        absolute_path: '',
        available: false,
        preview: '',
        artifact_count: 0,
        artifacts: []
      };
    }

    if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
      return {
        relative_path: relative,
        absolute_path: absolutePath,
        available: false,
        preview: '',
        artifact_count: 0,
        artifacts: []
      };
    }

    const preview = fs.readFileSync(absolutePath, 'utf8').slice(0, 4000);
    const artifacts = extractSourceArtifacts(preview);

    return {
      relative_path: relative,
      absolute_path: absolutePath,
      available: true,
      preview,
      artifact_count: artifacts.length,
      artifacts
    };
  } catch (_error) {
    return {
      relative_path: relative,
      absolute_path: '',
      available: false,
      preview: '',
      artifact_count: 0,
      artifacts: []
    };
  }
}

function buildRecentActivity(actionLog, threadActionLog, opsActionLog, limit = 16) {
  const queueEntries = (actionLog && actionLog.entries ? actionLog.entries : []).map((entry) => ({
    id: `queue:${entry.id}`,
    kind: 'queue',
    timestamp_utc: cleanValue(entry.timestamp_utc),
    actor: cleanValue(entry.actor),
    target_id: cleanValue(entry.item_id),
    action: cleanValue(entry.action),
    note: cleanValue(entry.note),
    reasons: Array.isArray(entry.reasons) ? entry.reasons.map(cleanValue).filter(Boolean) : [],
    linked_approval_entry_id: cleanValue(entry.linked_approval_entry_id)
  }));
  const threadEntries = (threadActionLog && threadActionLog.entries ? threadActionLog.entries : []).map((entry) => ({
    id: `thread:${entry.id}`,
    kind: 'thread',
    timestamp_utc: cleanValue(entry.timestamp_utc),
    actor: cleanValue(entry.actor),
    target_id: cleanValue(entry.reply_id),
    action: cleanValue(entry.action),
    note: cleanValue(entry.note),
    manual_state: cleanValue(entry.manual_state),
    approval_ticket: cleanValue(entry.approval_ticket)
  }));
  const opsEntries = (opsActionLog && opsActionLog.entries ? opsActionLog.entries : []).map((entry) => ({
    id: `ops:${entry.id}`,
    kind: 'ops',
    timestamp_utc: cleanValue(entry.timestamp_utc),
    actor: cleanValue(entry.actor),
    target_id: cleanValue(entry.ui_id),
    action_id: cleanValue(entry.action_id),
    record_kind: cleanValue(entry.record_kind),
    record_title: cleanValue(entry.record_title),
    action: cleanValue(entry.action),
    note: cleanValue(entry.note),
    manual_state: cleanValue(entry.manual_state),
    defer_until_utc: cleanValue(entry.defer_until_utc)
  }));

  const sortedEntries = [...queueEntries, ...threadEntries, ...opsEntries]
    .sort((left, right) => cleanValue(right.timestamp_utc).localeCompare(cleanValue(left.timestamp_utc), 'en'));
  const limitedEntries = sortedEntries.slice(0, limit);

  return {
    total_entries: sortedEntries.length,
    queue_count: queueEntries.length,
    thread_count: threadEntries.length,
    ops_count: opsEntries.length,
    entries: limitedEntries
  };
}

function normalizeJoinKey(value) {
  return cleanValue(value).toLowerCase();
}

function toSortableTimestamp(value, fallbackDate = '') {
  const raw = cleanValue(value);

  if (raw) {
    const parsed = new Date(raw);

    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return `${raw}T00:00:00.000Z`;
    }
  }

  if (fallbackDate && /^\d{4}-\d{2}-\d{2}$/.test(fallbackDate)) {
    return `${fallbackDate}T00:00:00.000Z`;
  }

  return '';
}

function comparePrioritizedEntries(left, right) {
  const leftPriority = safeNumber(left && left.priority_rank);
  const rightPriority = safeNumber(right && right.priority_rank);

  if (leftPriority !== rightPriority) {
    return rightPriority - leftPriority;
  }

  const leftTimestamp = cleanValue(left && left.timestamp_utc);
  const rightTimestamp = cleanValue(right && right.timestamp_utc);

  if (leftTimestamp !== rightTimestamp) {
    return rightTimestamp.localeCompare(leftTimestamp, 'en');
  }

  return cleanValue(left && left.id).localeCompare(cleanValue(right && right.id), 'en');
}

function isDeferredUntilFuture(value) {
  const raw = cleanValue(value);

  if (!raw) {
    return false;
  }

  const parsed = new Date(raw);

  return !Number.isNaN(parsed.getTime()) && parsed.getTime() > Date.now();
}

function buildDailyProcessingQueue(items, operationsReview, opsSnapshot, operationsRecordCatalog) {
  const entries = [];
  const operationsRecordByUiId = new Map(
    (operationsRecordCatalog || []).map((record) => [cleanValue(record.ui_id), record])
  );
  const postHandoffRecords = operationsReview && operationsReview.available !== false
    && operationsReview.post_handoffs
    && Array.isArray(operationsReview.post_handoffs.records)
    ? operationsReview.post_handoffs.records
    : [];
  const handoffBySource = new Map(
    postHandoffRecords
      .filter((record) => cleanValue(record.source))
      .map((record, index) => [normalizeJoinKey(record.source), { ...record, record_id: `handoff:${index}` }])
  );
  const threads = opsSnapshot
    && opsSnapshot.modules
    && opsSnapshot.modules.threads
    && Array.isArray(opsSnapshot.modules.threads.records)
    ? opsSnapshot.modules.threads.records
    : [];
  const reviews = operationsReview && operationsReview.available !== false
    && operationsReview.reviews
    && Array.isArray(operationsReview.reviews.entries)
    ? operationsReview.reviews.entries
    : [];
  const reviewPriority = {
    red: { priority: 'high', priority_rank: 100 },
    pause: { priority: 'medium', priority_rank: 70 },
    watch: { priority: 'medium', priority_rank: 65 }
  };

  for (const item of items || []) {
    if (cleanValue(item.action_state) === 'deferred' && isDeferredUntilFuture(item.review_defer_until)) {
      continue;
    }

    const handoff = handoffBySource.get(normalizeJoinKey(item.source));
    const missingInfo = Array.isArray(item.missing_info) ? item.missing_info.map(cleanValue).filter(Boolean) : [];
    let priority = 'low';
    let priorityRank = 40;

    if (item.action_state === 'missing_info') {
      priority = 'high';
      priorityRank = 100;
    } else if (item.action_state === 'deferred') {
      priority = 'low';
      priorityRank = 25;
    } else if (item.action_state === 'needs_review') {
      priority = 'high';
      priorityRank = 90;
    } else if (handoff && cleanValue(handoff.status) === 'needs_target_url') {
      priority = 'high';
      priorityRank = 85;
    } else if (handoff && cleanValue(handoff.status) === 'ready_for_browser_review') {
      priority = 'medium';
      priorityRank = 70;
    } else if (item.action_state === 'ready_to_execute') {
      priority = 'medium';
      priorityRank = 60;
    }

    entries.push({
      id: `queue:${item.id}`,
      source_kind: 'queue',
      title: cleanValue(item.title) || cleanValue(item.id) || 'unknown item',
      platform: cleanValue(item.platform) || 'unknown',
      project: cleanValue(item.project) || 'unknown',
      queue_status: cleanValue(item.status) || 'unknown',
      lane_status: cleanValue(item.action_state) || 'unknown',
      handoff_status: cleanValue(handoff && handoff.status),
      priority,
      priority_rank: priorityRank,
      timestamp_utc: toSortableTimestamp(item.review_updated_at || item.requested_at, opsSnapshot && opsSnapshot.latest_run_date),
      summary: [
        cleanValue(item.platform) || 'unknown',
        cleanValue(item.project) || '',
        cleanValue(item.action_label || item.action_state) || ''
      ].filter(Boolean).join(' · '),
      note: [
        missingInfo.length > 0 ? `缺失：${missingInfo.join('，')}` : '',
        item.review_defer_until ? `暂缓至：${item.review_defer_until}` : '',
        handoff && handoff.blocked_reasons && handoff.blocked_reasons.length > 0 ? `交接：${handoff.blocked_reasons.join('，')}` : '',
        cleanValue(item.review_note),
        cleanValue(item.reason),
        cleanValue(item.notes)
      ].filter(Boolean)[0] || '',
      preview: cleanValue(item.source_details && item.source_details.preview).split(/\r?\n/).find((line) => cleanValue(line)) || '',
      source_path: cleanValue(item.source),
      target_url: cleanValue(handoff && handoff.target_url),
      navigation: {
        kind: 'queue',
        target_id: cleanValue(item.id),
        section: 'queue'
      },
      raw_refs: {
        source_path: cleanValue(item.source),
        handoff_summary_path: cleanValue(operationsReview && operationsReview.post_handoffs && operationsReview.post_handoffs.path),
        handoff_job_path: cleanValue(handoff && handoff.job_path)
      }
    });
  }

  for (const thread of threads) {
    if (cleanValue(thread.review_state) === 'done') {
      continue;
    }

    let priority = 'medium';
    let priorityRank = 60;

    if (cleanValue(thread.review_state) === 'blocked') {
      priority = 'high';
      priorityRank = 95;
    } else if (cleanValue(thread.review_state) === 'needs_reply') {
      priority = 'high';
      priorityRank = 90;
    } else if (cleanValue(thread.review_state) === 'follow_up') {
      priority = 'medium';
      priorityRank = 75;
    }

    entries.push({
      id: `thread:${thread.reply_id}`,
      source_kind: 'thread',
      title: cleanValue(thread.reply_id) || 'unknown reply',
      platform: cleanValue(thread.platform) || 'unknown',
      project: '',
      queue_status: '',
      lane_status: cleanValue(thread.review_state) || 'unknown',
      handoff_status: cleanValue(thread.handoff_ready ? 'ready' : ''),
      priority,
      priority_rank: priorityRank,
      timestamp_utc: toSortableTimestamp(thread.review_updated_at || thread.created_at, cleanValue(thread.run_date)),
      summary: [
        cleanValue(thread.platform) || 'unknown',
        cleanValue(thread.source_kind) || '',
        cleanValue(thread.classification_bucket) ? `Bucket ${thread.classification_bucket}` : ''
      ].filter(Boolean).join(' · '),
      note: [
        thread.blocked_reasons && thread.blocked_reasons.length > 0 ? thread.blocked_reasons.join('，') : '',
        cleanValue(thread.review_note),
        cleanValue(thread.draft_preview)
      ].filter(Boolean)[0] || '',
      preview: cleanValue(thread.draft_preview),
      source_path: cleanValue(thread.packet_path),
      target_url: cleanValue(thread.target_url),
      navigation: {
        kind: 'thread',
        target_id: cleanValue(thread.reply_id),
        section: 'pipeline'
      },
      raw_refs: {
        packet_path: cleanValue(thread.packet_path),
        job_path: cleanValue(thread.job_path)
      }
    });
  }

  for (let index = 0; index < reviews.length; index += 1) {
    const review = reviews[index];
    const reviewRecord = operationsRecordByUiId.get(`review:${index}`) || null;
    const reviewState = cleanValue(reviewRecord && reviewRecord.review_state);
    const status = normalizeJoinKey(review.status);
    const config = reviewPriority[status];

    if (!config) {
      continue;
    }

    if (reviewState === 'done') {
      continue;
    }

    if (reviewState === 'defer' && isDeferredUntilFuture(cleanValue(reviewRecord && reviewRecord.review_defer_until))) {
      continue;
    }

    let priority = config.priority;
    let priorityRank = config.priority_rank;

    if (reviewState === 'defer') {
      priority = 'low';
      priorityRank = 30;
    } else if (reviewState === 'execute') {
      priority = 'medium';
      priorityRank = Math.max(priorityRank, 75);
    } else if (reviewState === 'review') {
      priority = 'high';
      priorityRank = Math.max(priorityRank, 95);
    }

    entries.push({
      id: `review:${index}`,
      source_kind: 'review',
      title: cleanValue(review.job) || 'unnamed review',
      platform: '',
      project: '',
      queue_status: '',
      lane_status: reviewState || cleanValue(review.status) || 'unknown',
      handoff_status: '',
      priority,
      priority_rank: priorityRank,
      timestamp_utc: toSortableTimestamp(review.date_yyyy_mm_dd_ || review.date_yyyy_mm_dd || review.date, opsSnapshot && opsSnapshot.latest_run_date),
      summary: [
        cleanValue(review.focus) || '',
        cleanValue(review.follow_up_owner) || ''
      ].filter(Boolean).join(' · '),
      note: [
        cleanValue(reviewRecord && reviewRecord.review_defer_until) ? `暂缓至：${cleanValue(reviewRecord.review_defer_until)}` : '',
        cleanValue(reviewRecord && reviewRecord.review_note),
        cleanValue(review.blocker_notes)
      ].filter(Boolean)[0] || '',
      preview: '',
      source_path: cleanValue(operationsReview && operationsReview.reviews && operationsReview.reviews.path),
      target_url: '',
      navigation: {
        kind: 'ops',
        target_id: `review:${index}`,
        section: 'operations'
      },
      raw_refs: {
        review_index_path: cleanValue(operationsReview && operationsReview.reviews && operationsReview.reviews.path)
      }
    });
  }

  const sortedEntries = entries
    .slice()
    .sort(comparePrioritizedEntries);

  return {
    total_entries: entries.length,
    queue_count: entries.filter((entry) => entry.source_kind === 'queue').length,
    thread_count: entries.filter((entry) => entry.source_kind === 'thread').length,
    review_count: entries.filter((entry) => entry.source_kind === 'review').length,
    high_priority_count: entries.filter((entry) => entry.priority === 'high').length,
    entries: sortedEntries
  };
}

function buildSignalStream(actionLog, threadActionLog, opsActionLog, opsSnapshot, limit = 18) {
  const entries = [];

  for (const entry of (actionLog && actionLog.entries) || []) {
    entries.push({
      id: `signal:queue:${entry.id}`,
      signal_kind: 'queue_action',
      severity: 'info',
      timestamp_utc: toSortableTimestamp(entry.timestamp_utc),
      title: cleanValue(entry.action) || 'queue action',
      summary: cleanValue(entry.item_id) || 'unknown item',
      note: [
        cleanValue(entry.note),
        entry.reasons && entry.reasons.length > 0 ? `原因：${entry.reasons.join('，')}` : ''
      ].filter(Boolean).join(' · '),
      navigation: {
        kind: 'queue',
        target_id: cleanValue(entry.item_id),
        section: 'queue'
      }
    });
  }

  for (const entry of (threadActionLog && threadActionLog.entries) || []) {
    entries.push({
      id: `signal:thread:${entry.id}`,
      signal_kind: 'thread_action',
      severity: 'info',
      timestamp_utc: toSortableTimestamp(entry.timestamp_utc),
      title: cleanValue(entry.action) || 'thread action',
      summary: cleanValue(entry.reply_id) || 'unknown reply',
      note: [
        cleanValue(entry.note),
        cleanValue(entry.manual_state) ? `状态：${entry.manual_state}` : ''
      ].filter(Boolean).join(' · '),
      navigation: {
        kind: 'thread',
        target_id: cleanValue(entry.reply_id),
        section: 'pipeline'
      }
    });
  }

  for (const entry of (opsActionLog && opsActionLog.entries) || []) {
    entries.push({
      id: `signal:ops:${entry.id}`,
      signal_kind: 'ops_action',
      severity: cleanValue(entry.manual_state) === 'done'
        ? 'info'
        : cleanValue(entry.manual_state) === 'defer'
          ? 'warning'
          : 'info',
      timestamp_utc: toSortableTimestamp(entry.timestamp_utc),
      title: cleanValue(entry.action) || 'ops action',
      summary: cleanValue(entry.record_title) || cleanValue(entry.record_kind) || 'ops record',
      manual_state: cleanValue(entry.manual_state),
      defer_until_utc: cleanValue(entry.defer_until_utc),
      note: [
        cleanValue(entry.note),
        cleanValue(entry.manual_state) ? `状态：${cleanValue(entry.manual_state)}` : '',
        cleanValue(entry.defer_until_utc) ? `暂缓至：${cleanValue(entry.defer_until_utc)}` : ''
      ].filter(Boolean).join(' · '),
      navigation: cleanValue(entry.ui_id)
        ? {
          kind: 'ops',
          target_id: cleanValue(entry.ui_id),
          section: 'operations'
        }
        : null
    });
  }

  const feedback = opsSnapshot && opsSnapshot.modules ? opsSnapshot.modules.feedback : null;
  const incidents = feedback && Array.isArray(feedback.recent_incidents) ? feedback.recent_incidents : [];

  for (let index = 0; index < incidents.length; index += 1) {
    const incident = incidents[index];
    const incidentKind = cleanValue(incident.kind).replace(/`/g, '');
    const severity = incidentKind === 'gateway_error' || incidentKind === 'session_error'
      ? 'critical'
      : incidentKind === 'user_feedback'
        ? 'warning'
        : 'info';

    entries.push({
      id: `signal:feedback:${index}`,
      signal_kind: 'feedback_incident',
      severity,
      timestamp_utc: toSortableTimestamp(incident.time_utc, feedback && feedback.run_date),
      title: incidentKind || 'feedback incident',
      summary: cleanValue(incident.session) || cleanValue(incident.source) || 'feedback report',
      note: cleanValue(incident.summary),
      navigation: {
        kind: 'ops',
        target_id: 'feedback:summary',
        section: 'operations'
      }
    });
  }

  const sortedEntries = entries
    .sort((left, right) => {
      const severityRank = { critical: 3, warning: 2, info: 1 };
      const leftSeverity = severityRank[cleanValue(left.severity)] || 0;
      const rightSeverity = severityRank[cleanValue(right.severity)] || 0;

      if (leftSeverity !== rightSeverity) {
        return rightSeverity - leftSeverity;
      }

      return cleanValue(right.timestamp_utc).localeCompare(cleanValue(left.timestamp_utc), 'en');
    })
    .slice(0, limit);

  return {
    total_entries: entries.length,
    action_count: entries.filter((entry) => {
      return entry.signal_kind === 'queue_action'
        || entry.signal_kind === 'thread_action'
        || entry.signal_kind === 'ops_action';
    }).length,
    incident_count: entries.filter((entry) => entry.signal_kind === 'feedback_incident').length,
    entries: sortedEntries
  };
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

  if (manualActionState === 'deferred') {
    return {
      key: 'deferred',
      label: 'Deferred',
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
        source_details: buildSourceDetails(cleanValue(queueItem.source) || cleanValue(approval && approval.source)),
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
        review_defer_until: cleanValue(reviewhub && reviewhub.defer_until_utc),
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

function getOpsActionLogPath() {
  return process.env.REVIEWHUB_OPS_ACTION_LOG_PATH
    || path.join(path.resolve(getOperationsRoot()), 'Ops', 'state', OPS_ACTION_LOG_FILENAME);
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
    defer_until_utc: cleanValue(entry.defer_until_utc),
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

function normalizeOpsActionEntry(entry, index) {
  const manualState = cleanValue(entry.manual_state);

  return {
    id: cleanValue(entry.id) || `ops-action-log-${index + 1}`,
    timestamp_utc: cleanValue(entry.timestamp_utc),
    actor: cleanValue(entry.actor),
    action_id: cleanValue(entry.action_id),
    ui_id: cleanValue(entry.ui_id),
    record_kind: cleanValue(entry.record_kind),
    record_title: cleanValue(entry.record_title),
    action: cleanValue(entry.action),
    note: cleanValue(entry.note),
    manual_state: OPS_MANUAL_STATES.has(manualState) ? manualState : '',
    defer_until_utc: cleanValue(entry.defer_until_utc),
    source_path: cleanValue(entry.source_path),
    target_url: cleanValue(entry.target_url)
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

function loadOpsActionLog(limit = 120) {
  const opsActionLogPath = path.resolve(getOpsActionLogPath());

  try {
    const raw = fs.readFileSync(opsActionLogPath, 'utf8');
    const issues = [];
    const entries = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, index) => {
        try {
          return normalizeOpsActionEntry(JSON.parse(line), index);
        } catch (error) {
          issues.push({
            source: 'ops_action_log',
            path: opsActionLogPath,
            message: '问题记录处理日志中有无法解析的记录。',
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
      path: opsActionLogPath,
      entries,
      issues
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {
        available: false,
        path: opsActionLogPath,
        entries: [],
        issues: []
      };
    }

    return {
      available: false,
      path: opsActionLogPath,
      entries: [],
      issues: [{
        source: 'ops_action_log',
        path: opsActionLogPath,
        message: '问题记录处理日志暂时无法读取。',
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

function buildOpsRecordStateMap(opsActionLog) {
  const stateMap = new Map();

  for (const entry of [...(opsActionLog.entries || [])].reverse()) {
    const actionId = cleanValue(entry.action_id);

    if (!actionId) {
      continue;
    }

    stateMap.set(actionId, {
      manual_state: cleanValue(entry.manual_state),
      last_action: cleanValue(entry.action),
      note: cleanValue(entry.note),
      defer_until_utc: cleanValue(entry.defer_until_utc),
      updated_at_utc: cleanValue(entry.timestamp_utc),
      updated_by: cleanValue(entry.actor),
      ui_id: cleanValue(entry.ui_id),
      record_kind: cleanValue(entry.record_kind),
      record_title: cleanValue(entry.record_title),
      source_path: cleanValue(entry.source_path),
      target_url: cleanValue(entry.target_url)
    });
  }

  return stateMap;
}

function attachOpsStateToCatalog(catalog, opsRecordStateMap) {
  return (catalog || []).map((record) => {
    const stateEntry = opsRecordStateMap.get(cleanValue(record.action_id)) || null;
    const manualState = cleanValue(stateEntry && stateEntry.manual_state);

    return {
      ...record,
      review_state: OPS_MANUAL_STATES.has(manualState) ? manualState : '',
      review_override: Boolean(OPS_MANUAL_STATES.has(manualState)),
      review_last_action: cleanValue(stateEntry && stateEntry.last_action),
      review_note: cleanValue(stateEntry && stateEntry.note),
      review_defer_until: cleanValue(stateEntry && stateEntry.defer_until_utc),
      review_updated_at: cleanValue(stateEntry && stateEntry.updated_at_utc),
      review_updated_by: cleanValue(stateEntry && stateEntry.updated_by)
    };
  });
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
  const opsActionLog = loadOpsActionLog();
  const opsRecordStateMap = buildOpsRecordStateMap(opsActionLog);
  const operationsRecordCatalog = attachOpsStateToCatalog(
    buildOperationsRecordCatalog(operationsReview),
    opsRecordStateMap
  );

  const actionBuckets = {
    needs_review: items.filter((item) => item.action_state === 'needs_review'),
    ready_to_execute: items.filter((item) => item.action_state === 'ready_to_execute'),
    missing_info: items.filter((item) => item.action_state === 'missing_info'),
    deferred: items.filter((item) => item.action_state === 'deferred')
  };
  const recentActivity = buildRecentActivity(actionLog, threadActionLog, opsActionLog);
  const dailyProcessingQueue = buildDailyProcessingQueue(items, operationsReview, opsSnapshot, operationsRecordCatalog);
  const signalStream = buildSignalStream(actionLog, threadActionLog, opsActionLog, opsSnapshot);

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
      missing_info_count: actionBuckets.missing_info.length,
      deferred_count: actionBuckets.deferred.length
    },
    metadata: {
      approval_schema: cleanValue(approvalData.schema_version),
      approval_updated_at: cleanValue(approvalData.updated_at_utc),
      queue_schema: cleanValue(queueData.schema_version),
      queue_run_date: cleanValue(queueData.run_date),
      action_log_available: actionLog.available,
      thread_action_log_available: threadActionLog.available,
      ops_action_log_available: opsActionLog.available
    },
    filters: buildFilterValues(items),
    action_buckets: {
      needs_review: actionBuckets.needs_review.map((item) => item.id),
      ready_to_execute: actionBuckets.ready_to_execute.map((item) => item.id),
      missing_info: actionBuckets.missing_info.map((item) => item.id),
      deferred: actionBuckets.deferred.map((item) => item.id)
    },
    action_log: actionLog,
    thread_action_log: threadActionLog,
    ops_action_log: opsActionLog,
    recent_activity: recentActivity,
    daily_processing_queue: dailyProcessingQueue,
    signal_stream: signalStream,
    ops_snapshot: opsSnapshot,
    operations_review: operationsReview,
    operations_record_catalog: operationsRecordCatalog,
    items
  };
}

module.exports = {
  DashboardDataError,
  buildDailyProcessingQueue,
  buildOpsSnapshot,
  buildItems,
  buildSignalStream,
  createSourceIssue,
  findApprovalMatch,
  getApprovalCandidates,
  getOperationsRoot,
  getApprovalPath,
  getActionLogPath,
  getOpsActionLogPath,
  getQueuePath,
  getThreadActionLogPath,
  getRunsRoot,
  inferActionState,
  loadDashboardData,
  readJsonSource,
  validateApprovalData,
  validateQueueData
};
