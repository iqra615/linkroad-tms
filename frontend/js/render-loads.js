const RenderLoads = (() => {
  const PAGE_SIZE = 25;
  let currentPage = 1;

  async function refresh() {
    const search = document.getElementById('loadSearch').value.trim();
    const status = document.getElementById('loadStatusFilter').value;
    const entityId = document.getElementById('loadEntityFilter').value;
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    if (entityId) params.set('entity_id', entityId);
    await State.refreshLoads(params.toString() ? `?${params}` : '');
    currentPage = 1; // a new search/filter always starts back at page 1
    render();
  }

  function resetPage() {
    currentPage = 1;
  }

  function goToPage(page) {
    currentPage = page;
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

  function renderPagination(totalItems, totalPages) {
    const bar = document.getElementById('loadsPagination');
    if (!bar) return;
    if (totalItems === 0 || totalPages <= 1) {
      bar.innerHTML = '';
      return;
    }
    const start = (currentPage - 1) * PAGE_SIZE + 1;
    const end = Math.min(currentPage * PAGE_SIZE, totalItems);
    bar.innerHTML = `
      <button class="btn-primary btn-sm" ${currentPage <= 1 ? 'disabled' : ''} onclick="RenderLoads.goToPage(${currentPage - 1})">← Previous</button>
      <span class="text-muted" style="font-size:0.85rem;">Showing ${start}–${end} of ${totalItems} · Page ${currentPage} of ${totalPages}</span>
      <button class="btn-primary btn-sm" ${currentPage >= totalPages ? 'disabled' : ''} onclick="RenderLoads.goToPage(${currentPage + 1})">Next →</button>
    `;
  }

  function render() {
    populateEntityFilter();
    populateStatusFilter();
    const tbody = document.getElementById('full-loads-table');
    const loads = applyOwnerAndCompletedFilters(State.loads);

    if (!loads.length) {
      tbody.innerHTML = emptyRow(18, 'No loads match your filters.');
      renderPagination(0, 0);
      return;
    }

    const totalPages = Math.max(1, Math.ceil(loads.length / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages; // e.g. a load got deleted off the last page
    if (currentPage < 1) currentPage = 1;
    const pageLoads = loads.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    tbody.innerHTML = pageLoads.map((l) => `
      <tr class="${statusRowClass(l.status)}">
        <td><button class="clickable-link" data-view-load="${l.id}">${esc(l.load_number)}</button></td>
        <td>${entityBadge(l.entity_code)}</td>
        <td>${esc(l.dispatcher_user_name) || '<span class="text-muted">—</span>'}</td>
        <td class="text-muted">${esc(l.container_number) || '—'}</td>
        <td class="text-muted">${esc(l.weight) || '—'}</td>
        <td>${loadTypeBadge(l.load_type) || '—'}</td>
        <td>${esc(l.customer_name) || '<span class="text-muted">—</span>'}</td>
        <td>${esc(l.consignee_name) || '<span class="text-muted">—</span>'}</td>
        <td class="text-muted">${esc(l.deliver_to_address) || '—'}</td>
        <td>${dateOrDash(l.pickup_date)}</td>
        <td>${dateOrDash(l.delivery_date)}</td>
        <td>${dateOrDash(l.empty_return_date)}</td>
        <td class="text-muted">${etaLfd(l)}</td>
        <td>
          <select class="status-select" data-status-select="${l.id}">
            ${LoadForm.STATUSES.map((s) => `<option value="${s}" ${l.status === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </td>
        <td>${l.carrier_rate != null ? money(l.carrier_rate) : '—'}</td>
        <td>${l.customer_charge != null ? money(l.customer_charge) : '—'}</td>
        <td style="font-weight:bold;color:var(--success);" class="admin-only-col">${grossProfit(l)}</td>
        <td class="actions-cell">
          <div class="btn-row">
            <button class="btn-primary btn-sm" data-edit-load="${l.id}">Edit</button>
            <button class="btn-primary btn-sm" data-open-doc="rc" data-load-id="${l.id}">RC</button>
            <button class="btn-primary btn-sm" data-open-doc="pod" data-load-id="${l.id}">POD</button>
            <button class="btn-danger btn-sm" data-delete-load="${l.id}" data-load-label="load ${esc(l.load_number)}">Delete</button>
            ${l.customer_id && l.customer_charge != null
              ? `<button class="clickable-link admin-only-col" style="font-size:0.75rem;" data-create-invoice="${l.id}">+ Invoice</button>`
              : ''}
          </div>
        </td>
      </tr>`).join('');
    applyRoleVisibility();
    renderPagination(loads.length, totalPages);
  }

  return { refresh, render, resetPage, goToPage };
})();
