const Modals = (() => {
  let saveHandler = null;
  let pendingEditId = null; // set by openDetail(); submit() checks this before doing a normal save

  function val(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  function optionsFor(list, selectedId, placeholder = '— None —') {
    return `<option value="">${placeholder}</option>` + list.map((x) => `<option value="${x.id}" ${x.id === selectedId ? 'selected' : ''}>${esc(x.name)}</option>`).join('');
  }

  function openDetail(id) {
    const l = State.loads.find((x) => x.id === id);
    if (!l) return toast('Load not found — try refreshing.', 'error');

    document.getElementById('entityModalTitle').innerText = `Load ${l.load_number}`;
    document.getElementById('entityModalBody').innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:0.9rem;">
        <div><strong>Company:</strong> ${entityBadge(l.entity_code)}</div>
        <div><strong>Status:</strong> ${esc(l.status)}</div>
        <div><strong>Assigned User:</strong> ${esc(l.dispatcher_user_name) || '—'}</div>
        <div><strong>Shipment Type:</strong> ${esc(l.load_type) || '—'}</div>
        <div><strong>Customer:</strong> ${esc(l.customer_name) || '—'}</div>
        <div><strong>Consignee:</strong> ${esc(l.consignee_name) || '—'}</div>
        <div><strong>Pickup Location:</strong> ${esc(l.origin) || '—'}</div>
        <div><strong>Deliver To:</strong> ${esc(l.deliver_to_address) || '—'}</div>
        <div><strong>Container #:</strong> ${esc(l.container_number) || '—'}</div>
        <div><strong>Container Type:</strong> ${esc(l.container_type) || '—'}</div>
        <div><strong>Master BOL:</strong> ${esc(l.bol_number) || '—'}</div>
        <div><strong>Weight:</strong> ${esc(l.weight) || '—'}</div>
        <div><strong>Pickup Date:</strong> ${dateOrDash(l.pickup_date)}</div>
        <div><strong>Delivery Date:</strong> ${dateOrDash(l.delivery_date)}</div>
        <div><strong>Empty Return:</strong> ${dateOrDash(l.empty_return_date)}</div>
        <div><strong>ETA / LFD:</strong> ${dateOrDash(l.eta_date)} / ${dateOrDash(l.lfd_date)}</div>
        <div><strong>Carrier:</strong> ${esc(l.carrier_name) || '—'}</div>
        <div><strong>Carrier Rate:</strong> ${l.carrier_rate != null ? money(l.carrier_rate) : '—'}</div>
        <div><strong>Customer Charge:</strong> ${l.customer_charge != null ? money(l.customer_charge) : '—'}</div>
        <div><strong>Gross Profit:</strong> ${l.carrier_rate != null && l.customer_charge != null ? money(Number(l.customer_charge) - Number(l.carrier_rate)) : '—'}</div>
      </div>
      ${l.notes ? `<div style="margin-top:14px;background:#f1f5f9;border-radius:6px;padding:10px;font-size:0.85rem;"><strong>Notes:</strong> ${esc(l.notes)}</div>` : ''}
    `;

    // Detail view has no "Save" action — repurpose the shared button as "Edit".
    // submit() (the single click handler wired in app.js) checks pendingEditId
    // and branches accordingly, so we never register a second click listener.
    document.getElementById('entitySaveBtn').innerText = 'Edit';
    saveHandler = null;
    pendingEditId = id;

    showModal('entityModal');
  }

  function open(type, id) {
    const title = document.getElementById('entityModalTitle');
    const body = document.getElementById('entityModalBody');
    const isEdit = !!id;

    // Reset the shared Save button's state every time a form modal opens — it's
    // one static element reused for every entity type and for the detail view's
    // repurposed "Edit" button, so without this reset it could stay stuck on a
    // stale label/state from whatever was open before.
    pendingEditId = null;
    const saveBtn = document.getElementById('entitySaveBtn');
    saveBtn.disabled = false;
    saveBtn.innerText = 'Save';

    if (type === 'load') {
      const l = isEdit ? State.loads.find((x) => x.id === id) : {};
      title.innerText = isEdit ? `Edit Load ${l.load_number}` : 'New Load';
      body.innerHTML = `<div class="form-grid" style="grid-template-columns:repeat(3,1fr);border:none;padding:0;">${LoadForm.renderFields(l, 'editmodal')}</div>`;
      saveHandler = async () => {
        const payload = LoadForm.collectValues('editmodal');
        if (!payload.entity_id) throw new Api.ApiClientError(400, 'Company Entity is required.');
        if (isEdit) await Api.Loads.update(id, { ...payload, load_number: l.load_number });
        else await Api.Loads.create(payload);
        await App.refreshLoadsDependentViews();
      };
    }

    else if (type === 'carrier') {
      const c = isEdit ? State.carriers.find((x) => x.id === id) : {};
      title.innerText = isEdit ? 'Edit Carrier' : 'New Carrier';
      body.innerHTML = `
        <div class="form-group"><label>Carrier Name</label><input type="text" id="f_name" value="${esc(c.name || '')}"></div>
        <div class="form-group"><label>MC Number</label><input type="text" id="f_mc" value="${esc(c.mc_number || '')}"></div>
        <div class="form-group"><label>DOT Number</label><input type="text" id="f_dot" value="${esc(c.dot_number || '')}"></div>
        <div class="form-group"><label>Phone</label><input type="text" id="f_phone" value="${esc(c.phone || '')}"></div>
        <div class="form-group"><label>Email</label><input type="email" id="f_email" value="${esc(c.email || '')}"></div>
        <div class="form-group"><label>City</label><input type="text" id="f_city" value="${esc(c.city || '')}"></div>
        <div class="form-group"><label>State</label><input type="text" id="f_state" placeholder="e.g. NJ" value="${esc(c.state || '')}"></div>
        <div class="form-group"><label>Carrier's Dispatcher Name</label><input type="text" id="f_dispatcherName" value="${esc(c.dispatcher_name || '')}"></div>
        <div class="form-group"><label>Status</label>
          <select id="f_status">${['Active', 'Pending', 'Suspended'].map((s) => `<option ${c.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
        </div>
      `;
      saveHandler = async () => {
        const payload = {
          name: val('f_name'), mc_number: val('f_mc'), dot_number: val('f_dot'), phone: val('f_phone'), email: val('f_email'),
          city: val('f_city'), state: val('f_state'), dispatcher_name: val('f_dispatcherName'), status: val('f_status')
        };
        if (isEdit) await Api.Carriers.update(id, payload);
        else await Api.Carriers.create(payload);
        await App.refreshCarriersDependentViews();
      };
    }

    else if (type === 'customer') {
      const c = isEdit ? State.customers.find((x) => x.id === id) : {};
      title.innerText = isEdit ? 'Edit Customer' : 'New Customer';
      body.innerHTML = `
        <div class="form-group"><label>Company Name</label><input type="text" id="f_name" value="${esc(c.name || '')}"></div>
        <div class="form-group"><label>Contact Person</label><input type="text" id="f_contactName" placeholder="e.g. John Smith" value="${esc(c.contact_name || '')}"></div>
        <div class="form-group"><label>Phone</label><input type="text" id="f_phone" value="${esc(c.phone || '')}"></div>
        <div class="form-group"><label>Billing Email</label><input type="email" id="f_email" value="${esc(c.email || '')}"></div>
        <div class="form-group"><label>Address</label><input type="text" id="f_address" value="${esc(c.address || '')}"></div>
        <div class="form-group"><label>Payment Terms</label>
          <select id="f_terms">${['Net 15', 'Net 30', 'Net 45', 'Due on Receipt'].map((s) => `<option ${c.terms === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
        </div>
      `;
      saveHandler = async () => {
        const payload = { name: val('f_name'), contact_name: val('f_contactName'), phone: val('f_phone'), email: val('f_email'), address: val('f_address'), terms: val('f_terms') };
        if (isEdit) await Api.Customers.update(id, payload);
        else await Api.Customers.create(payload);
        await App.refreshCustomersDependentViews();
      };
    }

    else if (type === 'consignee') {
      const c = isEdit ? State.consignees.find((x) => x.id === id) : {};
      title.innerText = isEdit ? 'Edit Consignee' : 'New Consignee';
      body.innerHTML = `
        <div class="form-group"><label>Name</label><input type="text" id="f_name" value="${esc(c.name || '')}"></div>
        <div class="form-group"><label>Email</label><input type="email" id="f_email" value="${esc(c.email || '')}"></div>
        <div class="form-group"><label>Contact Details</label><input type="text" id="f_contact" placeholder="Phone / Mobile #" value="${esc(c.contact || '')}"></div>
        <div class="form-group"><label>Address</label><textarea id="f_address" rows="2">${esc(c.address || '')}</textarea></div>
        <div class="form-group"><label>Important Emails</label><input type="text" id="f_importantEmails" placeholder="Comma separated" value="${esc(c.important_emails || '')}"></div>
      `;
      saveHandler = async () => {
        const payload = { name: val('f_name'), email: val('f_email'), contact: val('f_contact'), address: val('f_address'), important_emails: val('f_importantEmails') };
        if (isEdit) await Api.Consignees.update(id, payload);
        else await Api.Consignees.create(payload);
        await App.refreshConsigneesDependentViews();
      };
    }

    else if (type === 'user') {
      const u = isEdit ? RenderUsers.getById(id) : {};
      title.innerText = isEdit ? 'Edit User' : 'New User';
      body.innerHTML = `
        <div class="form-group"><label>Username</label><input type="text" id="f_username" ${isEdit ? 'disabled' : ''} value="${esc(u.username || '')}"></div>
        <div class="form-group"><label>Full Name</label><input type="text" id="f_name" value="${esc(u.name || '')}"></div>
        <div class="form-group"><label>Password ${isEdit ? '(leave blank to keep current)' : '(min 8 characters)'}</label><input type="text" id="f_password"></div>
        <div class="form-group"><label>Role</label>
          <select id="f_role">${['Administrator', 'Dispatcher', 'Accounting'].map((s) => `<option ${u.role === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
        </div>
      `;
      saveHandler = async () => {
        if (isEdit) {
          const payload = { name: val('f_name'), role: val('f_role') };
          const pw = val('f_password');
          if (pw) payload.password = pw;
          await Api.Users.update(id, payload);
        } else {
          await Api.Users.create({ username: val('f_username'), name: val('f_name'), role: val('f_role'), password: val('f_password') });
        }
        await RenderUsers.refresh();
        RenderReports.populateUserSelect();
      };
    }

    else if (type === 'invoice') {
      const billable = State.loads.filter((l) => l.customer_id && l.customer_charge != null);
      title.innerText = 'New Invoice';
      body.innerHTML = `
        <div class="form-group"><label>Load</label>
          <select id="f_loadId">
            <option value="">— Select a load with a customer charge —</option>
            ${billable.map((l) => `<option value="${l.id}">${esc(l.load_number)} — ${esc(l.customer_name)} (${money(l.customer_charge)})</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Amount override (optional)</label><input type="number" step="0.01" min="0" id="f_amount"></div>
        <div class="form-group"><label>Due Date (optional)</label><input type="date" id="f_dueDate"></div>
      `;
      saveHandler = async () => {
        const loadId = val('f_loadId');
        if (!loadId) throw new Api.ApiClientError(400, 'Select a load first.');
        const payload = { load_id: loadId };
        const amount = val('f_amount');
        if (amount) payload.amount = amount;
        const dueDate = val('f_dueDate');
        if (dueDate) payload.due_date = dueDate;
        await Api.Invoices.create(payload);
        await App.refreshInvoicesDependentViews();
      };
    }

    showModal('entityModal');
  }

  function close() {
    hideModal('entityModal');
    saveHandler = null;
    pendingEditId = null;
  }

  async function submit() {
    if (pendingEditId) {
      const id = pendingEditId;
      pendingEditId = null;
      return open('load', id);
    }

    const btn = document.getElementById('entitySaveBtn');
    const originalText = btn.innerText;
    btn.disabled = true;
    btn.innerText = 'Saving…';

    try {
      if (saveHandler) await saveHandler();
      close();
      toast('Saved.', 'success');
    } catch (err) {
      toast(describeApiError(err), 'error');
    } finally {
      btn.disabled = false;
      btn.innerText = originalText;
    }
  }

  return { open, openDetail, close, submit };
})();
