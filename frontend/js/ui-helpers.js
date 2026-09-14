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

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function toast(message, type = 'info') {
  const host = document.getElementById('toastHost');
  const colors = { success: 'bg-emerald-600', error: 'bg-red-600', info: 'bg-slate-700' };
  const el = document.createElement('div');
  el.className = `toast ${colors[type] || colors.info} text-white text-sm px-4 py-2.5 rounded-lg shadow-xl flex items-center gap-2`;
  el.innerHTML = `<i class="fa-solid ${type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check'}"></i><span>${esc(message)}</span>`;
  host.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function statusBadge(status) {
  const map = {
    'Dispatched': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'In Transit': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    'At Delivery': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    'Delivered': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    'On Hold': 'bg-red-500/10 text-red-400 border-red-500/20',
    'Cancelled': 'bg-slate-500/10 text-slate-400 border-slate-500/20'
  };
  return `<span class="px-2.5 py-1 rounded-full text-xs font-semibold border ${map[status] || map['Dispatched']}">${esc(status)}</span>`;
}

function invoiceStatusBadge(status) {
  const map = {
    'Draft': 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    'Sent': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'Paid': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    'Void': 'bg-red-500/10 text-red-400 border-red-500/20'
  };
  return `<span class="px-2.5 py-1 rounded-full text-xs font-semibold border ${map[status] || map['Draft']}">${esc(status)}</span>`;
}

function payStatusBadge(status) {
  return status === 'Paid'
    ? `<span class="px-2.5 py-1 rounded-full text-xs font-semibold border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Paid</span>`
    : `<span class="px-2.5 py-1 rounded-full text-xs font-semibold border bg-amber-500/10 text-amber-400 border-amber-500/20">Unpaid</span>`;
}

function emptyState(icon, title, sub, entityType) {
  return `<div class="col-span-full bg-slate-800/50 border border-dashed border-slate-700 rounded-2xl p-10 text-center">
    <i class="fa-solid fa-${icon} text-3xl text-slate-600 mb-3"></i>
    <p class="text-slate-300 font-semibold">${esc(title)}</p>
    <p class="text-slate-500 text-sm mt-1 mb-4">${esc(sub)}</p>
    <button data-open-modal="${entityType}" class="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg"><i class="fa-solid fa-plus mr-1"></i> Add</button>
  </div>`;
}

/** Generic show/hide for the flex-centered modal pattern used throughout the app. */
function showModal(id) {
  const el = document.getElementById(id);
  el.classList.remove('hidden');
  el.classList.add('flex');
}
function hideModal(id) {
  const el = document.getElementById(id);
  el.classList.add('hidden');
  el.classList.remove('flex');
}

/** Reads friendly error/validation messages out of an ApiClientError for toasting. */
function describeApiError(err) {
  if (err?.details?.length) return err.details.map((d) => d.message).join(' ');
  return err?.message || 'Something went wrong.';
}
