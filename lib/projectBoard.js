const fs = require('fs');
const path = require('path');

const DEFAULT_PROJECT_KANBAN_PATH = '/Volumes/SSD/Projects/Operations/PROJECT_KANBAN.md';
const SECTION_TITLES = ['Inbox', 'Ready', 'Running', 'Waiting', 'Done', 'Learned'];
const SECTION_COLUMNS = {
  inbox: ['Project', 'Task', 'Type', 'Next Step', 'Notes'],
  ready: ['Project', 'Task', 'Type', 'Next Step', 'Canonical Link'],
  running: ['Project', 'Task', 'Type', 'Current Step', 'Next Step', 'Canonical Link'],
  waiting: ['Project', 'Task', 'Type', 'Blocker', 'Next Step'],
  done: ['Project', 'Task', 'Type', 'Output'],
  learned: ['Scope', 'Lesson']
};

function cleanValue(value) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
}

function getProjectKanbanPath() {
  return process.env.REVIEWHUB_PROJECT_KANBAN_PATH || DEFAULT_PROJECT_KANBAN_PATH;
}

function splitRow(line) {
  return String(line || '')
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function normalizeKey(value) {
  return cleanValue(value)
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function formatColumnLabel(key) {
  const normalized = normalizeKey(key);
  const explicitLabels = {
    canonical_link: 'Canonical Link',
    current_step: 'Current Step',
    next_step: 'Next Step'
  };

  if (explicitLabels[normalized]) {
    return explicitLabels[normalized];
  }

  return normalized
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatMarkdownCell(value) {
  return cleanValue(value)
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, '<br>');
}

function toSectionId(title) {
  return cleanValue(title).toLowerCase();
}

function parseMarkdownTable(lines) {
  if (!Array.isArray(lines) || lines.length < 2) {
    return [];
  }

  const header = splitRow(lines[0]);
  const divider = lines[1] || '';
  if (!/^\s*\|?(\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?\s*$/.test(divider)) {
    return [];
  }

  return lines.slice(2)
    .map((line) => splitRow(line))
    .filter((cells) => cells.length > 0 && cells.some((cell) => cell.trim()))
    .map((cells) => {
      const record = {};
      header.forEach((key, index) => {
        record[normalizeKey(key)] = cleanValue(cells[index]);
      });
      return record;
    });
}

function slugify(value, fallback = 'item') {
  const normalized = cleanValue(value)
    .toLowerCase()
    .replace(/[`'"“”‘’]/g, '')
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || fallback;
}

function buildBoardItemId(item, index, seenIds) {
  const subject = cleanValue(item.task)
    || cleanValue(item.lesson)
    || cleanValue(item.output)
    || cleanValue(item.project)
    || cleanValue(item.scope)
    || `item-${index + 1}`;
  const scope = cleanValue(item.project) || cleanValue(item.scope) || 'general';
  const baseId = `${slugify(scope, 'general')}-${slugify(subject, `item-${index + 1}`)}`;
  const duplicateCount = seenIds.get(baseId) || 0;
  seenIds.set(baseId, duplicateCount + 1);
  return duplicateCount === 0 ? baseId : `${baseId}-${duplicateCount + 1}`;
}

function attachSectionMetadata(sections) {
  const seenIds = new Map();

  return (Array.isArray(sections) ? sections : []).map((section) => {
    const sectionId = toSectionId(section.title);
    return {
      ...section,
      id: sectionId,
      items: (Array.isArray(section.items) ? section.items : []).map((item, index) => ({
        ...item,
        id: buildBoardItemId(item, index, seenIds),
        section_id: sectionId,
        section_title: section.title
      }))
    };
  });
}

function parseProjectKanban(markdown) {
  const lines = String(markdown || '').split(/\r?\n/);
  const rawSections = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    const headingMatch = line.match(/^##\s+(.+)$/);
    if (!headingMatch) {
      continue;
    }

    const title = cleanValue(headingMatch[1]);
    if (!SECTION_TITLES.includes(title)) {
      continue;
    }

    const tableLines = [];
    let cursor = index + 1;
    while (cursor < lines.length) {
      const current = lines[cursor];
      const trimmed = current.trim();
      if (/^##\s+/.test(trimmed)) {
        break;
      }
      if (trimmed.startsWith('|')) {
        tableLines.push(current);
      } else if (tableLines.length > 0 && trimmed === '') {
        break;
      }
      cursor += 1;
    }

    rawSections.push({
      title,
      items: parseMarkdownTable(tableLines),
      start_index: index,
      end_index: cursor
    });
  }

  const sections = attachSectionMetadata(rawSections);
  const allItems = sections.flatMap((section) => section.items);
  const projectNames = Array.from(
    new Set(
      allItems
        .map((item) => cleanValue(item.project))
        .filter(Boolean)
    )
  ).sort((left, right) => left.localeCompare(right, 'zh-CN'));

  const perProject = projectNames.map((project) => {
    const items = allItems.filter((item) => item.project === project);
    const counts = Object.fromEntries(sections.map((section) => [section.id, 0]));
    items.forEach((item) => {
      counts[item.section_id] = (counts[item.section_id] || 0) + 1;
    });

    return {
      project,
      total: items.length,
      counts,
      next_items: items
        .filter((item) => ['ready', 'running', 'waiting'].includes(item.section_id))
        .slice(0, 3)
    };
  });

  return {
    sections,
    all_items: allItems,
    project_names: projectNames,
    per_project: perProject,
    total_items: allItems.length
  };
}

function parseProjectKanbanDocument(markdown) {
  const parsed = parseProjectKanban(markdown);
  const firstSection = parsed.sections[0] || null;
  const lastSection = parsed.sections[parsed.sections.length - 1] || null;
  const lines = String(markdown || '').split(/\r?\n/);

  return {
    ...parsed,
    prefix: firstSection ? lines.slice(0, firstSection.start_index).join('\n') : String(markdown || ''),
    suffix: lastSection ? lines.slice(lastSection.end_index).join('\n') : '',
    original_markdown: String(markdown || '')
  };
}

function renderMarkdownTable(section) {
  const baseColumns = SECTION_COLUMNS[section.id]
    || Array.from(
      new Set((Array.isArray(section.items) ? section.items : []).flatMap((item) => Object.keys(item)))
    ).filter((key) => !['id', 'section_id', 'section_title'].includes(key));
  const baseKeys = baseColumns.map((column) => normalizeKey(column));
  const extraKeys = Array.from(
    new Set(
      (Array.isArray(section.items) ? section.items : [])
        .flatMap((item) => Object.keys(item || {}))
        .filter((key) => !['id', 'section_id', 'section_title', 'start_index', 'end_index'].includes(key))
        .filter((key) => !baseKeys.includes(key))
        .filter((key) => (section.items || []).some((item) => cleanValue(item[key])))
    )
  );
  const columns = [
    ...baseColumns,
    ...extraKeys.map((key) => formatColumnLabel(key))
  ];
  const columnKeys = [
    ...baseKeys,
    ...extraKeys
  ];

  const divider = columns.map(() => '---');
  const rows = (Array.isArray(section.items) ? section.items : []).map((item) => {
    return columnKeys.map((key) => {
      return formatMarkdownCell(item[key]);
    });
  });

  const serializedRows = [
    `| ${columns.join(' | ')} |`,
    `| ${divider.join(' | ')} |`,
    ...rows.map((cells) => `| ${cells.join(' | ')} |`)
  ];

  return serializedRows.join('\n');
}

function serializeProjectKanbanDocument(document) {
  const prefix = cleanValue(document && document.prefix)
    ? String(document.prefix).replace(/\s+$/g, '')
    : '';
  const suffix = cleanValue(document && document.suffix)
    ? String(document.suffix).replace(/^\s+/g, '')
    : '';
  const sections = Array.isArray(document && document.sections) ? document.sections : [];
  const boardContent = sections
    .map((section) => `## ${section.title}\n\n${renderMarkdownTable(section)}`)
    .join('\n\n---\n\n');

  const parts = [];
  if (prefix) {
    parts.push(prefix);
  }
  if (boardContent) {
    parts.push(boardContent);
  }
  if (suffix) {
    parts.push(suffix);
  }

  const output = parts.join('\n\n');
  return output.endsWith('\n') ? output : `${output}\n`;
}

function loadProjectBoard() {
  const filePath = path.resolve(getProjectKanbanPath());

  try {
    const markdown = fs.readFileSync(filePath, 'utf8');
    return {
      available: true,
      path: filePath,
      ...parseProjectKanban(markdown)
    };
  } catch (error) {
    return {
      available: false,
      path: filePath,
      error: error.message,
      sections: [],
      all_items: [],
      project_names: [],
      per_project: [],
      total_items: 0
    };
  }
}

module.exports = {
  DEFAULT_PROJECT_KANBAN_PATH,
  SECTION_COLUMNS,
  SECTION_TITLES,
  getProjectKanbanPath,
  normalizeKey,
  parseMarkdownTable,
  parseProjectKanban,
  parseProjectKanbanDocument,
  serializeProjectKanbanDocument,
  loadProjectBoard
};
