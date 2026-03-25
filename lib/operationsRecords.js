function cleanValue(value) {
  if (value === null || value === undefined) {
    return '';
  }

  const normalized = String(value).trim();
  return normalized === '-' ? '' : normalized;
}

function slugify(value, fallback) {
  const normalized = cleanValue(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || fallback;
}

function buildReviewRecordId(entry, index, sourcePath = '') {
  return [
    'review',
    slugify(sourcePath, `source-${index + 1}`),
    slugify(entry.job, `job-${index + 1}`),
    slugify(entry.date_yyyy_mm_dd_ || entry.date_yyyy_mm_dd || entry.date, `date-${index + 1}`),
    slugify(entry.focus, `focus-${index + 1}`),
    `idx-${index + 1}`
  ].join('|');
}

function buildExperimentRecordId(entry, index, sourcePath = '') {
  return [
    'experiment',
    slugify(sourcePath, `source-${index + 1}`),
    slugify(entry.job, `job-${index + 1}`),
    slugify(entry.experiment, `experiment-${index + 1}`),
    slugify(entry.started, `started-${index + 1}`),
    `idx-${index + 1}`
  ].join('|');
}

function buildFeedbackSummaryRecordId(feedback, sourcePath = '') {
  return [
    'feedback',
    slugify(sourcePath, 'feedback'),
    slugify(feedback && feedback.run_date, 'latest'),
    'summary'
  ].join('|');
}

function buildFeedbackCauseRecordId(feedback, cause, index, sourcePath = '') {
  return [
    'feedback',
    slugify(sourcePath, 'feedback'),
    slugify(feedback && feedback.run_date, 'latest'),
    'cause',
    slugify(cause && cause.label, `cause-${index + 1}`),
    `idx-${index + 1}`
  ].join('|');
}

function buildHandoffRecordId(record, index, sourcePath = '') {
  return [
    'handoff',
    slugify(sourcePath, `source-${index + 1}`),
    slugify(record && record.source, `source-${index + 1}`),
    slugify(record && record.item_id, `item-${index + 1}`),
    slugify(record && record.target_url, slugify(record && record.status, `status-${index + 1}`)),
    `idx-${index + 1}`
  ].join('|');
}

function buildOperationsRecordCatalog(operationsReview) {
  if (!operationsReview || operationsReview.available === false) {
    return [];
  }

  const catalog = [];
  const reviews = operationsReview.reviews && Array.isArray(operationsReview.reviews.entries)
    ? operationsReview.reviews.entries
    : [];
  const experiments = operationsReview.experiments && Array.isArray(operationsReview.experiments.entries)
    ? operationsReview.experiments.entries
    : [];
  const feedback = operationsReview.feedback || {};
  const feedbackCauses = Array.isArray(feedback.root_causes) ? feedback.root_causes : [];
  const handoffs = operationsReview.post_handoffs && Array.isArray(operationsReview.post_handoffs.records)
    ? operationsReview.post_handoffs.records
    : [];

  const reviewPath = cleanValue(operationsReview.reviews && operationsReview.reviews.path);
  const experimentPath = cleanValue(operationsReview.experiments && operationsReview.experiments.path);
  const feedbackPath = cleanValue(feedback.path);
  const handoffPath = cleanValue(operationsReview.post_handoffs && operationsReview.post_handoffs.path);

  reviews.forEach((entry, index) => {
    catalog.push({
      ui_id: `review:${index}`,
      action_id: buildReviewRecordId(entry, index, reviewPath),
      kind: 'review',
      title: cleanValue(entry.job) || `review-${index + 1}`,
      source_path: cleanValue(operationsReview.reviews && operationsReview.reviews.path)
    });
  });

  experiments.forEach((entry, index) => {
    catalog.push({
      ui_id: `experiment:${index}`,
      action_id: buildExperimentRecordId(entry, index, experimentPath),
      kind: 'experiment',
      title: cleanValue(entry.experiment) || `experiment-${index + 1}`,
      source_path: cleanValue(operationsReview.experiments && operationsReview.experiments.path)
    });
  });

  if (cleanValue(feedback.path) || (feedback.issues && feedback.issues.length > 0)) {
    catalog.push({
      ui_id: 'feedback:summary',
      action_id: buildFeedbackSummaryRecordId(feedback, feedbackPath),
      kind: 'feedback',
      title: `feedback-summary-${slugify(feedback.run_date, 'latest')}`,
      source_path: cleanValue(feedback.path)
    });
  }

  feedbackCauses.forEach((cause, index) => {
    catalog.push({
      ui_id: `feedback-cause:${index}`,
      action_id: buildFeedbackCauseRecordId(feedback, cause, index, feedbackPath),
      kind: 'feedback_cause',
      title: cleanValue(cause.label) || `feedback-cause-${index + 1}`,
      source_path: cleanValue(feedback.path)
    });
  });

  handoffs.forEach((record, index) => {
    catalog.push({
      ui_id: `handoff:${index}`,
      action_id: buildHandoffRecordId(record, index, handoffPath),
      kind: 'handoff',
      title: cleanValue(record.item_id) || `handoff-${index + 1}`,
      source_path: cleanValue(operationsReview.post_handoffs && operationsReview.post_handoffs.path),
      target_url: cleanValue(record.target_url)
    });
  });

  return catalog;
}

module.exports = {
  buildOperationsRecordCatalog,
  cleanValue
};
