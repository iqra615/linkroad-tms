const RenderCarriers = (() => {
  function render() {
    const grid = document.getElementById('carriers-grid');
    if (!State.carriers.length) {
      grid.innerHTML = emptyState('truck-front', 'No carriers yet', 'Add the motor carriers you dispatch freight to.', 'carrier');
      return;
    }
    grid.innerHTML = State.carriers.map((c) => `
      <div class="bg-slate-800 p-5 rounded-2xl border border-slate-700 space-y-3">
        <div class="flex justify-between items-start">
          <div>
            <h4 class="font-bold text-base text-white">${esc(c.name)}</h4>
            <p class="text-xs text-slate-400 mt-0.5">MC# ${esc(c.mc_number) || '—'}</p>
          </div>
          <span class="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs px-2.5 py-1 rounded-full font-medium">${esc(c.status || 'Approved')}</span>
        </div>
        <div class="text-xs text-slate-300 space-y-1 pt-2 border-t border-slate-700/60">
          <p><i class="fa-solid fa-phone w-4 text-slate-500"></i> ${esc(c.phone) || '—'}</p>
          <p><i class="fa-solid fa-envelope w-4 text-slate-500"></i> ${esc(c.email) || '—'}</p>
          <p><i class="fa-solid fa-location-dot w-4 text-slate-500"></i> ${esc(c.address) || '—'}</p>
        </div>
        <div class="flex gap-2 pt-2">
          <button data-edit-carrier="${c.id}" class="flex-1 bg-slate-700 hover:bg-slate-600 text-xs py-1.5 rounded-lg"><i class="fa-solid fa-pen mr-1"></i> Edit</button>
          <button data-delete-carrier="${c.id}" data-carrier-label="carrier ${esc(c.name)}" class="flex-1 bg-slate-700 hover:bg-red-600 text-xs py-1.5 rounded-lg"><i class="fa-solid fa-trash mr-1"></i> Delete</button>
        </div>
      </div>`).join('');
  }
  return { render };
})();
