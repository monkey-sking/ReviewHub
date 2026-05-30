const fs = require('fs');
const path = require('path');

const DEFAULT_OPERATIONS_ROOT = '/Volumes/SSD/Projects/Operations';
const PROJECT_BUCKET_LABELS = {
  content: '内容',
  distribution: '分发',
  review: '复盘',
  operations: '运营'
};

function cleanValue(value) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
}

function getOperationsRoot() {
  return process.env.REVIEWHUB_OPERATIONS_ROOT || DEFAULT_OPERATIONS_ROOT;
}

function normalizePath(value) {
  return cleanValue(value).replaceAll(path.sep, '/');
}

function toProjectKey(project) {
  return cleanValue(project).toLowerCase();
}

function humanizeFileName(value) {
  const filename = cleanValue(value);
  return filename.replace(path.extname(filename), '').replace(/[_-]+/g, ' ').trim() || filename;
}

function listFiles(rootDir, relativePrefix = '', maxDepth = 4) {
  if (!fs.existsSync(rootDir) || maxDepth < 0) {
    return [];
  }

  return fs.readdirSync(rootDir, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(rootDir, entry.name);
    const relativePath = normalizePath(path.join(relativePrefix, entry.name));

    if (entry.isDirectory()) {
      return listFiles(absolutePath, relativePath, maxDepth - 1);
    }

    return [{
      absolute_path: absolutePath,
      relative_path: relativePath
    }];
  });
}

function getProjectAliases(project) {
  const normalized = toProjectKey(project);
  const aliases = new Set([normalized]);

  if (normalized === 'openclaw') {
    aliases.add('lobster');
  }

  if (normalized === 'operations') {
    aliases.add('reviewhub');
    aliases.add('workflow');
    aliases.add('cross-project');
  }

  return Array.from(aliases);
}

function matchesProject(relativePath, project) {
  const normalized = normalizePath(relativePath).toLowerCase();
  const projectKey = toProjectKey(project);

  if (projectKey === 'operations') {
    return normalized === 'project_kanban.md'
      || normalized.startsWith('ops/jobs/')
      || normalized.startsWith('ops/skills/');
  }

  if (normalized.startsWith(`products/${projectKey}/`)) {
    return true;
  }

  return getProjectAliases(project).some((alias) => normalized.includes(alias));
}

function inferBucket(relativePath) {
  const normalized = normalizePath(relativePath).toLowerCase();

  if (
    normalized.includes('/assets/')
    || normalized.includes('/press/')
    || normalized.includes('/promotional/')
    || normalized.includes('content_index')
    || normalized.includes('draft')
    || normalized.includes('script')
    || normalized.includes('shot_list')
    || normalized.includes('capture_checklist')
    || normalized.includes('reply_bank')
  ) {
    return 'content';
  }

  if (
    normalized.includes('/platforms/')
    || normalized.includes('/launches/')
    || normalized.includes('distribution')
    || normalized.includes('platform_fit')
    || normalized.includes('launch_')
  ) {
    return 'distribution';
  }

  if (
    normalized.includes('/reports/')
    || normalized.includes('analysis')
    || normalized.includes('history')
    || normalized.includes('feedback')
    || normalized.includes('review')
    || normalized.includes('postmortem')
    || normalized.includes('retro')
  ) {
    return 'review';
  }

  return 'operations';
}

function buildProjectMaterialEntry(project, fileRecord) {
  const bucket = inferBucket(fileRecord.relative_path);
  const sourceRoot = fileRecord.relative_path.startsWith('Products/')
    ? 'products'
    : fileRecord.relative_path.startsWith('Content/')
      ? 'content'
      : 'ops';

  return {
    id: `fs-material:${toProjectKey(project)}:${fileRecord.relative_path.toLowerCase()}`,
    project,
    title: humanizeFileName(path.basename(fileRecord.relative_path)),
    bucket,
    bucket_label: PROJECT_BUCKET_LABELS[bucket] || '资料',
    kind: 'filesystem_reference',
    label: fileRecord.relative_path,
    note: sourceRoot === 'products' ? '项目资料' : sourceRoot === 'content' ? '内容资产' : '运营资产',
    platform: '',
    category: '',
    source_section_id: '',
    relative_path: fileRecord.relative_path,
    absolute_path: fileRecord.absolute_path
  };
}

function loadProjectFilesystemMaterials(projectNames = []) {
  const operationsRoot = path.resolve(getOperationsRoot());
  const productsRoot = path.join(operationsRoot, 'Products');
  const contentRoot = path.join(operationsRoot, 'Content');
  const jobsRoot = path.join(operationsRoot, 'Ops', 'jobs');
  const skillsRoot = path.join(operationsRoot, 'Ops', 'skills');
  const kanbanPath = path.join(operationsRoot, 'PROJECT_KANBAN.md');

  const filePool = [
    ...listFiles(productsRoot, 'Products', 4),
    ...listFiles(contentRoot, 'Content', 4),
    ...listFiles(jobsRoot, 'Ops/jobs', 2),
    ...listFiles(skillsRoot, 'Ops/skills', 2)
  ];

  if (fs.existsSync(kanbanPath)) {
    filePool.push({
      absolute_path: kanbanPath,
      relative_path: 'PROJECT_KANBAN.md'
    });
  }

  return Object.fromEntries((projectNames || []).map((project) => {
    const items = filePool
      .filter((fileRecord) => matchesProject(fileRecord.relative_path, project))
      .map((fileRecord) => buildProjectMaterialEntry(project, fileRecord))
      .sort((left, right) => left.relative_path.localeCompare(right.relative_path, 'zh-CN'));

    return [project, items];
  }));
}

module.exports = {
  DEFAULT_OPERATIONS_ROOT,
  getOperationsRoot,
  loadProjectFilesystemMaterials
};
