const RenderConsignees = (() => {
  function render() {
    const tbody = document.getElementById('consignees-table');
    if (!State.consignees.length) {
      tbody.innerHTML = emptyRow(6, 'No consignees yet — add delivery locations you ship to.');
      return;
    }
    tbody.innerHTML = State.consignees.map((c) => `
      <tr>
        <td>${esc(c.name)}</td>
        <td>${esc(c.email) || '—'}</td>
        <td>${esc(c.contact) || '—'}</td>
        <td>${esc(c.address) || '—'}</td>
        <td>${esc(c.important_emails) || '—'}</td>
        <td>
          <button class="btn-primary btn-sm" data-edit-consignee="${c.id}">Edit</button>
          <button class="btn-danger btn-sm" data-delete-consignee="${c.id}" data-consignee-label="consignee ${esc(c.name)}">Delete</button>
        </td>
      </tr>`).join('');
  }
  return { render };
})();
