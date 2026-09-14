const Modals = (() => {
  let saveHandler = null;

  function val(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  function optionsFor(list, selectedId, placeholder = '— None —') {
    return `<option value="">${placeholder}</option>` + list.map((x) => `<option value="${x.id}" ${x.id === selectedId ? 'selected' : ''}>${esc(x.name)}</option>`).join('');
  }

  function modalActions(saveLabel = 'Save') {
    return `<div class="pt-4 border-t border-slate-700 flex justify-end gap-3">
      <button type="button" data-close-entity-modal class="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 font-medium">Cancel</button>
      <button type="button" id="entitySaveBtn" data-submit-entity class="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium flex items-center gap-2"><i class="fa-solid fa-check"></i> ${saveLabel}</button>
    </div>`;
  }

  function open(type, id) {
    const title = document.getElementById('entityModalTitle');
    const body = document.getElementById('entityModalBody');
    const isEdit = !!id;

    if (type === 'load') {
      const l = isEdit ? State.loads.find((x) => x.id === id) : {};
      title.innerText = isEdit ? `Edit Load ${l.load_number}` : 'New Load';
      body.innerHTML = `
        <div class="grid grid-cols-2 gap-3">
          <div><label class="block text-slate-300 mb-1">Load # <span class="text-slate-500 font-normal">(leave blank to auto-assign)</span></label><input id="f_loadNumber" value="${esc(l.load_number || '')}" placeholder="Auto" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"></div>
          <div><label class="block text-slate-300 mb-1">Status</label>
            <select id="f_status" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white">
              ${['Dispatched', 'In Transit', 'At Delivery', 'Delivered', 'On Hold', 'Cancelled'].map((s) => `<option ${l.status === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="block text-slate-300 mb-1">Customer (bill-to)</label><select id="f_customerId" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white">${optionsFor(State.customers, l.customer_id)}</select></div>
          <div><label class="block text-slate-300 mb-1">Carrier</label><select id="f_carrierId" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white">${optionsFor(State.carriers, l.carrier_id)}</select></div>
        </div>
        <div><label class="block text-slate-300 mb-1">Origin / Pickup address</label><input id="f_origin" value="${esc(l.origin || '')}" placeholder="e.g. Maher Terminal, Port Elizabeth, NJ" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"></div>
        <div><label class="block text-slate-300 mb-1">Consignee / Delivery location</label><select id="f_consigneeId" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white">${optionsFor(State.consignees, l.consignee_id)}</select></div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="block text-slate-300 mb-1">Container #</label><input id="f_containerNumber" value="${esc(l.container_number || '')}" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"></div>
          <div><label class="block text-slate-300 mb-1">BOL #</label><input id="f_bolNumber" value="${esc(l.bol_number || '')}" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"></div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="block text-slate-300 mb-1">Weight</label><input id="f_weight" value="${esc(l.weight || '')}" placeholder="e.g. 12956.000 KG" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"></div>
          <div><label class="block text-slate-300 mb-1">Equipment Type</label><input id="f_equipmentType" value="${esc(l.equipment_type || '')}" placeholder="e.g. 40HC" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"></div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="block text-slate-300 mb-1">Carrier Rate (USD)</label><input id="f_carrierRate" type="number" step="0.01" min="0" value="${l.carrier_rate ?? ''}" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"></div>
          <div><label class="block text-slate-300 mb-1">Customer Rate (USD)</label><input id="f_customerRate" type="number" step="0.01" min="0" value="${l.customer_rate ?? ''}" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"></div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="block text-slate-300 mb-1">Pickup Date</label><input id="f_pickupDate" type="date" value="${esc(l.pickup_date ? l.pickup_date.slice(0, 10) : '')}" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"></div>
          <div><label class="block text-slate-300 mb-1">Delivery Date</label><input id="f_deliveryDate" type="date" value="${esc(l.delivery_date ? l.delivery_date.slice(0, 10) : '')}" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"></div>
        </div>
        <div><label class="block text-slate-300 mb-1">Notes / Commodity</label><textarea id="f_notes" rows="2" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white">${esc(l.notes || '')}</textarea></div>
        ${modalActions()}
      `;
      saveHandler = async () => {
        const payload = {
          load_number: val('f_loadNumber') || undefined,
          status: val('f_status'),
          customer_id: val('f_customerId') || null,
          carrier_id: val('f_carrierId') || null,
          consignee_id: val('f_consigneeId') || null,
          origin: val('f_origin'),
          container_number: val('f_containerNumber'),
          bol_number: val('f_bolNumber'),
          weight: val('f_weight'),
          equipment_type: val('f_equipmentType'),
          carrier_rate: val('f_carrierRate') || '',
          customer_rate: val('f_customerRate') || '',
          pickup_date: val('f_pickupDate') || null,
          delivery_date: val('f_deliveryDate') || null,
          notes: val('f_notes')
        };
        if (isEdit) await Api.Loads.update(id, payload);
        else await Api.Loads.create(payload);
        await App.refreshLoadsDependentViews();
      };
    }

    else if (type === 'carrier') {
      const c = isEdit ? State.carriers.find((x) => x.id === id) : {};
      title.innerText = isEdit ? 'Edit Carrier' : 'New Carrier';
      body.innerHTML = `
        <div><label class="block text-slate-300 mb-1">Carrier Name</label><input id="f_name" value="${esc(c.name || '')}" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"></div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="block text-slate-300 mb-1">MC Number</label><input id="f_mc" value="${esc(c.mc_number || '')}" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"></div>
          <div><label class="block text-slate-300 mb-1">Phone</label><input id="f_phone" value="${esc(c.phone || '')}" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"></div>
        </div>
        <div><label class="block text-slate-300 mb-1">Email</label><input id="f_email" value="${esc(c.email || '')}" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"></div>
        <div><label class="block text-slate-300 mb-1">Address</label><input id="f_address" value="${esc(c.address || '')}" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"></div>
        <div><label class="block text-slate-300 mb-1">Status</label>
          <select id="f_status" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white">
            ${['Approved', 'Pending', 'Suspended'].map((s) => `<option ${c.status === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
        ${modalActions()}
      `;
      saveHandler = async () => {
        const payload = { name: val('f_name'), mc_number: val('f_mc'), phone: val('f_phone'), email: val('f_email'), address: val('f_address'), status: val('f_status') };
        if (isEdit) await Api.Carriers.update(id, payload);
        else await Api.Carriers.create(payload);
        await App.refreshCarriersDependentViews();
      };
    }

    else if (type === 'customer') {
      const c = isEdit ? State.customers.find((x) => x.id === id) : {};
      title.innerText = isEdit ? 'Edit Customer' : 'New Customer';
      body.innerHTML = `
        <div><label class="block text-slate-300 mb-1">Customer Name</label><input id="f_name" value="${esc(c.name || '')}" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"></div>
        <div><label class="block text-slate-300 mb-1">Billing Email</label><input id="f_email" value="${esc(c.email || '')}" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"></div>
        <div><label class="block text-slate-300 mb-1">Address</label><input id="f_address" value="${esc(c.address || '')}" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"></div>
        <div><label class="block text-slate-300 mb-1">Payment Terms</label>
          <select id="f_terms" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white">
            ${['Net 15', 'Net 30', 'Net 45', 'Due on Receipt'].map((s) => `<option ${c.terms === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
        ${modalActions()}
      `;
      saveHandler = async () => {
        const payload = { name: val('f_name'), email: val('f_email'), address: val('f_address'), terms: val('f_terms') };
        if (isEdit) await Api.Customers.update(id, payload);
        else await Api.Customers.create(payload);
        await App.refreshCustomersDependentViews();
      };
    }

    else if (type === 'consignee') {
      const c = isEdit ? State.consignees.find((x) => x.id === id) : {};
      title.innerText = isEdit ? 'Edit Consignee' : 'New Consignee';
      body.innerHTML = `
        <div><label class="block text-slate-300 mb-1">Consignee Name</label><input id="f_name" value="${esc(c.name || '')}" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"></div>
        <div><label class="block text-slate-300 mb-1">Delivery Address</label><input id="f_address" value="${esc(c.address || '')}" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"></div>
        <div><label class="block text-slate-300 mb-1">Receiving Contact</label><input id="f_contact" value="${esc(c.contact || '')}" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"></div>
        ${modalActions()}
      `;
      saveHandler = async () => {
        const payload = { name: val('f_name'), address: val('f_address'), contact: val('f_contact') };
        if (isEdit) await Api.Consignees.update(id, payload);
        else await Api.Consignees.create(payload);
        await App.refreshConsigneesDependentViews();
      };
    }

    else if (type === 'user') {
      const u = isEdit ? RenderUsers.getById(id) : {};
      title.innerText = isEdit ? 'Edit User' : 'New User';
      body.innerHTML = `
        <div><label class="block text-slate-300 mb-1">Username</label><input id="f_username" ${isEdit ? 'disabled' : ''} value="${esc(u.username || '')}" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white disabled:opacity-60"></div>
        <div><label class="block text-slate-300 mb-1">Full Name</label><input id="f_name" value="${esc(u.name || '')}" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"></div>
        <div><label class="block text-slate-300 mb-1">Password ${isEdit ? '(leave blank to keep current)' : '(min 8 characters)'}</label><input id="f_password" type="text" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"></div>
        <div><label class="block text-slate-300 mb-1">Role</label>
          <select id="f_role" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white">
            ${['Administrator', 'Dispatcher', 'Accounting'].map((s) => `<option ${u.role === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
        ${modalActions()}
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
      };
    }

    else if (type === 'invoice') {
      const billable = State.loads.filter((l) => l.customer_id && l.customer_rate != null);
      title.innerText = 'New Invoice';
      body.innerHTML = `
        <div><label class="block text-slate-300 mb-1">Load</label>
          <select id="f_loadId" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white">
            <option value="">— Select a load with a customer rate —</option>
            ${billable.map((l) => `<option value="${l.id}">${esc(l.load_number)} — ${esc(l.customer_name)} (${money(l.customer_rate)})</option>`).join('')}
          </select>
        </div>
        <div><label class="block text-slate-300 mb-1">Amount override <span class="text-slate-500 font-normal">(optional — defaults to the load's customer rate)</span></label><input id="f_amount" type="number" step="0.01" min="0" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"></div>
        <div><label class="block text-slate-300 mb-1">Due Date <span class="text-slate-500 font-normal">(optional)</span></label><input id="f_dueDate" type="date" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"></div>
        ${modalActions('Create Invoice')}
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
  }

  async function submit() {
    const btn = document.getElementById('entitySaveBtn');
    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Saving…';

    try {
      if (saveHandler) await saveHandler();
      close();
      toast('Saved.', 'success');
    } catch (err) {
      toast(describeApiError(err), 'error');
      btn.disabled = false;
      btn.innerHTML = originalHtml;
    }
  }

  return { open, close, submit };
})();
