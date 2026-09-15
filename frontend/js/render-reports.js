const RenderReports = (() => {
  function populateUserSelect() {
    const sel = document.getElementById('userWiseSelect');
    if (sel.dataset.populated === String(State.users.length)) return;
    sel.innerHTML = State.users.map((u) => `<option value="${u.id}">${esc(u.name)}</option>`).join('');
    sel.dataset.populated = String(State.users.length);
  }

  async function refreshSummary() {
    const period = document.getElementById('reportsPeriod').value;
    const summary = await Api.Reports.summary(period);
    document.getElementById('reportsRevenue').innerText = money(summary.totalRevenue);
    document.getElementById('reportsExpenses').innerText = money(summary.totalExpenses);
    document.getElementById('reportsMargin').innerText = summary.netMarginPct + '%';
  }

  async function generateUserReport() {
    populateUserSelect();
    const userId = document.getElementById('userWiseSelect').value;
    const period = document.getElementById('userWisePeriod').value;
    if (!userId) return toast('No users to report on yet.', 'error');

    const box = document.getElementById('userWiseResult');
    box.classList.remove('hidden');
    box.innerHTML = `<p class="text-muted">Generating…</p>`;

    try {
      const report = await Api.Reports.userWise(userId, period);
      box.innerHTML = `
        <div class="stats-grid" style="margin-bottom:12px;">
          <div class="card"><h3>Loads</h3><div class="value">${report.loadsCount}</div></div>
          <div class="card"><h3>Revenue</h3><div class="value" style="color:var(--success);font-size:1.3rem;">${money(report.totalRevenue)}</div></div>
          <div class="card"><h3>Carrier Pay</h3><div class="value" style="font-size:1.3rem;">${money(report.totalCarrierPay)}</div></div>
          <div class="card"><h3>Gross Profit</h3><div class="value" style="color:var(--secondary);font-size:1.3rem;">${money(report.grossProfit)}</div></div>
        </div>
        ${report.loads.length ? `<div class="table-container" style="margin-top:0;">
          <table>
            <thead><tr><th>Load #</th><th>Status</th><th>Customer Charge</th></tr></thead>
            <tbody>
              ${report.loads.map((l) => `<tr><td>${esc(l.load_number)}</td><td>${esc(l.status)}</td><td style="color:var(--success);">${money(l.customer_charge)}</td></tr>`).join('')}
            </tbody>
          </table>
        </div>` : `<p class="text-muted" style="margin-top:10px;">No loads assigned to this user in this period.</p>`}
      `;
    } catch (err) {
      box.innerHTML = `<p style="color:var(--danger);">${esc(describeApiError(err))}</p>`;
    }
  }

  async function exportExcel() {
    const period = document.getElementById('reportsPeriod').value;
    try {
      await Api.Reports.downloadCsv(period);
      toast('Exported.', 'success');
    } catch (err) {
      toast(describeApiError(err), 'error');
    }
  }

  async function exportPdf() {
    const period = document.getElementById('reportsPeriod').value;
    try {
      const { rows } = await Api.Reports.exportJson(period);
      Documents.downloadReportPdf(period, rows);
    } catch (err) {
      toast(describeApiError(err), 'error');
    }
  }

  async function render() {
    populateUserSelect();
    await refreshSummary();
  }

  return { render, refreshSummary, generateUserReport, exportExcel, exportPdf, populateUserSelect };
})();
