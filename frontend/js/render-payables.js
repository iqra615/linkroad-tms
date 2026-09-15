const RenderPayables = (() => {
  function render() {
    const tbody = document.getElementById('payables-table');
    const loads = State.loads.filter((l) => l.carrier_rate !== null && l.carrier_rate !== undefined);

    let unpaid = 0, paid = 0;
    loads.forEach((l) => {
      const rate = parseFloat(l.carrier_rate);
      if (!Number.isFinite(rate)) return;
      if (l.carrier_pay_status === 'Paid') paid += rate; else unpaid += rate;
    });
    document.getElementById('stat-ap').innerText = '$' + unpaid.toLocaleString(undefined, { maximumFractionDigits: 0 });
    document.getElementById('stat-ap-paid').innerText = '$' + paid.toLocaleString(undefined, { maximumFractionDigits: 0 });

    if (!loads.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="px-5 py-10 text-center text-slate-500">No loads with a carrier rate yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = loads.map((l) => `
      <tr class="hover:bg-slate-800/60">
        <td class="px-5 py-4 font-bold text-white">${esc(l.load_number)} ${entityBadge(l.entity_code)}</td>
        <td class="px-5 py-4">${esc(l.carrier_name) || '<span class="text-slate-500">Unassigned</span>'}</td>
        <td class="px-5 py-4 font-semibold text-slate-200">${money(l.carrier_rate)}</td>
        <td class="px-5 py-4">${payStatusBadge(l.carrier_pay_status || 'Unpaid')}</td>
        <td class="px-5 py-4 text-slate-400">${l.carrier_paid_date ? esc(l.carrier_paid_date.slice(0, 10)) : '—'}</td>
        <td class="px-5 py-4 text-right whitespace-nowrap">
          ${l.carrier_pay_status !== 'Paid'
            ? `<button data-carrier-pay="${l.id}" data-pay-value="Paid" class="bg-slate-700 hover:bg-emerald-600 text-white text-xs px-2.5 h-8 rounded-lg">Mark Paid</button>`
            : `<button data-carrier-pay="${l.id}" data-pay-value="Unpaid" class="bg-slate-700 hover:bg-amber-600 text-white text-xs px-2.5 h-8 rounded-lg">Mark Unpaid</button>`}
        </td>
      </tr>`).join('');
  }
  return { render };
})();
