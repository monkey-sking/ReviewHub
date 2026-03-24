const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

test('operations review paths follow root-level override env vars', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reviewhub-operations-review-test-'));
  const operationsRoot = path.join(tempDir, 'operations');
  const stateDir = path.join(operationsRoot, 'Ops', 'state');
  const runsDir = path.join(operationsRoot, 'Ops', 'runs');
  const reviewIndexPath = path.join(stateDir, 'review_index.md');
  const experimentLogPath = path.join(stateDir, 'experiment_log.md');
  const envKeys = [
    'REVIEW_INDEX_PATH',
    'EXPERIMENT_LOG_PATH',
    'OPS_RUNS_DIR',
    'OPS_RUNS_ROOT',
    'OPERATIONS_RUNS_ROOT',
    'REVIEWHUB_OPS_RUNS_ROOT',
    'OPERATIONS_ROOT',
    'REVIEWHUB_OPERATIONS_ROOT'
  ];
  const previousEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
  const modulePath = path.resolve(__dirname, '..', 'lib', 'operationsReview.js');

  fs.mkdirSync(stateDir, { recursive: true });
  fs.mkdirSync(runsDir, { recursive: true });
  fs.writeFileSync(reviewIndexPath, '# Review Index\n\nDate: 2026-03-24\n', 'utf8');
  fs.writeFileSync(experimentLogPath, '# Experiment Log\n\nDate: 2026-03-24\n', 'utf8');

  delete process.env.REVIEW_INDEX_PATH;
  delete process.env.EXPERIMENT_LOG_PATH;
  delete process.env.OPS_RUNS_DIR;
  delete process.env.OPS_RUNS_ROOT;
  delete process.env.OPERATIONS_RUNS_ROOT;
  process.env.REVIEWHUB_OPS_RUNS_ROOT = runsDir;
  delete process.env.OPERATIONS_ROOT;
  process.env.REVIEWHUB_OPERATIONS_ROOT = operationsRoot;

  delete require.cache[modulePath];

  try {
    const { getOperationsPaths, loadOperationsReviewData } = require(modulePath);
    const paths = getOperationsPaths();
    const review = loadOperationsReviewData();

    assert.equal(paths.reviewIndexPath, reviewIndexPath);
    assert.equal(paths.experimentLogPath, experimentLogPath);
    assert.equal(paths.runsDir, runsDir);
    assert.equal(review.source_files.review_index, path.resolve(reviewIndexPath));
    assert.equal(review.source_files.experiment_log, path.resolve(experimentLogPath));
  } finally {
    for (const key of envKeys) {
      if (previousEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previousEnv[key];
      }
    }

    delete require.cache[modulePath];
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
