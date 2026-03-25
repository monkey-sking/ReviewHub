const fs = require('fs');
const path = require('path');

const DEFAULT_OPERATIONS_ROOT = '/Volumes/SSD/Projects/Operations';
const DEFAULT_REVIEW_INDEX_PATH = '/Volumes/SSD/Projects/Operations/Ops/state/review_index.md';
const DEFAULT_EXPERIMENT_LOG_PATH = '/Volumes/SSD/Projects/Operations/Ops/state/experiment_log.md';
const DEFAULT_RUNS_DIR = '/Volumes/SSD/Projects/Operations/Ops/runs';

function cleanValue(value) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
}

function createIssue(source, filePath, message) {
  return {
    source,
    path: filePath ? path.resolve(filePath) : '',
    message
  };
}

function getOperationsRoot() {
  return process.env.REVIEWHUB_OPERATIONS_ROOT || process.env.OPERATIONS_ROOT || DEFAULT_OPERATIONS_ROOT;
}

function getRunsDir() {
  return process.env.REVIEWHUB_OPS_RUNS_ROOT
    || process.env.OPS_RUNS_ROOT
    || process.env.OPERATIONS_RUNS_ROOT
    || process.env.OPS_RUNS_DIR
    || DEFAULT_RUNS_DIR;
}

function getOperationsPaths() {
  const operationsRoot = path.resolve(getOperationsRoot());
  const stateDir = path.join(operationsRoot, 'Ops', 'state');

  return {
    reviewIndexPath: process.env.REVIEW_INDEX_PATH || path.join(stateDir, path.basename(DEFAULT_REVIEW_INDEX_PATH)),
    experimentLogPath: process.env.EXPERIMENT_LOG_PATH || path.join(stateDir, path.basename(DEFAULT_EXPERIMENT_LOG_PATH)),
    runsDir: getRunsDir()
  };
}

function readTextFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function parseMarkdownTable(markdown) {
  const lines = markdown.split(/\r?\n/);
  let tableStart = -1;

  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].trim().startsWith('|')) {
      tableStart = index;
      break;
    }
  }

  if (tableStart === -1 || tableStart + 2 >= lines.length) {
    return [];
  }

  const tableLines = [];

  for (let index = tableStart; index < lines.length; index += 1) {
    const line = lines[index].trim();

    if (!line.startsWith('|')) {
      break;
    }

    tableLines.push(line);
  }

  if (tableLines.length < 2) {
    return [];
  }

  const headers = tableLines[0]
    .split('|')
    .slice(1, -1)
    .map((cell) => cleanValue(cell).toLowerCase().replace(/[^a-z0-9]+/g, '_'));

  return tableLines
    .slice(2)
    .map((line) => {
      const cells = line.split('|').slice(1, -1).map(cleanValue);
      const row = {};

      headers.forEach((header, index) => {
        row[header] = cells[index] || '';
      });

      return row;
    })
    .filter((row) => Object.values(row).some(Boolean));
}

function extractPrefixedValue(markdown, prefix) {
  const line = markdown
    .split(/\r?\n/)
    .find((candidate) => candidate.trim().startsWith(prefix));

  return line ? cleanValue(line.replace(prefix, '').replace(/\*\*/g, '')) : '';
}

function extractFeedbackMetric(markdown, label) {
  const pattern = new RegExp(`- ${label}: \\*\\*([^*]+)\\*\\*`, 'i');
  const match = markdown.match(pattern);

  return match ? cleanValue(match[1]) : '';
}

function parseInteger(value) {
  const digits = cleanValue(value).replace(/[^0-9-]+/g, '');
  return digits ? Number(digits) : 0;
}

function parseFeedbackRootCauses(markdown, limit = 3) {
  const lines = markdown.split(/\r?\n/);
  const startIndex = lines.findIndex((line) => line.trim() === '## Root cause buckets');

  if (startIndex === -1) {
    return [];
  }

  const causes = [];

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index].trim();

    if (!line) {
      continue;
    }

    if (line.startsWith('## ')) {
      break;
    }

    const match = line.match(/^- \*\*(.+?)\*\*: ([0-9,]+) incidents \((~?[0-9]+%)\)\. Example: (.+)$/);

    if (!match) {
      continue;
    }

    causes.push({
      label: cleanValue(match[1]),
      incidents: parseInteger(match[2]),
      share: cleanValue(match[3]),
      example: cleanValue(match[4])
    });

    if (causes.length >= limit) {
      break;
    }
  }

  return causes;
}

function findLatestRunFile(runsDir, buildRelativePath) {
  if (!fs.existsSync(runsDir)) {
    return null;
  }

  const runDates = fs.readdirSync(runsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(entry.name))
    .map((entry) => entry.name)
    .sort((left, right) => right.localeCompare(left, 'en'));

  for (const runDate of runDates) {
    const candidate = path.join(runsDir, runDate, buildRelativePath(runDate));

    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return {
        run_date: runDate,
        path: candidate
      };
    }
  }

  return null;
}

function loadReviewTable(source, filePath) {
  try {
    const markdown = readTextFile(filePath);

    return {
      entries: parseMarkdownTable(markdown),
      updated_at: extractPrefixedValue(markdown, 'Date:'),
      path: path.resolve(filePath),
      issues: []
    };
  } catch (error) {
    return {
      entries: [],
      updated_at: '',
      path: path.resolve(filePath),
      issues: [createIssue(source, filePath, error.message)]
    };
  }
}

function loadFeedbackSnapshot(runsDir) {
  const latestFeedback = findLatestRunFile(
    runsDir,
    (runDate) => path.join('feedback', `lobster_feedback_report_${runDate}.md`)
  );

  if (!latestFeedback) {
    return {
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
      issues: [createIssue('feedback', runsDir, '在 Ops/runs 下没有找到反馈报告。')]
    };
  }

  try {
    const markdown = readTextFile(latestFeedback.path);

    return {
      run_date: latestFeedback.run_date,
      generated_at: extractFeedbackMetric(markdown, 'Generated at \\(UTC\\)'),
      summary: {
        total_incidents: parseInteger(extractFeedbackMetric(markdown, 'Total incidents captured')),
        session_errors: parseInteger(extractFeedbackMetric(markdown, 'Session runtime errors')),
        gateway_errors: parseInteger(extractFeedbackMetric(markdown, 'Gateway errors/warnings')),
        user_feedback_signals: parseInteger(extractFeedbackMetric(markdown, 'User feedback signals'))
      },
      root_causes: parseFeedbackRootCauses(markdown),
      path: path.resolve(latestFeedback.path),
      issues: []
    };
  } catch (error) {
    return {
      run_date: latestFeedback.run_date,
      generated_at: '',
      summary: {
        total_incidents: 0,
        session_errors: 0,
        gateway_errors: 0,
        user_feedback_signals: 0
      },
      root_causes: [],
      path: path.resolve(latestFeedback.path),
      issues: [createIssue('feedback', latestFeedback.path, error.message)]
    };
  }
}

function loadPostHandoffs(runsDir) {
  const latestPostQueue = findLatestRunFile(
    runsDir,
    () => path.join('posts', 'browser_post_queue_summary.json')
  );

  if (!latestPostQueue) {
    return {
      run_date: '',
      total_items: 0,
      ready_count: 0,
      blocked_count: 0,
      path: '',
      records: [],
      issues: [createIssue('post_handoffs', runsDir, '在 Ops/runs 下没有找到浏览器发帖队列摘要。')]
    };
  }

  try {
    const payload = JSON.parse(readTextFile(latestPostQueue.path));
    const prioritizedRecords = (payload.records || [])
      .slice()
      .sort((left, right) => {
        const leftPriority = left.status === 'ready_for_browser_review' ? 0 : 1;
        const rightPriority = right.status === 'ready_for_browser_review' ? 0 : 1;
        return leftPriority - rightPriority;
      })
      .slice(0, 8)
      .map((record) => {
        return {
          item_id: cleanValue(record.item_id),
          platform: cleanValue(record.platform),
          queue_status: cleanValue(record.queue_status),
          status: cleanValue(record.status),
          target_url: cleanValue(record.target_url),
          blocked_reasons: Array.isArray(record.blocked_reasons) ? record.blocked_reasons.map(cleanValue) : [],
          source: cleanValue(record.source),
          job_path: cleanValue(record.job_path),
          execution_job_path: cleanValue(record.execution_job_path),
          runbook_path: cleanValue(record.runbook_path)
        };
      });

    return {
      run_date: cleanValue(payload.run_date) || latestPostQueue.run_date,
      total_items: Number(payload.total_items) || prioritizedRecords.length,
      ready_count: Number(payload.ready_count) || 0,
      blocked_count: Number(payload.blocked_count) || 0,
      path: path.resolve(latestPostQueue.path),
      records: prioritizedRecords,
      issues: []
    };
  } catch (error) {
    return {
      run_date: latestPostQueue.run_date,
      total_items: 0,
      ready_count: 0,
      blocked_count: 0,
      path: path.resolve(latestPostQueue.path),
      records: [],
      issues: [createIssue('post_handoffs', latestPostQueue.path, error.message)]
    };
  }
}

function loadOperationsReviewData() {
  const paths = getOperationsPaths();
  const reviews = loadReviewTable('review_index', paths.reviewIndexPath);
  const experiments = loadReviewTable('experiment_log', paths.experimentLogPath);
  const feedback = loadFeedbackSnapshot(paths.runsDir);
  const postHandoffs = loadPostHandoffs(paths.runsDir);
  const reviewStatuses = new Set(['watch', 'pause', 'red']);
  const experimentStatuses = new Set(['planned', 'running']);
  const issues = [
    ...reviews.issues,
    ...experiments.issues,
    ...feedback.issues,
    ...postHandoffs.issues
  ];

  return {
    source_files: {
      review_index: reviews.path,
      experiment_log: experiments.path,
      feedback_report: feedback.path,
      browser_post_queue_summary: postHandoffs.path
    },
    summary: {
      review_count: reviews.entries.length,
      attention_count: reviews.entries.filter((entry) => reviewStatuses.has(cleanValue(entry.status).toLowerCase())).length,
      experiment_count: experiments.entries.length,
      active_experiment_count: experiments.entries.filter((entry) => {
        return experimentStatuses.has(cleanValue(entry.status).toLowerCase());
      }).length,
      feedback_incidents: feedback.summary.total_incidents,
      browser_ready_count: postHandoffs.ready_count,
      browser_blocked_count: postHandoffs.blocked_count
    },
    reviews,
    experiments,
    feedback,
    post_handoffs: postHandoffs,
    issues
  };
}

module.exports = {
  cleanValue,
  extractFeedbackMetric,
  findLatestRunFile,
  getOperationsRoot,
  getOperationsPaths,
  getRunsDir,
  loadFeedbackSnapshot,
  loadOperationsReviewData,
  loadPostHandoffs,
  loadReviewTable,
  parseFeedbackRootCauses,
  parseMarkdownTable
};
