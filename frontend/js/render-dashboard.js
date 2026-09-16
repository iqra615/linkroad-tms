const RenderDashboard = (() => {
  const BUCKET_COLORS = {
    'Completed': '#10b981',
    'In Transit': '#3b82f6',
    'Pending Pickup': '#f59e0b',
    'Holds / Issues': '#ef4444'
  };

  async function render() {
    let stats;
    try {
      stats = await Api.Dashboard.summary();
    } catch (err) {
      toast('Dashboard stats failed to load: ' + describeApiError(err), 'error');
      stats = {};
    }
    document.getElementById('stat-monthly-loads').innerText = stats.monthlyLoads ?? '—';
    document.getElementById('stat-available-pickup').innerText = stats.availableForPickup ?? '—';
    document.getElementById('stat-find-carrier').innerText = stats.findCarrier ?? '—';
    document.getElementById('stat-completed').innerText = stats.completed ?? '—';
    document.getElementById('stat-pending-invoices').innerText = stats.pendingCustomerInvoices ?? '—';
    document.getElementById('stat-pending-payments').innerText = stats.pendingCarrierPayments ?? '—';
    document.getElementById('stat-gross-revenue').innerText = '$' + (Number(stats.grossRevenue) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });

    renderWeeklyVolume(stats.weeklyVolume || []);
    renderStatusBreakdown(stats.statusBreakdown || []);

    const tbody = document.getElementById('dashboard-load-table');
    const loads = State.loads.slice(0, 8);
    if (!loads.length) {
      tbody.innerHTML = emptyRow(6, 'No loads yet — create your first dispatch.');
      return;
    }
    tbody.innerHTML = loads.map((l) => `
      <tr class="${statusRowClass(l.status)}">
        <td><button class="clickable-link" data-view-load="${l.id}">${esc(l.load_number)}</button></td>
        <td>${entityBadge(l.entity_code)}</td>
        <td>${esc(l.customer_name) || '<span class="text-muted">Unassigned</span>'}</td>
        <td class="text-muted">${esc(shortLoc(l.origin))} → ${esc(l.consignee_name) || '—'}</td>
        <td>${esc(l.status)}</td>
        <td style="text-align:right;"><button class="btn-primary btn-sm" data-open-doc="rc" data-load-id="${l.id}">RC</button></td>
      </tr>`).join('');
  }

  function renderWeeklyVolume(weeklyVolume) {
    const items = weeklyVolume.map((d) => ({ label: d.day, value: d.count }));
    renderBarChart(document.getElementById('weekly-volume-chart'), items, () => 'var(--secondary)');
  }

  function renderStatusBreakdown(statusBreakdown) {
    const container = document.getElementById('status-breakdown-chart');
    const total = statusBreakdown.reduce((sum, b) => sum + b.count, 0);
    if (!total) {
      container.innerHTML = `<p style="color:#94a3b8;font-size:0.85rem;">No data yet.</p>`;
      return;
    }

    // Build a CSS conic-gradient pie from cumulative percentages — no SVG/canvas needed.
    let cumulative = 0;
    const stops = statusBreakdown.map((b) => {
      const start = cumulative;
      cumulative += b.pct;
      return `${BUCKET_COLORS[b.label] || '#94a3b8'} ${start}% ${cumulative}%`;
    }).join(', ');

    const legend = statusBreakdown.map((b) => `
      <div style="display:flex;align-items:center;gap:6px;font-size:0.8rem;margin-bottom:6px;">
        <span style="width:12px;height:12px;border-radius:3px;background:${BUCKET_COLORS[b.label] || '#94a3b8'};display:inline-block;"></span>
        ${esc(b.label)} (${b.pct}%)
      </div>`).join('');

    container.innerHTML = `
      <div style="width:150px;height:150px;border-radius:50%;background:conic-gradient(${stops});flex-shrink:0;"></div>
      <div>${legend}</div>
    `;
  }

  return { render };
})();

