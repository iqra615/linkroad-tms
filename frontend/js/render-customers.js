const RenderCustomers = (() => {
  function render() {
    renderAnalytics();
    renderDirectory();
  }

  function renderAnalytics() {
    const byCustomer = {};
    State.loads.forEach((l) => {
      if (!l.customer_id || l.customer_charge == null) return;
      byCustomer[l.customer_id] = byCustomer[l.customer_id] || { total: 0, name: l.customer_name };
      byCustomer[l.customer_id].total += Number(l.customer_charge);
    });
    const items = Object.values(byCustomer)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
      .map((c) => ({ label: c.name, value: c.total }));
    const colors = ['var(--success)', 'var(--secondary)', 'var(--warning)', '#a855f7', '#ec4899'];
    renderBarChart(document.getElementById('customer-revenue-chart'), items, (i) => colors[i % colors.length]);

    const totalBalance = State.customers.reduce((sum, c) => sum + (Number(c.outstanding_balance) || 0), 0);
    const termsCount = {};
    State.customers.forEach((c) => { termsCount[c.terms] = (termsCount[c.terms] || 0) + 1; });
    const mostCommonTerm = Object.entries(termsCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

    document.getElementById('cust-total-active').innerText = State.customers.length;
    document.getElementById('cust-total-balance').innerText = '$' + totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 });
    document.getElementById('cust-avg-term').innerText = mostCommonTerm;
  }

  function renderDirectory() {
    const tbody = document.getElementById('customers-table');
    if (!State.customers.length) {
      tbody.innerHTML = emptyRow(6, 'No customers yet — add the shippers you bill for freight.');
      return;
    }
    tbody.innerHTML = State.customers.map((c) => `
      <tr>
        <td>${esc(c.contact_name) || '<span class="text-muted">—</span>'}</td>
        <td>${esc(c.name)}</td>
        <td>${esc(c.email) || '—'}</td>
        <td>${esc(c.phone) || '—'}</td>
        <td>${money(c.outstanding_balance)}</td>
        <td class="actions-cell"><div class="btn-row">
          <button class="btn-primary btn-sm" data-edit-customer="${c.id}">Edit</button>
          <button class="btn-danger btn-sm" data-delete-customer="${c.id}" data-customer-label="customer ${esc(c.name)}">Delete</button>
        </div></td>
      </tr>`).join('');
  }

  return { render };
})();
