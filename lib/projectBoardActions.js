const fs = require('fs');
const path = require('path');
const {
  getProjectKanbanPath,
  parseProjectKanbanDocument,
  serializeProjectKanbanDocument,
  loadProjectBoard
} = require('./projectBoard');

class ProjectBoardActionError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'ProjectBoardActionError';
    this.statusCode = options.statusCode || 400;
    this.details = options.details || null;
  }
}

const TASK_FIELD_NAMES = [
  'type',
  'current_step',
  'next_step',
  'blocker',
  'notes',
  'canonical_link',
  'output'
];

function cleanValue(value) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
}

function readProjectBoardDocument() {
  const filePath = path.resolve(getProjectKanbanPath());

  try {
    const markdown = fs.readFileSync(filePath, 'utf8');
    return {
      path: filePath,
      document: parseProjectKanbanDocument(markdown)
    };
  } catch (error) {
    throw new ProjectBoardActionError('项目总看板暂时不可读取。', {
      statusCode: error.code === 'ENOENT' ? 404 : 500,
      details: {
        path: filePath,
        message: error.message
      }
    });
  }
}

function persistProjectBoardDocument(filePath, document) {
  try {
    fs.writeFileSync(filePath, serializeProjectKanbanDocument(document), 'utf8');
  } catch (error) {
    throw new ProjectBoardActionError('写入项目总看板失败。', {
      statusCode: 500,
      details: {
        path: filePath,
        message: error.message
      }
    });
  }
}

function findItemLocation(document, itemId) {
  const sections = Array.isArray(document && document.sections) ? document.sections : [];

  for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex += 1) {
    const items = Array.isArray(sections[sectionIndex].items) ? sections[sectionIndex].items : [];
    const itemIndex = items.findIndex((item) => cleanValue(item.id) === cleanValue(itemId));

    if (itemIndex >= 0) {
      return {
        sectionIndex,
        itemIndex,
        section: sections[sectionIndex],
        item: items[itemIndex]
      };
    }
  }

  return null;
}

function getEditableFieldNames(sectionId) {
  if (['inbox', 'ready', 'running', 'waiting', 'done'].includes(sectionId)) {
    return TASK_FIELD_NAMES;
  }

  return [];
}

function mapItemToSection(item, targetSectionId) {
  const baseItem = {
    project: cleanValue(item.project),
    task: cleanValue(item.task),
    type: cleanValue(item.type)
  };
  const nextStep = cleanValue(item.next_step);
  const currentStep = cleanValue(item.current_step);
  const blocker = cleanValue(item.blocker);
  const notes = cleanValue(item.notes);
  const canonicalLink = cleanValue(item.canonical_link);
  const output = cleanValue(item.output);

  if (targetSectionId === 'inbox') {
    return {
      ...baseItem,
      next_step: nextStep,
      notes: notes || currentStep || blocker || output || canonicalLink
    };
  }

  if (targetSectionId === 'ready') {
    return {
      ...baseItem,
      next_step: nextStep || currentStep,
      canonical_link: canonicalLink || output
    };
  }

  if (targetSectionId === 'running') {
    return {
      ...baseItem,
      current_step: currentStep || nextStep,
      next_step: nextStep,
      canonical_link: canonicalLink || output
    };
  }

  if (targetSectionId === 'waiting') {
    return {
      ...baseItem,
      blocker: blocker || notes || currentStep,
      next_step: nextStep
    };
  }

  if (targetSectionId === 'done') {
    return {
      ...baseItem,
      output: output || canonicalLink || notes || currentStep
    };
  }

  throw new ProjectBoardActionError('不支持的项目看板阶段。');
}

function applyProjectBoardAction({ itemId, action, sectionId, fields }) {
  const normalizedAction = cleanValue(action);

  if (!normalizedAction) {
    throw new ProjectBoardActionError('缺少项目看板动作。');
  }

  const { path: filePath, document } = readProjectBoardDocument();
  const location = findItemLocation(document, itemId);

  if (!location) {
    throw new ProjectBoardActionError('未找到对应的项目任务。', { statusCode: 404 });
  }

  if (normalizedAction === 'move') {
    const targetSectionId = cleanValue(sectionId).toLowerCase();
    const targetSection = (document.sections || []).find((section) => cleanValue(section.id) === targetSectionId);

    if (!targetSection || targetSectionId === 'learned') {
      throw new ProjectBoardActionError('目标阶段无效。');
    }

    const nextItem = mapItemToSection(location.item, targetSectionId);
    document.sections[location.sectionIndex].items.splice(location.itemIndex, 1);
    targetSection.items.unshift(nextItem);
    persistProjectBoardDocument(filePath, document);

    return {
      ok: true,
      item_id: cleanValue(location.item.id),
      section_id: targetSectionId,
      board: loadProjectBoard()
    };
  }

  if (normalizedAction === 'update') {
    const editableFields = new Set(getEditableFieldNames(cleanValue(location.section.id)));
    const nextFields = fields && typeof fields === 'object' ? fields : {};

    editableFields.forEach((fieldName) => {
      if (!Object.hasOwn(nextFields, fieldName)) {
        return;
      }
      location.item[fieldName] = cleanValue(nextFields[fieldName]);
    });

    persistProjectBoardDocument(filePath, document);

    return {
      ok: true,
      item_id: cleanValue(location.item.id),
      section_id: cleanValue(location.section.id),
      board: loadProjectBoard()
    };
  }

  throw new ProjectBoardActionError('不支持的项目看板动作。');
}

module.exports = {
  ProjectBoardActionError,
  applyProjectBoardAction
};
