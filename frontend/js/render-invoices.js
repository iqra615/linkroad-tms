const RenderInvoices = (() => {
  function checkedValues(selector) {
    return Array.from(document.querySelectorAll(selector)).filter((cb) => cb.checked).map((cb) => cb.value);
  }

  function render() {
    renderCustomerInvoices();
    renderCarrierPayments();
  }

  function renderCustomerInvoices() {
    const allowed = checkedValues('.cust-filter');
    const tbody = document.getElementById('customer-invoice-table');
    const rows = State.invoices.filter((inv) => allowed.includes(inv.status));

    if (!rows.length) {
      tbody.innerHTML = emptyRow(8, 'No invoices match these filters.');
      return;
    }

    tbody.innerHTML = rows.map((inv) => `
      <tr>
        <td>${esc(inv.invoice_number)}</td>
        <td>${esc(inv.load_number)}</td>
        <td>${esc(inv.customer_name) || '<span class="text-muted">Unassigned</span>'}</td>
        <td>${money(inv.amount)}</td>
        <td>${dateOrDash(inv.issued_date)}</td>
        <td>
          <select class="status-select" data-invoice-status-select="${inv.id}">
            ${['Not Sent', 'Sent', 'Paid', 'Overdue', 'Void'].map((s) => `<option value="${s}" ${inv.status === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </td>
        <td>${inv.paid_date ? dateOrDash(inv.paid_date) : (inv.due_date ? `<span class="text-muted">Due: ${dateOrDash(inv.due_date)}</span>` : '—')}</td>
        <td><button class="btn-primary btn-sm" data-open-doc="invoice" data-invoice-id="${inv.id}">Print Invoice</button></td>
      </tr>`).join('');
  }

  function renderCarrierPayments() {
    const allowed = checkedValues('.carrier-filter');
    const tbody = document.getElementById('carrier-payment-table');
    const rows = State.loads.filter((l) => l.carrier_rate != null && allowed.includes(l.carrier_pay_status || 'Pending'));

    if (!rows.length) {
      tbody.innerHTML = emptyRow(6, 'No carrier payments match these filters.');
      return;
    }

    tbody.innerHTML = rows.map((l) => `
      <tr>
        <td>${esc(l.load_number)}</td>
        <td>${esc(l.carrier_name) || '<span class="text-muted">Unassigned</span>'}</td>
        <td>${esc(l.carrier_dispatcher_name) || ''} ${l.carrier_dispatcher_name && l.carrier_city ? '/' : ''} ${esc(l.carrier_city) || ''}</td>
        <td>${money(l.carrier_rate)}</td>
        <td>
          <select class="status-select" data-carrier-pay-select="${l.id}">
            ${['Invoice Received', 'Pending', 'Done'].map((s) => `<option value="${s}" ${(l.carrier_pay_status || 'Pending') === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </td>
        <td>${l.carrier_pay_status === 'Done' ? dateOrDash(l.carrier_paid_date) : '—'}</td>
      </tr>`).join('');
  }

  return { render, renderCustomerInvoices, renderCarrierPayments };
})();
