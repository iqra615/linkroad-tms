function esc(s) {
  return (s ?? '').toString().replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function money(n) {
  const v = parseFloat(n);
  return Number.isFinite(v) ? '$' + v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
}

function shortLoc(s) {
  return (s || '').split(',').slice(0, 2).join(',');
}

function dateOrDash(d) {
  return d ? esc(String(d).slice(0, 10)) : '—';
}

function toast(message, type = 'info') {
  const host = document.getElementById('toastHost');
  const el = document.createElement('div');
  el.className = `toast ${type === 'error' ? 'error' : 'success'}`;
  el.innerText = message;
  host.appendChild(el);
  setTimeout(() => el.remove(), 2800);
}

// Row background class for the load status (matches the reference's tr.status-* classes).
function statusRowClass(status) {
  if (status === 'Completed') return 'status-completed';
  if (status === 'Cancelled') return 'status-cancelled';
  if (status === 'Find Carrier') return 'status-find-carrier';
  if (status && status.includes('Hold')) return 'status-hold';
  return '';
}

function invoiceStatusBadge(status) {
  const map = {
    'Not Sent': ['#e2e8f0', '#334155'],
    'Sent': ['#dbeafe', '#1e40af'],
    'Paid': ['#d1fae5', '#065f46'],
    'Overdue': ['#fee2e2', '#991b1b'],
    'Void': ['#f1f5f9', '#94a3b8']
  };
  const [bg, fg] = map[status] || map['Not Sent'];
  return `<span class="badge" style="background:${bg};color:${fg}">${esc(status)}</span>`;
}

function payStatusBadgeText(status) {
  const map = { 'Invoice Received': ['#dbeafe', '#1e40af'], 'Pending': ['#fef3c7', '#92400e'], 'Done': ['#d1fae5', '#065f46'] };
  const [bg, fg] = map[status] || map['Pending'];
  return `<span class="badge" style="background:${bg};color:${fg}">${esc(status)}</span>`;
}

function entityBadgeClass(code) {
  if (code === 'LRL') return 'badge-entity-lrl';
  if (code === 'EXP') return 'badge-entity-exp';
  if (code === 'PIT') return 'badge-entity-pit';
  return '';
}
function entityBadge(code) {
  return `<span class="badge ${entityBadgeClass(code)}">${esc(code || '—')}</span>`;
}

function loadTypeBadge(type) {
  if (!type) return '';
  const isImport = type.startsWith('Import');
  return `<span class="badge" style="background:${isImport ? '#e0f2fe' : '#fff7ed'};color:${isImport ? '#0369a1' : '#c2410c'};">${esc(type)}</span>`;
}

function emptyRow(colspan, message) {
  return `<tr><td colspan="${colspan}" style="text-align:center;color:#64748b;padding:30px;">${esc(message)}</td></tr>`;
}

/** Generic show/hide for the .modal pattern (display:flex via the .flex class). */
function showModal(id) {
  document.getElementById(id).classList.add('flex');
}
function hideModal(id) {
  document.getElementById(id).classList.remove('flex');
}

function describeApiError(err) {
  if (err?.details?.length) return err.details.map((d) => d.message).join(' ');
  return err?.message || 'Something went wrong.';
}

/** Renders a simple bar (height-percent) chart matching the reference's .bar-chart-mock look. */
function renderBarChart(containerEl, items, colorFn) {
  const max = Math.max(1, ...items.map((i) => i.value));
  containerEl.innerHTML = items.length
    ? items.map((item, idx) => {
        const pct = Math.max(4, Math.round((item.value / max) * 100));
        const color = colorFn ? colorFn(idx) : null;
        return `<div class="bar-col"><div class="bar" style="height:${pct}%;${color ? `background:${color};` : ''}"></div><span class="bar-label">${esc(item.label)}</span></div>`;
      }).join('')
    : `<p style="color:#94a3b8;font-size:0.85rem;align-self:center;">No data yet.</p>`;
}

/** Re-applies role-based visibility rules — must be called after every re-render
 *  of a table containing .admin-only-col cells, since those cells are recreated
 *  from scratch each time and don't inherit the class toggle from login time. */
function applyRoleVisibility() {
  const isAdmin = State.currentUser?.role === 'Administrator';
  document.querySelectorAll('.admin-only-col').forEach((el) => el.classList.toggle('role-hidden', !isAdmin));
}
