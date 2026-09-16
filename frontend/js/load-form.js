const LoadForm = (() => {
  const CONTAINER_TYPES = [
    '20 Standard (20ST)', '40 Standard (40ST)', '40 High Cube (40HC)', '45 High Cube (45HC)',
    '20 Reefer (20RF)', '40 Reefer (40RF)', 'Open Top (OT)', 'Flat Rack (FR)'
  ];
  const LOAD_TYPES = ['Import', 'Export', 'Import / Rail', 'Export / Rail'];
  const STATUSES = [
    'New Load', 'Available for Pickup', 'Pickup Scheduled', 'At Port', 'Gate Out', 'Picked Up', 'In Transit',
    'Delivery Scheduled', 'At Delivery', 'Delivered', 'POD Pending', 'Empty Pending', 'Empty / POD Pending',
    'Empty Return Scheduled', 'Empty Returned', 'Completed', 'Find Carrier', 'Carrier Assigned', 'Customs Hold',
    'Freight Hold', 'Exam Site', 'Driver Delayed', 'Port Congestion', 'Cancelled'
  ];

  function opt(list, selected, placeholder) {
    return (placeholder ? `<option value="">${placeholder}</option>` : '') +
      list.map((v) => `<option value="${esc(v)}" ${v === selected ? 'selected' : ''}>${esc(v)}</option>`).join('');
  }
  function optFromRecords(list, selectedId, placeholder = '— Select —') {
    return `<option value="">${placeholder}</option>` +
      list.map((x) => `<option value="${x.id}" ${x.id === selectedId ? 'selected' : ''}>${esc(x.name)}</option>`).join('');
  }

  function field(id, label, inputHtml) {
    return `<div class="form-group"><label>${esc(label)}</label>${inputHtml}</div>`;
  }

  /** Renders the full form-grid. idPrefix keeps IDs unique between the Add Load page and the Edit modal.
   *  Pass { hideActualDates: true } on the creation page — those 3 fields only make sense once a load
   *  is already underway, so they're edit-only. */
  function renderFields(l = {}, idPrefix, options = {}) {
    const id = (name) => `${idPrefix}_${name}`;
    const actualDatesSection = options.hideActualDates ? '' : `
      ${field(id('pickupDate'), 'Actual Pickup Date', `<input type="date" id="${id('pickupDate')}" value="${esc((l.pickup_date || '').slice(0, 10))}">`)}
      ${field(id('deliveryDate'), 'Actual Delivery Date', `<input type="date" id="${id('deliveryDate')}" value="${esc((l.delivery_date || '').slice(0, 10))}">`)}
      ${field(id('emptyReturnDate'), 'Actual Empty Return Date', `<input type="date" id="${id('emptyReturnDate')}" value="${esc((l.empty_return_date || '').slice(0, 10))}">`)}
    `;
    return `
      ${field(id('dispatcherUserId'), 'Assigned User', `<select id="${id('dispatcherUserId')}">${optFromRecords(State.users, l.dispatcher_user_id, '— Unassigned —')}</select>`)}
      ${field(id('entityId'), 'Company Entity', `<select id="${id('entityId')}">${State.entities.map((e) => `<option value="${e.id}" ${e.id === l.entity_id ? 'selected' : ''}>${esc(e.name)}</option>`).join('')}</select>`)}
      ${field(id('loadType'), 'Shipment Type', `<select id="${id('loadType')}">${opt(LOAD_TYPES, l.load_type)}</select>`)}

      ${field(id('customerId'), 'Customer', `<select id="${id('customerId')}">${optFromRecords(State.customers, l.customer_id)}</select>`)}
      ${field(id('consigneeId'), 'Consignee', `<select id="${id('consigneeId')}">${optFromRecords(State.consignees, l.consignee_id)}</select>`)}
      ${field(id('containerNumber'), 'Container Number', `<input type="text" id="${id('containerNumber')}" placeholder="e.g., MSKU1234567" value="${esc(l.container_number || '')}">`)}

      ${field(id('containerType'), 'Container Type', `<select id="${id('containerType')}">${opt(CONTAINER_TYPES, l.container_type, '— Select —')}</select>`)}
      ${field(id('bolNumber'), 'Master Bill of Lading (MBL)', `<input type="text" id="${id('bolNumber')}" placeholder="MBL Number" value="${esc(l.bol_number || '')}">`)}
      ${field(id('origin'), 'Pickup Location', `<input type="text" id="${id('origin')}" placeholder="Port / Terminal Address" value="${esc(l.origin || '')}">`)}

      ${field(id('deliverToAddress'), 'Delivery Location', `<input type="text" id="${id('deliverToAddress')}" placeholder="Consignee Address" value="${esc(l.deliver_to_address || '')}">`)}
      ${field(id('emptyReturnLocation'), 'Empty Return Location', `<input type="text" id="${id('emptyReturnLocation')}" placeholder="Depot Address" value="${esc(l.empty_return_location || '')}">`)}
      ${field(id('etaDate'), 'Estimated Time of Arrival (ETA)', `<input type="date" id="${id('etaDate')}" value="${esc((l.eta_date || '').slice(0, 10))}">`)}

      ${field(id('lfdDate'), 'Last Free Date (LFD)', `<input type="date" id="${id('lfdDate')}" value="${esc((l.lfd_date || '').slice(0, 10))}">`)}
      ${field(id('carrierRate'), 'Carrier Rate ($)', `<input type="number" step="0.01" min="0" id="${id('carrierRate')}" placeholder="0.00" value="${l.carrier_rate ?? ''}" oninput="LoadForm.calcProfit('${idPrefix}')">`)}
      ${field(id('customerCharge'), 'Customer Charges ($)', `<input type="number" step="0.01" min="0" id="${id('customerCharge')}" placeholder="0.00" value="${l.customer_charge ?? ''}" oninput="LoadForm.calcProfit('${idPrefix}')">`)}

      ${field(id('grossProfit'), 'Gross Profit ($)', `<input type="text" id="${id('grossProfit')}" readonly style="background:#f1f5f9;font-weight:bold;" value="${grossProfitText(l)}">`)}
      ${field(id('status'), 'Status', `<select id="${id('status')}" onchange="LoadForm.toggleCompletedDate('${idPrefix}')">${opt(STATUSES, l.status || 'Available for Pickup')}</select>`)}
      ${field(id('completedDate'), 'Completed Date', `<input type="date" id="${id('completedDate')}" value="${esc((l.completed_date || '').slice(0, 10))}" ${l.status === 'Completed' ? '' : 'disabled'}>`)}
      ${field(id('weight'), 'Weight', `<input type="text" id="${id('weight')}" placeholder="e.g. 12956.000 KG" value="${esc(l.weight || '')}">`)}

      ${field(id('sealNumber'), 'Seal #', `<input type="text" id="${id('sealNumber')}" value="${esc(l.seal_number || '')}">`)}
      ${field(id('referenceNumber'), 'Reference # (comma-separated)', `<input type="text" id="${id('referenceNumber')}" value="${esc(l.reference_number || '')}">`)}
      ${field(id('pickupNumber'), 'Pickup #', `<input type="text" id="${id('pickupNumber')}" value="${esc(l.pickup_number || '')}">`)}

      ${field(id('packagesQty'), 'Packages Qty', `<input type="text" id="${id('packagesQty')}" placeholder="e.g. 23" value="${esc(l.packages_qty || '')}">`)}
      ${field(id('packagesDesc'), 'Packages Description', `<input type="text" id="${id('packagesDesc')}" placeholder="e.g. General Cargo" value="${esc(l.packages_desc || '')}">`)}
      <div></div>

      ${actualDatesSection}

      <div class="form-group" style="grid-column: 1 / -1;"><label>Notes</label><textarea id="${id('notes')}" rows="2">${esc(l.notes || '')}</textarea></div>
    `;
  }

  function grossProfitText(l) {
    const cr = parseFloat(l.carrier_rate) || 0;
    const cc = parseFloat(l.customer_charge) || 0;
    if (l.carrier_rate == null && l.customer_charge == null) return '';
    return '$' + (cc - cr).toFixed(2);
  }

  function calcProfit(idPrefix) {
    const cr = parseFloat(document.getElementById(`${idPrefix}_carrierRate`).value) || 0;
    const cc = parseFloat(document.getElementById(`${idPrefix}_customerCharge`).value) || 0;
    document.getElementById(`${idPrefix}_grossProfit`).value = '$' + (cc - cr).toFixed(2);
  }

  function toggleCompletedDate(idPrefix) {
    const status = document.getElementById(`${idPrefix}_status`).value;
    const dateInput = document.getElementById(`${idPrefix}_completedDate`);
    dateInput.disabled = status !== 'Completed';
    if (status !== 'Completed') dateInput.value = '';
  }

  function val(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  function collectValues(idPrefix) {
    const id = (name) => `${idPrefix}_${name}`;
    return {
      entity_id: val(id('entityId')),
      dispatcher_user_id: val(id('dispatcherUserId')) || null,
      customer_id: val(id('customerId')) || null,
      consignee_id: val(id('consigneeId')) || null,
      load_type: val(id('loadType')) || null,
      container_number: val(id('containerNumber')),
      container_type: val(id('containerType')) || null,
      bol_number: val(id('bolNumber')),
      origin: val(id('origin')),
      deliver_to_address: val(id('deliverToAddress')),
      empty_return_location: val(id('emptyReturnLocation')),
      eta_date: val(id('etaDate')) || null,
      lfd_date: val(id('lfdDate')) || null,
      carrier_rate: val(id('carrierRate')) || '',
      customer_charge: val(id('customerCharge')) || '',
      status: val(id('status')),
      completed_date: val(id('completedDate')) || null,
      weight: val(id('weight')),
      seal_number: val(id('sealNumber')),
      reference_number: val(id('referenceNumber')),
      pickup_number: val(id('pickupNumber')),
      packages_qty: val(id('packagesQty')),
      packages_desc: val(id('packagesDesc')),
      pickup_date: val(id('pickupDate')) || null,
      delivery_date: val(id('deliveryDate')) || null,
      empty_return_date: val(id('emptyReturnDate')) || null,
      notes: val(id('notes'))
    };
  }

  return { renderFields, collectValues, calcProfit, toggleCompletedDate, LOAD_TYPES, CONTAINER_TYPES, STATUSES };
})();
