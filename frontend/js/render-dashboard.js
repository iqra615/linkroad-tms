const RenderDashboard = (() => {
  async function render() {
    const stats = await Api.Dashboard.summary();

    document.getElementById('stat-active').innerText = stats.activeLoads;
    document.getElementById('stat-carriers').innerText = stats.carriers;
    document.getElementById('stat-customers').innerText = stats.customers;
    document.getElementById('stat-margin').innerText = '$' + stats.grossMargin.toLocaleString(undefined, { maximumFractionDigits: 0 });
    document.getElementById('stat-ar-dash').innerText = '$' + stats.outstandingReceivables.toLocaleString(undefined, { maximumFractionDigits: 0 });
    document.getElementById('stat-ap-dash').innerText = '$' + stats.unpaidToCarriers.toLocaleString(undefined, { maximumFractionDigits: 0 });

    const tbody = document.getElementById('dashboard-load-table');
    const loads = State.loads.slice(0, 6);
    if (!loads.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="px-5 py-8 text-center text-slate-500">No loads yet — create your first dispatch.</td></tr>`;
      return;
    }
    tbody.innerHTML = loads.map((l) => `
      <tr class="hover:bg-slate-800/60 transition">
        <td class="px-5 py-4 font-bold text-white">${esc(l.load_number)}</td>
        <td class="px-5 py-4">${esc(l.customer_name) || '<span class="text-slate-500">Unassigned</span>'}</td>
        <td class="px-5 py-4 text-slate-400">${esc(shortLoc(l.origin))} <i class="fa-solid fa-arrow-right text-xs text-slate-600 mx-1.5"></i> ${esc(l.consignee_name) || '—'}</td>
        <td class="px-5 py-4">${esc(l.carrier_name) || '<span class="text-slate-500">Unassigned</span>'}</td>
        <td class="px-5 py-4">${statusBadge(l.status)}</td>
        <td class="px-5 py-4 text-right">
          <button data-open-doc="rc" data-load-id="${l.id}" class="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ml-auto">
            <i class="fa-solid fa-file-pdf text-red-400"></i> Rate Con
          </button>
        </td>
      </tr>`).join('');
  }

  return { render };
})();
