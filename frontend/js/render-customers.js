const RenderCustomers = (() => {
  function render() {
    const grid = document.getElementById('customers-grid');
    if (!State.customers.length) {
      grid.innerHTML = emptyState('building', 'No customers yet', 'Add the shippers you bill for freight.', 'customer');
      return;
    }
    grid.innerHTML = State.customers.map((c) => `
      <div class="bg-slate-800 p-5 rounded-2xl border border-slate-700 space-y-2">
        <div class="bg-blue-600/10 w-9 h-9 rounded-lg flex items-center justify-center text-blue-400 mb-1"><i class="fa-solid fa-building"></i></div>
        <h4 class="font-bold text-white text-sm">${esc(c.name)}</h4>
        <p class="text-xs text-slate-400"><i class="fa-solid fa-envelope mr-1"></i> ${esc(c.email) || '—'}</p>
        <p class="text-xs text-slate-400"><i class="fa-solid fa-map-pin mr-1"></i> ${esc(c.address) || '—'}</p>
        <div class="pt-2 border-t border-slate-700/60 text-xs font-semibold text-emerald-400">Terms: ${esc(c.terms) || 'Net 30'}</div>
        <div class="flex gap-2 pt-2">
          <button data-edit-customer="${c.id}" class="flex-1 bg-slate-700 hover:bg-slate-600 text-xs py-1.5 rounded-lg"><i class="fa-solid fa-pen mr-1"></i> Edit</button>
          <button data-delete-customer="${c.id}" data-customer-label="customer ${esc(c.name)}" class="flex-1 bg-slate-700 hover:bg-red-600 text-xs py-1.5 rounded-lg"><i class="fa-solid fa-trash mr-1"></i> Delete</button>
        </div>
      </div>`).join('');
  }
  return { render };
})();
