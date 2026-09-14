const RenderLoads = (() => {
  async function refresh() {
    const search = document.getElementById('loadSearch').value.trim();
    const status = document.getElementById('loadStatusFilter').value;
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    await State.refreshLoads(params.toString() ? `?${params}` : '');
    render();
  }

  function render() {
    const tbody = document.getElementById('full-loads-table');
    const loads = State.loads;

    if (!loads.length) {
      tbody.innerHTML = `<tr><td colspan="9" class="px-5 py-10 text-center text-slate-500">No loads match. <button data-open-modal="load" class="text-blue-400 underline">Add one</button></td></tr>`;
      return;
    }

    tbody.innerHTML = loads.map((l) => `
      <tr class="hover:bg-slate-800/60 transition align-top">
        <td class="px-5 py-4 font-bold text-white">${esc(l.load_number)}</td>
        <td class="px-5 py-4">${esc(l.customer_name) || '<span class="text-slate-500">—</span>'}</td>
        <td class="px-5 py-4">${esc(l.carrier_name) || '<span class="text-slate-500">—</span>'}</td>
        <td class="px-5 py-4 text-slate-400 max-w-xs">${esc(shortLoc(l.origin))} <i class="fa-solid fa-arrow-right text-xs text-slate-600 mx-1"></i> ${esc(l.consignee_name) || '—'}</td>
        <td class="px-5 py-4 text-slate-400">${esc(l.container_number) || '—'}<br><span class="text-slate-600">${esc(l.bol_number) || ''}</span></td>
        <td class="px-5 py-4 font-semibold text-slate-200">${l.carrier_rate != null ? money(l.carrier_rate) : '—'}</td>
        <td class="px-5 py-4 font-semibold text-emerald-400">${l.customer_rate != null ? money(l.customer_rate) : '—'}</td>
        <td class="px-5 py-4">${statusBadge(l.status)}</td>
        <td class="px-5 py-4 text-right whitespace-nowrap space-y-1">
          <div>
            <button data-open-doc="rc" data-load-id="${l.id}" title="Rate Confirmation" class="bg-slate-700 hover:bg-slate-600 text-white w-8 h-8 rounded-lg text-xs mr-1"><i class="fa-solid fa-file-pdf text-red-400"></i></button>
            <button data-open-doc="bol" data-load-id="${l.id}" title="Bill of Lading" class="bg-slate-700 hover:bg-slate-600 text-white w-8 h-8 rounded-lg text-xs mr-1"><i class="fa-solid fa-clipboard-list text-blue-400"></i></button>
            <button data-edit-load="${l.id}" title="Edit" class="bg-slate-700 hover:bg-slate-600 text-white w-8 h-8 rounded-lg text-xs mr-1"><i class="fa-solid fa-pen"></i></button>
            <button data-delete-load="${l.id}" data-load-label="load ${esc(l.load_number)}" title="Delete" class="bg-slate-700 hover:bg-red-600 text-white w-8 h-8 rounded-lg text-xs"><i class="fa-solid fa-trash"></i></button>
          </div>
          ${l.customer_id && l.customer_rate != null
            ? `<button data-create-invoice="${l.id}" class="text-xs text-emerald-400 hover:underline">+ Create invoice</button>`
            : ''}
        </td>
      </tr>`).join('');
  }

  return { refresh, render };
})();
