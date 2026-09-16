const RenderLoads = (() => {
  async function refresh() {
    const search = document.getElementById('loadSearch').value.trim();
    const status = document.getElementById('loadStatusFilter').value;
    const entityId = document.getElementById('loadEntityFilter').value;
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    if (entityId) params.set('entity_id', entityId);
    await State.refreshLoads(params.toString() ? `?${params}` : '');
    render();
  }

  function populateEntityFilter() {
    const sel = document.getElementById('loadEntityFilter');
    if (sel.dataset.populated) return;
    sel.innerHTML = `<option value="">All companies</option>` +
      State.entities.map((e) => `<option value="${e.id}">${esc(e.code)} — ${esc(e.name)}</option>`).join('');
    sel.dataset.populated = '1';
  }

  function populateStatusFilter() {
    const sel = document.getElementById('loadStatusFilter');
    if (sel.dataset.populated) return;
    sel.innerHTML = `<option value="">All statuses</option>` +
      LoadForm.STATUSES.map((s) => `<option value="${s}">${s}</option>`).join('');
    sel.dataset.populated = '1';
  }

  function applyOwnerAndCompletedFilters(loads) {
    let result = loads;
    if (document.getElementById('loadFilterMine').checked) {
      result = result.filter((l) => l.dispatcher_user_id === State.currentUser?.id);
    }
    if (document.getElementById('loadFilterHideCompleted').checked) {
      result = result.filter((l) => l.status !== 'Completed');
    }
    return result;
  }

  function grossProfit(l) {
    if (l.carrier_rate == null || l.customer_charge == null) return '—';
    return money(Number(l.customer_charge) - Number(l.carrier_rate));
  }

  function etaLfd(l) {
    const eta = l.eta_date ? l.eta_date.slice(0, 10) : '—';
    const lfd = l.lfd_date ? l.lfd_date.slice(0, 10) : '—';
    return `${eta} / ${lfd}`;
  }

  function render() {
    populateEntityFilter();
    populateStatusFilter();
    const container = document.getElementById('full-loads-cards');
    const loads = applyOwnerAndCompletedFilters(State.loads);

    if (!loads.length) {
      container.innerHTML = `<div class="card" style="text-align:center;color:#64748b;">No loads match your filters. <button class="clickable-link" data-open-modal="load">Add one</button></div>`;
      return;
    }

    container.innerHTML = loads.map((l) => `
      <div class="load-card ${statusRowClass(l.status)}">
        <div class="load-card-header">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <button class="clickable-link" style="font-size:1.05rem;" data-view-load="${l.id}">${esc(l.load_number)}</button>
            ${entityBadge(l.entity_code)}
            ${loadTypeBadge(l.load_type)}
          </div>
          <select class="status-select" data-status-select="${l.id}">
            ${LoadForm.STATUSES.map((s) => `<option value="${s}" ${l.status === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>

        <div class="load-card-grid">
          <div class="load-card-field"><label>User</label><div class="value">${esc(l.dispatcher_user_name) || '<span class="text-muted">—</span>'}</div></div>
          <div class="load-card-field"><label>Customer</label><div class="value">${esc(l.customer_name) || '<span class="text-muted">—</span>'}</div></div>
          <div class="load-card-field"><label>Consignee</label><div class="value">${esc(l.consignee_name) || '<span class="text-muted">—</span>'}</div></div>
          <div class="load-card-field"><label>Deliver To</label><div class="value text-muted">${esc(l.deliver_to_address) || '—'}</div></div>
          <div class="load-card-field"><label>Pickup Date</label><div class="value">${dateOrDash(l.pickup_date)}</div></div>
          <div class="load-card-field"><label>Delivery Date</label><div class="value">${dateOrDash(l.delivery_date)}</div></div>
          <div class="load-card-field"><label>Empty Return</label><div class="value">${dateOrDash(l.empty_return_date)}</div></div>
          <div class="load-card-field"><label>ETA / LFD</label><div class="value text-muted">${etaLfd(l)}</div></div>
          <div class="load-card-field"><label>Miles</label><div class="value text-muted">${l.estimated_miles ? esc(l.estimated_miles) + ' mi' : '—'}</div></div>
          <div class="load-card-field"><label>Carrier Rate</label><div class="value">${l.carrier_rate != null ? money(l.carrier_rate) : '—'}</div></div>
          <div class="load-card-field"><label>Customer Charge</label><div class="value">${l.customer_charge != null ? money(l.customer_charge) : '—'}</div></div>
          <div class="load-card-field"><label>Gross Profit</label><div class="value" style="font-weight:bold;color:var(--success);">${grossProfit(l)}</div></div>
        </div>

        <div class="load-card-actions">
          <button class="btn-primary btn-sm" data-edit-load="${l.id}">Edit</button>
          <button class="btn-primary btn-sm" data-open-doc="rc" data-load-id="${l.id}">Create RC</button>
          <button class="btn-primary btn-sm" data-open-doc="pod" data-load-id="${l.id}">Create POD</button>
          <button class="btn-danger btn-sm" data-delete-load="${l.id}" data-load-label="load ${esc(l.load_number)}">Delete</button>
          ${l.customer_id && l.customer_charge != null
            ? `<button class="clickable-link" style="font-size:0.8rem;" data-create-invoice="${l.id}">+ Create Invoice</button>`
            : ''}
        </div>
      </div>`).join('');
  }

  return { refresh, render };
})();
