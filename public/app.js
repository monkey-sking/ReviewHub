const state = {
  data: null,
  filters: {
    project: 'all',
    status: 'all',
    platform: 'all',
    risk: 'all'
  },
  selectedId: null
};

const elements = {
  approvalJson: document.getElementById('approvalJson'),
  detailEmpty: document.getElementById('detailEmpty'),
  detailGrid: document.getElementById('detailGrid'),
  detailView: document.getElementById('detailView'),
  itemList: document.getElementById('itemList'),
  listMeta: document.getElementById('listMeta'),
  queueJson: document.getElementById('queueJson'),
  refreshButton: document.getElementById('refreshButton'),
  resultCount: document.getElementById('resultCount'),
  projectFilter: document.getElementById('projectFilter'),
  riskFilter: document.getElementById('riskFilter'),
  statusBanner: document.getElementById('statusBanner'),
  statusFilter: document.getElementById('statusFilter'),
  summaryCards: document.getElementById('summaryCards'),
  platformFilter: document.getElementById('platformFilter')
};

function formatDate(value) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function createOptions(selectElement, values, currentValue) {
  const options = ['all', ...values];
  selectElement.innerHTML = options
    .map((value) => {
      const label = value === 'all' ? 'All' : value;
      const selected = value === currentValue ? ' selected' : '';
      return `<option value="${escapeHtml(value)}"${selected}>${escapeHtml(label)}</option>`;
    })
    .join('');
}

function renderSummary() {
  const summary = state.data.summary;
  const cards = [
    { label: 'Pending approvals', value: summary.pending_approvals },
    { label: 'Approval-pending queue', value: summary.approval_pending_items },
    { label: 'Queued items', value: summary.queued_items },
    { label: 'Platforms', value: summary.platform_count }
  ];

  elements.summaryCards.innerHTML = cards
    .map((card) => {
      return `
        <article class="summary-card">
          <p>${escapeHtml(card.label)}</p>
          <strong>${escapeHtml(card.value)}</strong>
        </article>
      `;
    })
    .join('');
}

function renderFilters() {
  const { statuses, platforms, projects, risks } = state.data.filters;
  createOptions(elements.projectFilter, projects, state.filters.project);
  createOptions(elements.statusFilter, statuses, state.filters.status);
  createOptions(elements.platformFilter, platforms, state.filters.platform);
  createOptions(elements.riskFilter, risks, state.filters.risk);
}

function getFilteredItems() {
  return state.data.items.filter((item) => {
    const projectMatch = state.filters.project === 'all' || item.project === state.filters.project;
    const statusMatch = state.filters.status === 'all' || item.status === state.filters.status;
    const platformMatch = state.filters.platform === 'all' || item.platform === state.filters.platform;
    const riskMatch = state.filters.risk === 'all' || item.risk === state.filters.risk;

    return projectMatch && statusMatch && platformMatch && riskMatch;
  });
}

function renderList() {
  const filteredItems = getFilteredItems();
  const totalItems = state.data.items.length;

  elements.resultCount.textContent = `${filteredItems.length} / ${totalItems}`;
  elements.listMeta.textContent = `Queue date ${state.data.metadata.queue_run_date || '—'}`;

  if (!filteredItems.some((item) => item.id === state.selectedId)) {
    state.selectedId = filteredItems[0] ? filteredItems[0].id : null;
  }

  if (filteredItems.length === 0) {
    elements.itemList.innerHTML = '<div class="empty-state">No items match the current filters.</div>';
    renderDetail(null);
    return;
  }

  elements.itemList.innerHTML = filteredItems
    .map((item) => {
      const selectedClass = item.id === state.selectedId ? ' item-row-selected' : '';
      const approvalTag = item.approval_match ? '<span class="tag tag-muted">approval matched</span>' : '';

      return `
        <button class="item-row${selectedClass}" data-item-id="${escapeHtml(item.id)}" type="button">
          <div class="item-row-top">
            <strong>${escapeHtml(item.title)}</strong>
            <div class="tag-group">
              <span class="tag tag-project">${escapeHtml(item.project || 'Unassigned')}</span>
              <span class="tag tag-status">${escapeHtml(item.status)}</span>
              <span class="tag tag-risk">${escapeHtml(item.risk)}</span>
              ${approvalTag}
            </div>
          </div>
          <div class="item-row-meta">
            <span>${escapeHtml(item.platform)}</span>
            <span>${escapeHtml(item.source || 'No source')}</span>
          </div>
        </button>
      `;
    })
    .join('');

  elements.itemList.querySelectorAll('[data-item-id]').forEach((button) => {
    button.addEventListener('click', () => {
      state.selectedId = button.dataset.itemId;
      renderList();
    });
  });

  const selectedItem = filteredItems.find((item) => item.id === state.selectedId) || filteredItems[0];
  renderDetail(selectedItem);
}

function renderDetail(item) {
  if (!item) {
    elements.detailEmpty.hidden = false;
    elements.detailView.hidden = true;
    return;
  }

  elements.detailEmpty.hidden = true;
  elements.detailView.hidden = false;

  const rows = [
    ['Title', item.title || '—'],
    ['Project', item.project || '—'],
    ['Platform', item.platform || '—'],
    ['Status', item.status || '—'],
    ['Risk', item.risk || '—'],
    ['Category', item.category || '—'],
    ['Owner', item.owner || '—'],
    ['Requested at', formatDate(item.requested_at)],
    ['Requested by', item.requested_by || '—'],
    ['Approval ticket', item.approval_ticket || '—'],
    ['Approval entry', item.approval_entry_id || '—'],
    ['Reason', item.reason || '—'],
    ['Notes', item.notes || '—'],
    ['Source', item.source || '—']
  ];

  elements.detailGrid.innerHTML = rows
    .map(([label, value]) => {
      return `
        <div class="detail-row">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
        </div>
      `;
    })
    .join('');

  elements.queueJson.textContent = JSON.stringify(item.raw.queue, null, 2);
  elements.approvalJson.textContent = item.raw.approval
    ? JSON.stringify(item.raw.approval, null, 2)
    : 'No matched approval entry.';
}

function syncFiltersFromInputs() {
  state.filters.project = elements.projectFilter.value;
  state.filters.status = elements.statusFilter.value;
  state.filters.platform = elements.platformFilter.value;
  state.filters.risk = elements.riskFilter.value;
  renderList();
}

async function loadData() {
  elements.refreshButton.disabled = true;
  elements.statusBanner.textContent = 'Loading data…';

  try {
    const response = await fetch('/api/dashboard', { cache: 'no-store' });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    state.data = await response.json();
    renderSummary();
    renderFilters();
    renderList();

    elements.statusBanner.textContent = [
      `Approval updated ${formatDate(state.data.metadata.approval_updated_at)}`,
      `Queue run date ${state.data.metadata.queue_run_date || '—'}`,
      `Generated ${formatDate(state.data.generated_at)}`
    ].join(' • ');
  } catch (error) {
    elements.summaryCards.innerHTML = '';
    elements.itemList.innerHTML = '<div class="empty-state">Failed to load dashboard data.</div>';
    elements.detailEmpty.hidden = false;
    elements.detailView.hidden = true;
    elements.statusBanner.textContent = `Load failed: ${error.message}`;
  } finally {
    elements.refreshButton.disabled = false;
  }
}

elements.projectFilter.addEventListener('change', syncFiltersFromInputs);
elements.statusFilter.addEventListener('change', syncFiltersFromInputs);
elements.platformFilter.addEventListener('change', syncFiltersFromInputs);
elements.riskFilter.addEventListener('change', syncFiltersFromInputs);
elements.refreshButton.addEventListener('click', loadData);

loadData();
