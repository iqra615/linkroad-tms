const RenderUsers = (() => {
  let users = [];

  async function refresh() {
    if (State.currentUser?.role !== 'Administrator') return;
    users = (await Api.Users.list()).users;
    render();
  }

  function render() {
    const tbody = document.getElementById('users-table');
    tbody.innerHTML = users.map((u) => `
      <tr class="hover:bg-slate-800/60">
        <td class="px-5 py-3 font-semibold text-white">${esc(u.username)}</td>
        <td class="px-5 py-3">${esc(u.name)}</td>
        <td class="px-5 py-3">${esc(u.role)}</td>
        <td class="px-5 py-3 text-right">
          <button data-edit-user="${u.id}" class="bg-slate-700 hover:bg-slate-600 text-white w-8 h-8 rounded-lg text-xs mr-1"><i class="fa-solid fa-pen"></i></button>
          ${u.id !== State.currentUser.id ? `<button data-delete-user="${u.id}" data-user-label="user ${esc(u.username)}" class="bg-slate-700 hover:bg-red-600 text-white w-8 h-8 rounded-lg text-xs"><i class="fa-solid fa-trash"></i></button>` : ''}
        </td>
      </tr>`).join('');
  }

  function getById(id) { return users.find((u) => u.id === id); }

  return { refresh, render, getById };
})();
