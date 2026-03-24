const els = {
  summaryCards: document.getElementById('summaryCards'),
  statusFilter: document.getElementById('statusFilter'),
  platformFilter: document.getElementById('platformFilter'),
  riskFilter: document.getElementById('riskFilter'),
  searchInput: document.getElementById('searchInput'),
  itemsList: document.getElementById('itemsList'),
  detailView: document.getElementById('detailView'),
  listMeta: document.getElementById('listMeta'),
  refreshBtn: document.getElementById('refreshBtn'),
  quickTabs: document.getElementById('quickTabs'),
};

let allItems = [];
let filtered = [];
let selectedId = null;
let quickFilter = 'all';

function badge(text, cls='') {
  return `<span class="badge ${cls}">${text}</span>`;
}

function uniq(values) {
  return [...new Set(values.filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b)));
}

function escapeHtml(str='') {
  return String(str).replace(/[&<>]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[s]));
}

function evaluateItem(item) {
  const title = `${item.title} ${item.notes} ${item.source}`.toLowerCase();
  let reconcile = 'normal';
  if (item.status === 'approved') reconcile = 'done';
  else if (title.includes('smoke')) reconcile = 'suspected_obsolete';
  else if (item.platform === 'V2EX' && title.includes('aion') && !title.includes('更新')) reconcile = 'possible_duplicate';
  else if (item.notes.includes('approval_status=pending') && item.status === 'queued') reconcile = 'needs_reconcile';

  let priority = 'P3';
  let action = '暂缓';
  let why = '当前可见价值一般，先放后面。';

  if (reconcile === 'done') {
    priority = 'Close';
    action = '已完成';
    why = '当前已是完成态，不需要继续推进。';
  } else if (reconcile === 'suspected_obsolete') {
    priority = 'Close';
    action = '关闭';
    why = '看起来像历史烟雾测试/过时内容，优先级应关闭或归档。';
  } else if (reconcile === 'possible_duplicate') {
    priority = 'P3';
    action = '校准';
    why = '疑似和同平台相近主题重复，先校准再决定是否继续。';
  } else if (item.status === 'pending' || item.status === 'approval_pending') {
    if (item.platform === 'V2EX' && title.includes('更新')) {
      priority = 'P1';
      action = '现在做';
      why = '更新类内容时效强、成本低、准备度高，优先处理。';
    } else if (item.platform === 'Product Hunt' || item.platform === 'Reddit') {
      priority = 'P2';
      action = '补信息';
      why = '平台价值高，但发布前通常还需要更多校准或人工审看。';
    } else if (item.platform === 'X/Twitter') {
      priority = 'P2';
      action = '本轮可做';
      why = '内容较轻，适合尽快审看，但不一定先于高时效更新帖。';
    } else {
      priority = 'P2';
      action = '补信息';
      why = '已进入待审批，值得处理，但还需要补足判断信息。';
    }
  } else if (item.status === 'queued') {
    if (item.risk === 'manual') {
      priority = 'P2';
      action = '补信息';
      why = '队列项价值可能不错，但人工成本和风险更高，不宜盲推。';
    } else {
      priority = 'P3';
      action = '暂缓';
      why = '仍在排队阶段，优先级低于已进入待审批的事项。';
    }
  }

  return { ...item, reconcile, priority, action, why };
}

function renderFilters() {
  const fill = (el, values) => {
    const current = el.value;
    el.innerHTML = '<option value="all">全部</option>' + values.map(v => `<option value="${String(v).replace(/"/g,'&quot;')}">${v}</option>`).join('');
    if (values.includes(current)) el.value = current;
  };
  fill(els.statusFilter, uniq(allItems.map(x => x.status)));
  fill(els.platformFilter, uniq(allItems.map(x => x.platform)));
  fill(els.riskFilter, uniq(allItems.map(x => x.risk)));
}

function renderSummary(data) {
  const queue = data.daily_channel_queue;
  const pending = allItems.filter(x => x.status === 'pending' || x.status === 'approval_pending').length;
  const queued = allItems.filter(x => x.status === 'queued').length;
  const suspect = allItems.filter(x => x.reconcile !== 'normal' && x.reconcile !== 'done').length;
  const platforms = Object.keys(queue.platform_counts || {}).length;
  const cards = [
    ['Pending', pending],
    ['Queued', queued],
    ['Suspect', suspect],
    ['Platforms', platforms],
  ];
  els.summaryCards.innerHTML = cards.map(([label, value]) => `<div class="card"><div class="label">${label}</div><div class="value">${value}</div></div>`).join('');
}

function normalize(data) {
  const regEntries = (data.approval_registry.entries || []).map(entry => ({
    id: entry.entry_id,
    sourceType: 'approval_registry',
    title: entry.notes || entry.post_id || entry.item_id || entry.entry_id,
    platform: entry.platform,
    status: entry.status,
    risk: entry.scope || '',
    notes: entry.notes || '',
    reason: entry.reason || '',
    source: entry.source || '',
    requested_at: entry.requested_at_utc || '',
    approved_at: entry.approved_at_utc || '',
    raw: entry,
  }));
  const queueItems = (data.daily_channel_queue.items || []).map(item => ({
    id: item.item_id,
    sourceType: 'daily_channel_queue',
    title: item.title || item.item_id,
    platform: item.platform,
    status: item.status,
    risk: item.risk || '',
    notes: item.notes || '',
    reason: '',
    source: item.source || '',
    requested_at: '',
    approved_at: '',
    raw: item,
  }));
  const map = new Map();
  [...regEntries, ...queueItems].forEach(item => {
    const key = `${item.platform}::${item.title}`;
    if (!map.has(key)) map.set(key, item);
    else {
      const prev = map.get(key);
      map.set(key, {
        ...prev,
        status: prev.status || item.status,
        notes: prev.notes || item.notes,
        source: prev.source || item.source,
        raw: { approval: prev.raw, queue: item.raw },
      });
    }
  });
  return [...map.values()].map(evaluateItem).sort((a,b) => {
    const order = { P1: 1, P2: 2, P3: 3, Close: 4 };
    return (order[a.priority] - order[b.priority]) || String(b.requested_at || '').localeCompare(String(a.requested_at || '')) || String(a.title).localeCompare(String(b.title));
  });
}

function matchQuickFilter(item) {
  if (quickFilter === 'all') return true;
  if (quickFilter === 'focus') return ['pending','approval_pending','queued'].includes(item.status) && ['P1','P2'].includes(item.priority);
  if (quickFilter === 'suspect') return item.reconcile !== 'normal' && item.reconcile !== 'done';
  if (quickFilter === 'done') return item.reconcile === 'done' || item.priority === 'Close';
  return true;
}

function applyFilters() {
  const status = els.statusFilter.value;
  const platform = els.platformFilter.value;
  const risk = els.riskFilter.value;
  const q = els.searchInput.value.trim().toLowerCase();
  filtered = allItems.filter(item => {
    if (!matchQuickFilter(item)) return false;
    if (status !== 'all' && item.status !== status) return false;
    if (platform !== 'all' && item.platform !== platform) return false;
    if (risk !== 'all' && item.risk !== risk) return false;
    if (q) {
      const hay = [item.title, item.notes, item.source, item.platform, item.status, item.priority, item.action, item.why].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  renderList();
  if (!filtered.some(x => x.id === selectedId)) selectedId = filtered[0]?.id || null;
  renderDetail();
}

function renderList() {
  els.listMeta.textContent = `共 ${filtered.length} 项 · 当前视图：${quickFilter}`;
  els.itemsList.innerHTML = filtered.map(item => `
    <article class="item ${item.id === selectedId ? 'active' : ''}" data-id="${item.id}">
      <div class="title">${item.title}</div>
      <div class="sub">${item.platform} · ${item.sourceType}</div>
      <div class="badges">
        ${badge(item.priority, `priority-${item.priority.toLowerCase()}`)}
        ${badge(item.action)}
        ${badge(item.status, `status-${item.status}`)}
        ${item.reconcile !== 'normal' ? badge(item.reconcile, `reconcile-${item.reconcile}`) : ''}
      </div>
      <div class="sub" style="margin-top:8px;line-height:1.45">${item.why}</div>
    </article>
  `).join('');
  document.querySelectorAll('.item').forEach(el => el.onclick = () => {
    selectedId = el.dataset.id;
    renderList();
    renderDetail();
  });
}

async function loadSourceText(path) {
  if (!path) return '无 source 文件';
  try {
    const res = await fetch(`/api/source?path=${encodeURIComponent(path)}`);
    if (!res.ok) return `source 读取失败：${res.status}`;
    const data = await res.json();
    return data.text || '(空文件)';
  } catch (err) {
    return `source 读取失败：${err.message}`;
  }
}

async function renderDetail() {
  const item = filtered.find(x => x.id === selectedId);
  if (!item) {
    els.detailView.className = 'detail empty';
    els.detailView.textContent = '请选择左侧项目';
    return;
  }
  els.detailView.className = 'detail';
  els.detailView.innerHTML = `
    <h2>${escapeHtml(item.title)}</h2>
    <div class="badges">
      ${badge(item.priority, `priority-${item.priority.toLowerCase()}`)}
      ${badge(item.action)}
      ${badge(item.platform)}
      ${badge(item.status, `status-${item.status}`)}
      ${item.risk ? badge(item.risk) : ''}
      ${item.reconcile !== 'normal' ? badge(item.reconcile, `reconcile-${item.reconcile}`) : ''}
    </div>
    <div class="grid">
      <div class="kv"><div class="k">why_now</div><div class="v">${escapeHtml(item.why)}</div></div>
      <div class="kv"><div class="k">recommended_action</div><div class="v">${escapeHtml(item.action)}</div></div>
      <div class="kv"><div class="k">source</div><div class="v">${escapeHtml(item.source || '-')}</div></div>
      <div class="kv"><div class="k">requested_at</div><div class="v">${escapeHtml(item.requested_at || '-')}</div></div>
      <div class="kv"><div class="k">approved_at</div><div class="v">${escapeHtml(item.approved_at || '-')}</div></div>
      <div class="kv"><div class="k">notes</div><div class="v">${escapeHtml(item.notes || '-')}</div></div>
      <div class="kv"><div class="k">reason</div><div class="v">${escapeHtml(item.reason || '-')}</div></div>
      <div class="kv"><div class="k">id</div><div class="v">${escapeHtml(item.id)}</div></div>
    </div>
    <div class="section-label">Source Preview</div>
    <pre id="sourcePreview">正在读取 source...</pre>
    <div class="section-label">Raw JSON</div>
    <pre>${escapeHtml(JSON.stringify(item.raw, null, 2))}</pre>
  `;
  const sourceText = await loadSourceText(item.source);
  const el = document.getElementById('sourcePreview');
  if (el) el.textContent = sourceText;
}

async function load() {
  const res = await fetch('/api/data');
  const data = await res.json();
  allItems = normalize(data);
  renderSummary(data);
  renderFilters();
  applyFilters();
}

[els.statusFilter, els.platformFilter, els.riskFilter].forEach(el => el.onchange = applyFilters);
els.searchInput.oninput = applyFilters;
els.refreshBtn.onclick = load;
els.quickTabs.querySelectorAll('.tab').forEach(btn => {
  btn.onclick = () => {
    quickFilter = btn.dataset.quick;
    els.quickTabs.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x === btn));
    applyFilters();
  };
});
load();
