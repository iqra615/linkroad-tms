const RenderUsers = (() => {
  async function refresh() {
    if (State.currentUser?.role !== 'Administrator') return;
    await State.refreshUsersIfAdmin();
    render();
  }

  function render() {
    const tbody = document.getElementById('users-table');
    const users = State.users;
    if (!users.length) {
      tbody.innerHTML = emptyRow(4, 'No users yet.');
      return;
    }
    tbody.innerHTML = users.map((u) => `
      <tr>
        <td>${esc(u.username)}</td>
        <td>${esc(u.name)}</td>
        <td>${esc(u.role)}</td>
        <td class="actions-cell"><div class="btn-row">
          <button class="btn-primary btn-sm" data-edit-user="${u.id}">Edit</button>
          ${u.id !== State.currentUser.id ? `<button class="btn-danger btn-sm" data-delete-user="${u.id}" data-user-label="user ${esc(u.username)}">Delete</button>` : ''}
        </div></td>
      </tr>`).join('');
  }

  function getById(id) { return State.users.find((u) => u.id === id); }

  return { refresh, render, getById };
})();
