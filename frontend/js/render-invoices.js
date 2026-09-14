const RenderInvoices = (() => {
  function render() {
    const tbody = document.getElementById('invoices-table');
    const invoices = State.invoices;

    let ar = 0, sentCount = 0, paidCount = 0;
    invoices.forEach((inv) => {
      const amt = parseFloat(inv.amount);
      if (Number.isFinite(amt) && inv.status !== 'Paid' && inv.status !== 'Void') ar += amt;
      if (inv.status === 'Sent') sentCount++;
      if (inv.status === 'Paid') paidCount++;
    });
    document.getElementById('stat-ar').innerText = '$' + ar.toLocaleString(undefined, { maximumFractionDigits: 0 });
    document.getElementById('stat-invoiced-count').innerText = sentCount;
    document.getElementById('stat-paid-count').innerText = paidCount;

    if (!invoices.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="px-5 py-10 text-center text-slate-500">No invoices yet — use "+ Create invoice" on a load with a customer rate set.</td></tr>`;
      return;
    }

    tbody.innerHTML = invoices.map((inv) => `
      <tr class="hover:bg-slate-800/60">
        <td class="px-5 py-4 font-bold text-white">${esc(inv.invoice_number)}</td>
        <td class="px-5 py-4 text-slate-400">${esc(inv.load_number)}</td>
        <td class="px-5 py-4">${esc(inv.customer_name) || '<span class="text-slate-500">Unassigned</span>'}</td>
        <td class="px-5 py-4 font-semibold text-emerald-400">${money(inv.amount)}</td>
        <td class="px-5 py-4">${invoiceStatusBadge(inv.status)}</td>
        <td class="px-5 py-4 text-right whitespace-nowrap">
          <button data-open-doc="invoice" data-invoice-id="${inv.id}" title="Preview / Download" class="bg-slate-700 hover:bg-slate-600 text-white w-8 h-8 rounded-lg text-xs mr-1"><i class="fa-solid fa-file-invoice text-emerald-400"></i></button>
          ${inv.status === 'Draft' ? `<button data-invoice-status="${inv.id}" data-status-value="Sent" class="bg-slate-700 hover:bg-blue-600 text-white text-xs px-2.5 h-8 rounded-lg mr-1">Mark Sent</button>` : ''}
          ${inv.status === 'Sent' ? `<button data-invoice-status="${inv.id}" data-status-value="Paid" class="bg-slate-700 hover:bg-emerald-600 text-white text-xs px-2.5 h-8 rounded-lg mr-1">Mark Paid</button>` : ''}
          <button data-delete-invoice="${inv.id}" data-invoice-label="invoice ${esc(inv.invoice_number)}" title="Delete" class="bg-slate-700 hover:bg-red-600 text-white w-8 h-8 rounded-lg text-xs"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>`).join('');
  }
  return { render };
})();
