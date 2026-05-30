# ReviewHub Inbox Redesign V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn ReviewHub into an Inbox-first operator flow where the user lands in Inbox, scans a clear list, opens a focused modal, takes a primary action, and sees the state return without re-orienting.

**Architecture:** Keep the current static HTML + single-file browser app architecture, but narrow the redesign to the queue path. Preserve `Projects`, `Issues`, and `Automation` as secondary sections while moving the default app state and shared stage chrome to an Inbox-first layout. Rework queue detail into a modal-specific decision surface without rewriting the other detail modes.

**Tech Stack:** Static HTML, vanilla browser JavaScript in `public/app.js`, CSS in `public/styles_premium.css`, Node built-in test runner, local `server.js`

---

## File Map

### Modify

- `public/index.html`
  - Replace the hero-like stage chrome with a compact Inbox summary strip
  - Make the queue panel the obvious first-class stage surface
  - Add queue-specific modal sections for decision summary, scoped action inputs, and detailed information
- `public/app.js`
  - Change default section state to `queue`
  - Remove `workboard` from the primary navigation card set
  - Render the new Inbox summary strip
  - Simplify queue list rows and queue-only modal content
  - Add human-readable queue success messages and auto-advance selection
- `public/styles_premium.css`
  - Restyle the top stage as a compact summary strip
  - Make queue rows more scannable
  - Make the queue modal decision-first with a pinned action region
- `tests/appUiContracts.test.js`
  - Add source-contract coverage for the new Inbox-first shell, modal structure, and queue state-return hooks
- `README.md`
  - Update the product flow description so repo docs reflect the Inbox-first operator path

### Keep unchanged unless implementation exposes a real need

- `lib/queueActions.js`
- `server.js`
- `tests/server.test.js`

The redesign is deliberately front-end first. Do not expand scope into backend changes unless a concrete UI behavior cannot be implemented without them.

---

### Task 1: Lock Inbox as the Default Surface

**Files:**
- Modify: `tests/appUiContracts.test.js`
- Modify: `public/app.js`

- [ ] **Step 1: Write the failing UI contract test**

Add a new contract test to assert that the app now boots into `queue` instead of `workboard`, and that the navigation card list no longer promotes `workboard` as a primary section.

```js
function readAppSource() {
  return fs.readFileSync(path.resolve(__dirname, '..', 'public', 'app.js'), 'utf8');
}

test('queue is the default active section and workboard is no longer a primary nav card', () => {
  const source = readAppSource();

  assert.match(source, /activeSection:\s*'queue'/);
  assert.doesNotMatch(source, /section:\s*'workboard',\s*title:\s*'工作台'/);
  assert.match(source, /section:\s*'queue',\s*title:\s*'Inbox'/);
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```bash
node --test --test-concurrency=1 tests/appUiContracts.test.js
```

Expected:

```text
not ok ... queue is the default active section ...
```

- [ ] **Step 3: Make Inbox the default section in `public/app.js`**

Change the root state and navigation-card source so Inbox owns the default app surface.

```js
const state = {
  data: null,
  activeSection: 'queue',
  // ...
};
```

Update the primary workspace cards array to remove the `workboard` card:

```js
const cards = [
  {
    section: 'queue',
    title: 'Inbox',
    value: `${pendingCount} 待审 · ${readyCount} 可继续`
  },
  {
    section: 'projects',
    title: 'Projects',
    value: projectHub.available === false
      ? '未接入'
      : `${workspaceSummary.project_count || 0} 项目 · ${workspaceSummary.total_tasks || 0} 条事项`
  },
  {
    section: 'operations',
    title: 'Issues',
    value: operationsReview.available === false
      ? '不可用'
      : `${processingLane.high_priority_count || 0} 条拦阻`
  },
  {
    section: 'pipeline',
    title: 'Automation',
    value: `${threads ? threads.needs_reply_count : 0} 待人工流转`
  }
];
```

- [ ] **Step 4: Re-run the focused test**

Run:

```bash
node --test --test-concurrency=1 tests/appUiContracts.test.js
```

Expected:

```text
ok ... queue is the default active section ...
```

- [ ] **Step 5: Commit**

```bash
git add tests/appUiContracts.test.js public/app.js
git commit -m "feat: make inbox the default reviewhub surface"
```

---

### Task 2: Replace the Hero Chrome with a Compact Inbox Summary Strip

**Files:**
- Modify: `tests/appUiContracts.test.js`
- Modify: `public/index.html`
- Modify: `public/app.js`
- Modify: `public/styles_premium.css`

- [ ] **Step 1: Write the failing shell-structure test**

Extend `tests/appUiContracts.test.js` to check that the page exposes a compact `inboxSummaryStrip` container and a queue-first header instead of the old spotlight-driven stage.

```js
function readIndexSource() {
  return fs.readFileSync(path.resolve(__dirname, '..', 'public', 'index.html'), 'utf8');
}

test('index exposes an inbox summary strip and queue-first stage heading', () => {
  const html = readIndexSource();

  assert.match(html, /id="inboxSummaryStrip"/);
  assert.match(html, /<h2[^>]*>待处理收件箱<\/h2>/);
  assert.doesNotMatch(html, /id="projectSpotlight"/);
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```bash
node --test --test-concurrency=1 tests/appUiContracts.test.js
```

Expected:

```text
not ok ... index exposes an inbox summary strip ...
```

- [ ] **Step 3: Replace the stage header markup in `public/index.html`**

Swap the large hero and spotlight with a compact Inbox summary strip near the top of `<main>`.

```html
<section class="stage-summary-strip card" aria-label="Inbox 状态摘要">
  <div class="summary-strip-heading">
    <div>
      <p class="section-kicker">Inbox</p>
      <h2>待处理收件箱</h2>
      <p class="summary-strip-subtitle">先处理最该继续的，再决定补资料、退回或暂缓。</p>
    </div>
    <div class="stage-header-actions">
      <button id="refreshButton" class="button button-primary" type="button">刷新数据</button>
    </div>
  </div>
  <div id="inboxSummaryStrip" class="summary-strip-metrics"></div>
</section>
```

Delete the old global hero block and `projectSpotlight` block.

- [ ] **Step 4: Render the compact summary strip in `public/app.js`**

Add a dedicated renderer and call it from the main render path:

```js
function renderInboxSummaryStrip() {
  if (!elements.inboxSummaryStrip || !state.data) {
    return;
  }

  const cards = [
    { label: '待审核', count: getInboxTabCount('pending') },
    { label: '可继续', count: getInboxTabCount('ready') },
    { label: '资料不全', count: getInboxTabCount('missing_info') },
    { label: '已暂缓', count: getInboxTabCount('deferred') }
  ];

  elements.inboxSummaryStrip.innerHTML = cards.map((card) => `
    <article class="summary-strip-card">
      <span>${escapeHtml(card.label)}</span>
      <strong>${escapeHtml(String(card.count))}</strong>
    </article>
  `).join('');
}
```

Register the new element:

```js
inboxSummaryStrip: document.getElementById('inboxSummaryStrip'),
```

Call it after `renderWorkspaceHighlights()` and inside `loadData()` refresh paths.

- [ ] **Step 5: Add the new strip styling**

Replace the hero styling with compact strip styling:

```css
.stage-summary-strip {
  padding: 16px 20px;
  display: grid;
  gap: 16px;
  border-bottom: 1px solid var(--border-solid);
}

.summary-strip-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.summary-strip-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.summary-strip-card {
  border: 1px solid var(--border-solid);
  border-radius: 12px;
  background: #fff;
  padding: 12px 14px;
}
```

- [ ] **Step 6: Re-run the focused test**

Run:

```bash
node --test --test-concurrency=1 tests/appUiContracts.test.js
```

Expected:

```text
ok ... index exposes an inbox summary strip ...
```

- [ ] **Step 7: Commit**

```bash
git add tests/appUiContracts.test.js public/index.html public/app.js public/styles_premium.css
git commit -m "feat: replace hero chrome with inbox summary strip"
```

---

### Task 3: Simplify Inbox Rows into a Scan-First List

**Files:**
- Modify: `tests/appUiContracts.test.js`
- Modify: `public/app.js`
- Modify: `public/styles_premium.css`

- [ ] **Step 1: Write the failing list-row contract**

Add a source contract that requires semantic row classes for a two-line list item and a plain-language empty state.

```js
test('queue rows use a scan-first two-line structure', () => {
  const source = readAppSource();

  assert.match(source, /item-row-title/);
  assert.match(source, /item-row-headline/);
  assert.match(source, /item-row-subline/);
  assert.match(source, /这一组现在没有需要你处理的内容/);
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```bash
node --test --test-concurrency=1 tests/appUiContracts.test.js
```

Expected:

```text
not ok ... queue rows use a scan-first two-line structure
```

- [ ] **Step 3: Refactor `renderList()` row markup in `public/app.js`**

Keep list rows selection-only and render the new two-line structure:

```js
elements.itemList.innerHTML = filteredItems.map((item) => `
  <button class="item-row${state.detailMode === 'queue' && item.id === state.selectedId ? ' item-row-selected' : ''}" data-item-id="${escapeHtml(item.id)}" type="button">
    <div class="item-row-line1">
      <strong class="item-row-title">${escapeHtml(item.title || '未命名任务')}</strong>
      <span class="item-row-state">${escapeHtml(getQueueStageLabel(item))}</span>
    </div>
    <div class="item-row-line2">
      <span class="item-row-headline">${escapeHtml(item.platform || '未知平台')}</span>
      <span class="item-row-subline">${escapeHtml(getQueueListNote(item) || '打开后查看处理建议')}</span>
    </div>
  </button>
`).join('');
```

Update the queue empty state copy:

```js
elements.itemList.innerHTML = '<div class="empty-state">这一组现在没有需要你处理的内容</div>';
```

- [ ] **Step 4: Add row styling that privileges title and state**

```css
.item-row-line1 {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 8px;
}

.item-row-title {
  font-size: 15px;
  line-height: 1.35;
}

.item-row-state {
  font-size: 12px;
  font-weight: 700;
  color: var(--accent-strong);
}

.item-row-line2 {
  display: grid;
  gap: 4px;
}

.item-row-headline {
  font-size: 12px;
  color: var(--muted);
}

.item-row-subline {
  font-size: 13px;
  color: var(--text);
}
```

- [ ] **Step 5: Re-run the focused test**

Run:

```bash
node --test --test-concurrency=1 tests/appUiContracts.test.js
```

Expected:

```text
ok ... queue rows use a scan-first two-line structure
```

- [ ] **Step 6: Commit**

```bash
git add tests/appUiContracts.test.js public/app.js public/styles_premium.css
git commit -m "feat: simplify inbox rows for scan-first triage"
```

---

### Task 4: Rebuild Queue Detail as a Decision-First Modal

**Files:**
- Modify: `tests/appUiContracts.test.js`
- Modify: `public/index.html`
- Modify: `public/app.js`
- Modify: `public/styles_premium.css`

- [ ] **Step 1: Write the failing modal-structure contract**

Add a source contract that checks for queue-specific decision-first modal sections in `public/index.html`.

```js
test('queue detail modal contains decision summary, action area, and collapsed detail sections', () => {
  const html = readIndexSource();

  assert.match(html, /id="detailDecisionPanel"/);
  assert.match(html, /id="detailActionPanel"/);
  assert.match(html, /id="detailMoreInfoPanel"/);
  assert.match(html, /id="detailHistorySection"/);
  assert.match(html, /id="detailRawSection"/);
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```bash
node --test --test-concurrency=1 tests/appUiContracts.test.js
```

Expected:

```text
not ok ... queue detail modal contains decision summary ...
```

- [ ] **Step 3: Add queue-specific modal containers in `public/index.html`**

Insert queue-specific sections ahead of the old metadata/JSON content so the top of the modal becomes decision-first.

```html
<section id="detailDecisionPanel" class="detail-decision-panel">
  <div id="detailDecisionSummary" class="detail-decision-summary"></div>
  <div id="detailDecisionReasons" class="detail-decision-reasons"></div>
</section>

<section id="detailActionPanel" class="detail-action-panel">
  <div id="detailActionBar" class="detail-action-bar"></div>
  <div id="detailActionForm" class="detail-action-form" hidden></div>
  <div id="detailActionStatus" class="detail-action-status"></div>
</section>

<section id="detailMoreInfoPanel" class="detail-more-info-panel">
  <details id="detailContextSection"><summary>上下文</summary><div id="detailContextContent"></div></details>
  <details id="detailHistorySection"><summary>历史记录</summary><div id="detailHistoryContent"></div></details>
  <details id="detailRawSection"><summary>原始内容</summary><pre id="queueJson"><code class="language-json"></code></pre></details>
  <details id="detailApprovalSection"><summary>审核依据</summary><pre id="approvalJson"><code class="language-json"></code></pre></details>
</section>
```

Keep the legacy detail containers available for non-queue modes until a later redesign touches them.

- [ ] **Step 4: Render queue-specific summary content in `public/app.js`**

Add queue-only helpers:

```js
function renderQueueDecisionSummary(item) {
  elements.detailDecisionSummary.innerHTML = `
    <p class="detail-decision-title">${escapeHtml(item.title || '未命名任务')}</p>
    <p class="detail-decision-kicker">${escapeHtml(getQueueSubtitle(item))}</p>
  `;

  const reasons = [
    getQueueListNote(item),
    item.reason,
    item.review_note
  ].filter(Boolean).slice(0, 3);

  elements.detailDecisionReasons.innerHTML = reasons.map((reason) => `
    <div class="detail-reason-pill">${escapeHtml(reason)}</div>
  `).join('');
}
```

Call it at the top of `renderQueueDetail(item)` before rendering JSON or lower-priority metadata.

- [ ] **Step 5: Force queue detail to stay modal on desktop**

Scope the inline-inspector behavior away from queue mode:

```js
function syncDetailModal() {
  if (!elements.detailModal) {
    return;
  }

  const inlineInspector = usesInlineInspector() && state.detailMode !== 'queue';
  const shouldShow = Boolean((inlineInspector || (state.detailModalOpen && isModalDetailMode())) && state.data);
  elements.detailModal.hidden = !shouldShow;
  elements.detailModal.setAttribute('aria-hidden', String(!shouldShow));
  elements.detailModal.classList.toggle('detail-modal-inline', inlineInspector);
  document.body.classList.toggle('detail-modal-open', shouldShow && !inlineInspector);
}
```

- [ ] **Step 6: Add modal layout styling**

```css
.detail-decision-panel {
  display: grid;
  gap: 12px;
  margin-bottom: 16px;
}

.detail-action-panel {
  position: sticky;
  top: 0;
  z-index: 2;
  background: #fff;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-solid);
}

.detail-more-info-panel {
  display: grid;
  gap: 12px;
  margin-top: 20px;
}
```

- [ ] **Step 7: Re-run the focused test**

Run:

```bash
node --test --test-concurrency=1 tests/appUiContracts.test.js
```

Expected:

```text
ok ... queue detail modal contains decision summary ...
```

- [ ] **Step 8: Commit**

```bash
git add tests/appUiContracts.test.js public/index.html public/app.js public/styles_premium.css
git commit -m "feat: rebuild queue detail as decision-first modal"
```

---

### Task 5: Make Queue Actions Human-Centered and Progressively Revealed

**Files:**
- Modify: `tests/appUiContracts.test.js`
- Modify: `public/app.js`
- Modify: `public/styles_premium.css`

- [ ] **Step 1: Write the failing action-copy contract**

Add a source contract that requires the queue primary action copy and the action-scoped form container.

```js
test('queue modal privileges 通过并继续 and uses an action-scoped form region', () => {
  const source = readAppSource();

  assert.match(source, /label:\s*'通过并继续',\s*className:\s*'button button-primary'/);
  assert.match(source, /detailActionForm/);
  assert.doesNotMatch(source, /summary class="tag tag-muted"[^>]*>备注 \/ 暂缓/);
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```bash
node --test --test-concurrency=1 tests/appUiContracts.test.js
```

Expected:

```text
not ok ... queue modal privileges 通过并继续 ...
```

- [ ] **Step 3: Rework `buildQueueActionButtons(item)` to use operator language**

Map the existing internal actions to user-facing primary/secondary copy:

```js
function buildQueueActionButtons(item) {
  const buttons = [];

  buttons.push({ action: 'mark_ready', label: '通过并继续', className: 'button button-primary' });

  if (canRunQueueAction(item, 'reject')) {
    buttons.push({ action: 'reject', label: '退回', className: 'button button-danger' });
  }

  if (canRunQueueAction(item, 'mark_missing_info')) {
    buttons.push({ action: 'mark_missing_info', label: '补资料', className: 'button' });
  }

  if (canRunQueueAction(item, 'mark_deferred')) {
    buttons.push({ action: 'mark_deferred', label: '暂缓', className: 'button' });
  }

  return buttons;
}
```

If a specific action is not valid for an item, omit it instead of inventing new modal copy.

- [ ] **Step 4: Replace the always-visible advanced-action details block with an action-scoped form**

Use one action form container and fill it only when the selected action requires extra input:

```js
function renderQueueActionForm(action) {
  if (action === 'mark_deferred') {
    elements.detailActionForm.hidden = false;
    elements.detailActionForm.innerHTML = `
      <label class="detail-note-field"><span>暂缓到</span><input id="detailActionDeferUntil" type="datetime-local" /></label>
      <label class="detail-note-field"><span>备注</span><textarea id="detailActionNote" rows="2" placeholder="记录暂缓原因"></textarea></label>
    `;
    return;
  }

  if (action === 'mark_missing_info' || action === 'reject') {
    elements.detailActionForm.hidden = false;
    elements.detailActionForm.innerHTML = `
      <label class="detail-note-field"><span>备注</span><textarea id="detailActionNote" rows="2" placeholder="写清楚原因"></textarea></label>
    `;
    return;
  }

  elements.detailActionForm.hidden = true;
  elements.detailActionForm.innerHTML = '';
}
```

- [ ] **Step 5: Style the primary/secondary action hierarchy**

```css
.detail-action-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.detail-action-bar .button-primary {
  min-width: 160px;
}

.detail-action-form {
  display: grid;
  gap: 12px;
  margin-top: 12px;
}
```

- [ ] **Step 6: Re-run the focused test**

Run:

```bash
node --test --test-concurrency=1 tests/appUiContracts.test.js
```

Expected:

```text
ok ... queue modal privileges 通过并继续 ...
```

- [ ] **Step 7: Commit**

```bash
git add tests/appUiContracts.test.js public/app.js public/styles_premium.css
git commit -m "feat: make queue actions decision-first and progressive"
```

---

### Task 6: Close the Modal Cleanly and Auto-Advance After Queue Actions

**Files:**
- Modify: `tests/appUiContracts.test.js`
- Modify: `public/app.js`

- [ ] **Step 1: Write the failing state-return contract**

Add a contract that requires queue actions to compute the next selection and use human-readable success copy.

```js
test('queue actions compute next selection and use human-readable success feedback', () => {
  const source = readAppSource();

  assert.match(source, /getNextQueueSelection\(\[item\.id\],\s*item\.id\)/);
  assert.match(source, /已继续处理/);
  assert.match(source, /已退回/);
  assert.match(source, /已标记资料不全/);
  assert.match(source, /已暂缓/);
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```bash
node --test --test-concurrency=1 tests/appUiContracts.test.js
```

Expected:

```text
not ok ... queue actions compute next selection ...
```

- [ ] **Step 3: Add a queue success-message helper**

```js
function getQueueActionSuccessMessage(action) {
  if (action === 'mark_ready') return '已继续处理';
  if (action === 'reject') return '已退回';
  if (action === 'mark_missing_info') return '已标记资料不全';
  if (action === 'mark_deferred') return '已暂缓';
  if (action === 'mark_blocked') return '已标记阻塞';
  return '状态已更新';
}
```

- [ ] **Step 4: Update `runQueueAction(action)` to auto-advance and close the modal**

Use the next visible item instead of reloading onto the same item:

```js
const nextSelectionId = getNextQueueSelection([item.id], item.id) || item.id;

// ...

const successMessage = getQueueActionSuccessMessage(action);
setFlashMessage(successMessage);
state.actionFeedback = {
  itemId: item.id,
  tone: 'success',
  message: successMessage
};
elements.detailActionNote.value = '';
state.detailModalOpen = false;

await loadData({
  activeSection: 'queue',
  detailMode: 'queue',
  selectedId: nextSelectionId
});
```

- [ ] **Step 5: Re-run the focused test**

Run:

```bash
node --test --test-concurrency=1 tests/appUiContracts.test.js
```

Expected:

```text
ok ... queue actions compute next selection ...
```

- [ ] **Step 6: Commit**

```bash
git add tests/appUiContracts.test.js public/app.js
git commit -m "feat: auto-advance inbox after queue actions"
```

---

### Task 7: Update Product Docs and Run Full Verification

**Files:**
- Modify: `README.md`
- Modify: `progress.md` if the implementation session is also tracking progress

- [ ] **Step 1: Update the README to reflect the Inbox-first operator path**

Add a short product-flow note near the overview section:

```md
## Primary Operator Flow

ReviewHub now defaults to an Inbox-first review path:

1. Open `Inbox`
2. Scan the next item in the current state bucket
3. Open the focused detail modal
4. Choose `通过并继续`, `退回`, `补资料`, or `暂缓`
5. Return to the updated list and continue with the next item
```

- [ ] **Step 2: Run the focused UI contract test**

Run:

```bash
node --test --test-concurrency=1 tests/appUiContracts.test.js
```

Expected:

```text
all appUiContracts tests pass
```

- [ ] **Step 3: Run the full suite**

Run:

```bash
npm test
```

Expected:

```text
all tests pass
```

- [ ] **Step 4: Run manual acceptance on the local app**

Run:

```bash
npm start
```

Then verify this acceptance path in the browser:

1. Open the app and confirm it lands in `Inbox`
2. Confirm the top chrome is a compact summary strip, not a hero dashboard
3. Open the first visible `可继续` item
4. Confirm the modal shows summary and actions before raw details
5. Click `通过并继续`
6. Confirm the success copy is human-readable
7. Confirm the modal closes and the list advances naturally

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: describe inbox-first operator flow"
```

---

## Self-Review Checklist

### Spec coverage

- `Inbox` as the default surface: covered by Task 1
- Compact summary strip: covered by Task 2
- Scan-first list rows: covered by Task 3
- Focused modal with detailed info demoted: covered by Task 4
- Primary action and progressive disclosure: covered by Task 5
- State return and auto-advance: covered by Task 6
- Docs and end-to-end verification: covered by Task 7

### Placeholder scan

No unresolved placeholder language remains. Every task contains exact files, commands, and concrete code snippets.

### Type consistency

This plan keeps the current front-end architecture and reuses the existing queue-detail concepts:

- `state.activeSection`
- `state.inboxTab`
- `getNextQueueSelection(...)`
- `renderQueueDetail(item)`
- `runQueueAction(action)`

No new backend contracts are introduced in the plan.
