const RenderConsignees = (() => {
  function render() {
    const grid = document.getElementById('consignees-grid');
    if (!State.consignees.length) {
      grid.innerHTML = emptyState('warehouse', 'No consignees yet', 'Add delivery locations you ship to.', 'consignee');
      return;
    }
    grid.innerHTML = State.consignees.map((c) => `
      <div class="bg-slate-800 p-5 rounded-2xl border border-slate-700 space-y-2">
        <div class="bg-purple-600/10 w-9 h-9 rounded-lg flex items-center justify-center text-purple-400 mb-1"><i class="fa-solid fa-warehouse"></i></div>
        <h4 class="font-bold text-white text-sm">${esc(c.name)}</h4>
        <p class="text-xs text-slate-400"><i class="fa-solid fa-map-pin mr-1"></i> ${esc(c.address) || '—'}</p>
        <p class="text-xs text-slate-400"><i class="fa-solid fa-phone mr-1"></i> ${esc(c.contact) || '—'}</p>
        <div class="flex gap-2 pt-2">
          <button data-edit-consignee="${c.id}" class="flex-1 bg-slate-700 hover:bg-slate-600 text-xs py-1.5 rounded-lg"><i class="fa-solid fa-pen mr-1"></i> Edit</button>
          <button data-delete-consignee="${c.id}" data-consignee-label="consignee ${esc(c.name)}" class="flex-1 bg-slate-700 hover:bg-red-600 text-xs py-1.5 rounded-lg"><i class="fa-solid fa-trash mr-1"></i> Delete</button>
        </div>
      </div>`).join('');
  }
  return { render };
})();
