const RenderUsers = (() => {
  let users = [];

  async function refresh() {
    if (State.currentUser?.role !== 'Administrator') return;
    users = (await Api.Users.list()).users;
    State.users = users;
    render();
  }

  function render() {
    const tbody = document.getElementById('users-table');
    if (!users.length) {
      tbody.innerHTML = emptyRow(4, 'No users yet.');
      return;
    }
    tbody.innerHTML = users.map((u) => `
      <tr>
        <td>${esc(u.username)}</td>
        <td>${esc(u.name)}</td>
        <td>${esc(u.role)}</td>
        <td>
          <button class="btn-primary btn-sm" data-edit-user="${u.id}">Edit</button>
          ${u.id !== State.currentUser.id ? `<button class="btn-danger btn-sm" data-delete-user="${u.id}" data-user-label="user ${esc(u.username)}">Delete</button>` : ''}
        </td>
      </tr>`).join('');
  }

  function getById(id) { return users.find((u) => u.id === id); }

  return { refresh, render, getById };
})();
