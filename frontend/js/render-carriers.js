const RenderCarriers = (() => {
  function render() {
    renderAnalytics();
    renderDirectory();
  }

  function renderAnalytics() {
    // On-time performance proxy: % of that carrier's loads that reached Completed.
    const byCarrier = {};
    State.loads.forEach((l) => {
      if (!l.carrier_id) return;
      byCarrier[l.carrier_id] = byCarrier[l.carrier_id] || { total: 0, completed: 0, name: l.carrier_name };
      byCarrier[l.carrier_id].total++;
      if (l.status === 'Completed') byCarrier[l.carrier_id].completed++;
    });
    const items = Object.values(byCarrier)
      .map((c) => ({ label: c.name, value: c.total ? Math.round((c.completed / c.total) * 100) : 0 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
    renderBarChart(document.getElementById('carrier-performance-chart'), items, () => 'var(--secondary)');

    const unpaid = State.loads
      .filter((l) => l.carrier_rate != null && l.carrier_pay_status !== 'Done')
      .reduce((sum, l) => sum + Number(l.carrier_rate), 0);
    const totalLoadsWithCarrier = State.loads.filter((l) => l.carrier_id).length;
    const completedLoadsWithCarrier = State.loads.filter((l) => l.carrier_id && l.status === 'Completed').length;
    const rate = totalLoadsWithCarrier ? Math.round((completedLoadsWithCarrier / totalLoadsWithCarrier) * 100) : 0;

    document.getElementById('carrier-total-active').innerText = State.carriers.filter((c) => c.status === 'Active').length;
    document.getElementById('carrier-pending-settlements').innerText = '$' + unpaid.toLocaleString(undefined, { minimumFractionDigits: 2 });
    document.getElementById('carrier-compliance-rate').innerText = totalLoadsWithCarrier ? `${rate}%` : '—';
  }

  function renderDirectory() {
    const tbody = document.getElementById('carriers-table');
    if (!State.carriers.length) {
      tbody.innerHTML = emptyRow(9, 'No carriers yet — add the motor carriers you dispatch freight to.');
      return;
    }
    tbody.innerHTML = State.carriers.map((c) => `
      <tr>
        <td>${esc(c.name)}</td>
        <td>${esc(c.email) || '—'}</td>
        <td>${esc(c.mc_number) || '—'}</td>
        <td>${esc(c.dot_number) || '—'}</td>
        <td>${esc(c.city) || '—'}</td>
        <td>${esc(c.state) || '—'}</td>
        <td>${esc(c.dispatcher_name) || '—'}</td>
        <td>${esc(c.status || 'Active')}</td>
        <td>
          <button class="btn-primary btn-sm" data-edit-carrier="${c.id}">Edit</button>
          <button class="btn-danger btn-sm" data-delete-carrier="${c.id}" data-carrier-label="carrier ${esc(c.name)}">Delete</button>
        </td>
      </tr>`).join('');
  }

  return { render };
})();
