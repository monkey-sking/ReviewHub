const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const SAMPLE_BOARD = [
  '# Project Kanban',
  '',
  '## Inbox',
  '',
  '| Project | Task | Type | Next Step | Notes |',
  '|---|---|---|---|---|',
  '| Aion | 打磨发帖文案 | content | 改首屏表达 | 先看现有版本 |',
  '',
  '## Ready',
  '',
  '| Project | Task | Type | Next Step | Canonical Link |',
  '|---|---|---|---|---|',
  '| Aether | 补齐资料入口 | ops | 对齐 docs 路径 | `Products/Aether/README.md` |',
  '',
  '## Running',
  '',
  '| Project | Task | Type | Current Step | Next Step | Canonical Link |',
  '|---|---|---|---|---|---|',
  '| Operations | 多项目统一管理方式收口 | ops | 已建立总看板初版 | 继续收口视图 | `PROJECT_KANBAN.md` |',
  '',
  '## Waiting',
  '',
  '| Project | Task | Type | Blocker | Next Step |',
  '|---|---|---|---|---|',
  '| Aion | 核对旧分发链接 | analysis | 缺历史链接 | 后续补齐 |',
  '',
  '## Done',
  '',
  '| Project | Task | Type | Output |',
  '|---|---|---|---|',
  '| Aion | 建立复盘初版 | analysis | `Products/Aion/POST_ANALYSIS.md` |',
  '',
  '## Learned',
  '',
  '| Scope | Lesson |',
  '|---|---|',
  '| Cross-project | 项目资料和任务推进要分层 |'
].join('\n');

function withProjectBoard(callback) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reviewhub-project-board-'));
  const boardPath = path.join(tempDir, 'PROJECT_KANBAN.md');
  const previousProjectBoardPath = process.env.REVIEWHUB_PROJECT_KANBAN_PATH;

  fs.writeFileSync(boardPath, SAMPLE_BOARD, 'utf8');
  process.env.REVIEWHUB_PROJECT_KANBAN_PATH = boardPath;

  const projectBoardModulePath = path.resolve(__dirname, '..', 'lib', 'projectBoard.js');
  const projectBoardActionsModulePath = path.resolve(__dirname, '..', 'lib', 'projectBoardActions.js');
  delete require.cache[projectBoardModulePath];
  delete require.cache[projectBoardActionsModulePath];

  try {
    const projectBoard = require(projectBoardModulePath);
    const projectBoardActions = require(projectBoardActionsModulePath);
    return callback({
      boardPath,
      projectBoard,
      projectBoardActions
    });
  } finally {
    if (previousProjectBoardPath === undefined) {
      delete process.env.REVIEWHUB_PROJECT_KANBAN_PATH;
    } else {
      process.env.REVIEWHUB_PROJECT_KANBAN_PATH = previousProjectBoardPath;
    }

    delete require.cache[projectBoardModulePath];
    delete require.cache[projectBoardActionsModulePath];
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

test('project board parsing gives stable task ids independent of stage', () => {
  withProjectBoard(({ projectBoard, projectBoardActions }) => {
    const before = projectBoard.loadProjectBoard();
    const sourceTask = before.sections
      .flatMap((section) => section.items)
      .find((item) => item.task === '打磨发帖文案');

    assert.ok(sourceTask);
    assert.equal(sourceTask.section_id, 'inbox');

    const result = projectBoardActions.applyProjectBoardAction({
      itemId: sourceTask.id,
      action: 'move',
      sectionId: 'running'
    });

    const after = projectBoard.loadProjectBoard();
    const movedTask = after.sections
      .flatMap((section) => section.items)
      .find((item) => item.id === sourceTask.id);

    assert.equal(result.item_id, sourceTask.id);
    assert.ok(movedTask);
    assert.equal(movedTask.section_id, 'running');
  });
});

test('project board update action writes editable task fields back to markdown', () => {
  withProjectBoard(({ boardPath, projectBoard, projectBoardActions }) => {
    const before = projectBoard.loadProjectBoard();
    const targetTask = before.sections
      .flatMap((section) => section.items)
      .find((item) => item.task === '多项目统一管理方式收口');

    projectBoardActions.applyProjectBoardAction({
      itemId: targetTask.id,
      action: 'update',
      fields: {
        current_step: '已切成项目优先 IA',
        next_step: '补网页内调整能力',
        canonical_link: '`PROJECT_KANBAN.md` / `ReviewHub/README.md`'
      }
    });

    const reloaded = projectBoard.loadProjectBoard();
    const updatedTask = reloaded.sections
      .flatMap((section) => section.items)
      .find((item) => item.id === targetTask.id);
    const markdown = fs.readFileSync(boardPath, 'utf8');

    assert.equal(updatedTask.current_step, '已切成项目优先 IA');
    assert.equal(updatedTask.next_step, '补网页内调整能力');
    assert.equal(updatedTask.canonical_link, '`PROJECT_KANBAN.md` / `ReviewHub/README.md`');
    assert.match(markdown, /补网页内调整能力/);
  });
});

test('project board preserves cross-stage task fields before moving to a new section', () => {
  withProjectBoard(({ boardPath, projectBoard, projectBoardActions }) => {
    const before = projectBoard.loadProjectBoard();
    const targetTask = before.sections
      .flatMap((section) => section.items)
      .find((item) => item.task === '多项目统一管理方式收口');

    assert.ok(targetTask);
    assert.equal(targetTask.section_id, 'running');

    projectBoardActions.applyProjectBoardAction({
      itemId: targetTask.id,
      action: 'update',
      fields: {
        current_step: '已切到统一项目面板',
        blocker: '缺跨项目优先级确认',
        notes: '先收口 IA，再收口写口'
      }
    });

    const moved = projectBoardActions.applyProjectBoardAction({
      itemId: targetTask.id,
      action: 'move',
      sectionId: 'waiting'
    });

    const reloaded = projectBoard.loadProjectBoard();
    const waitingTask = reloaded.sections
      .flatMap((section) => section.items)
      .find((item) => item.id === targetTask.id);
    const markdown = fs.readFileSync(boardPath, 'utf8');

    assert.equal(moved.section_id, 'waiting');
    assert.ok(waitingTask);
    assert.equal(waitingTask.section_id, 'waiting');
    assert.equal(waitingTask.blocker, '缺跨项目优先级确认');
    assert.equal(waitingTask.next_step, '继续收口视图');
    assert.match(markdown, /\| Operations \| 多项目统一管理方式收口 \| ops \| 缺跨项目优先级确认 \| 继续收口视图 \|/);
  });
});
