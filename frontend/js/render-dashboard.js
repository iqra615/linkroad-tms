const RenderDashboard = (() => {
  async function render() {
    const stats = await Api.Dashboard.summary();
    document.getElementById('stat-monthly-loads').innerText = stats.monthlyLoads;
    document.getElementById('stat-find-carrier').innerText = stats.findCarrier;
    document.getElementById('stat-completed').innerText = stats.completed;
    document.getElementById('stat-gross-revenue').innerText = '$' + stats.grossRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 });

    const tbody = document.getElementById('dashboard-load-table');
    const loads = State.loads.slice(0, 8);
    if (!loads.length) {
      tbody.innerHTML = emptyRow(6, 'No loads yet — create your first dispatch.');
      return;
    }
    tbody.innerHTML = loads.map((l) => `
      <tr class="${statusRowClass(l.status)}">
        <td><button class="clickable-link" data-edit-load="${l.id}">${esc(l.load_number)}</button></td>
        <td>${entityBadge(l.entity_code)}</td>
        <td>${esc(l.customer_name) || '<span class="text-muted">Unassigned</span>'}</td>
        <td class="text-muted">${esc(shortLoc(l.origin))} → ${esc(l.consignee_name) || '—'}</td>
        <td>${esc(l.status)}</td>
        <td style="text-align:right;"><button class="btn-primary btn-sm" data-open-doc="rc" data-load-id="${l.id}">RC</button></td>
      </tr>`).join('');
  }
  return { render };
})();
