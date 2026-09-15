const Documents = (() => {
  let currentType = null;
  let currentLoad = null;
  let currentInvoice = null;

  const S = {
    box: 'background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;',
    label: 'font-weight:700;color:#0f172a;text-transform:uppercase;font-size:10px;margin-bottom:4px;',
    row: 'display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid #e2e8f0;padding-bottom:14px;margin-bottom:14px;',
    grid2: 'display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;',
    grid3: 'display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:14px;',
    table: 'width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:14px;',
    th: 'background:#f1f5f9;text-align:left;padding:8px 10px;font-weight:700;color:#1e293b;',
    td: 'padding:8px 10px;border-top:1px solid #e2e8f0;'
  };

  function entityFor(load) {
    return State.findEntityByCode(load.entity_code) || {};
  }

  function openForLoad(type, loadId) {
    currentType = type;
    currentLoad = State.loads.find((l) => l.id === loadId);
    currentInvoice = null;
    if (!currentLoad) return toast('Load not found — try refreshing.', 'error');
    render();
    showModal('docModal');
  }

  function openForInvoice(invoiceId) {
    currentType = 'invoice';
    currentInvoice = State.invoices.find((i) => i.id === invoiceId);
    currentLoad = null;
    if (!currentInvoice) return toast('Invoice not found — try refreshing.', 'error');
    render();
    showModal('docModal');
  }

  function close() { hideModal('docModal'); }

  function brandHeader(entity) {
    const logoImg = entity.logo_data_uri ? `<img src="${entity.logo_data_uri}" style="height:48px;margin-bottom:4px;" alt="${esc(entity.name)}">` : '';
    return `<div>
      ${logoImg}
      <div style="font-size:1.1rem;font-weight:900;color:#1e3a8a;text-transform:uppercase;">${esc(entity.name) || 'Company'}</div>
      <div style="color:#64748b;">${esc(entity.address) || ''}</div>
      <div style="color:#64748b;">${esc(entity.email) || ''} ${entity.phone ? ' · ' + esc(entity.phone) : ''}</div>
    </div>`;
  }

  function render() {
    const titleEl = document.getElementById('docModalTitle');
    const body = document.getElementById('docBody');

    if (currentType === 'rc') {
      const l = currentLoad;
      const entity = entityFor(l);
      titleEl.innerText = 'Rate Confirmation';
      body.innerHTML = `
        <div style="${S.row}">
          ${brandHeader(entity)}
          <div style="text-align:right;">
            <div style="font-weight:700;color:#0f172a;">RATE CONFIRMATION</div>
            <div style="color:#64748b;">Load # ${esc(l.load_number)}</div>
            <div class="badge" style="background:#d1fae5;color:#065f46;margin-top:4px;">${esc(l.status).toUpperCase()}</div>
          </div>
        </div>
        <div style="${S.grid2}">
          <div style="${S.box}"><div style="${S.label}">Carrier</div>
            <div style="font-weight:700;">${esc(l.carrier_name) || 'Not assigned'}</div>
            <div style="color:#64748b;">MC# ${esc(l.carrier_mc) || '—'} ${l.carrier_dot ? '· DOT# ' + esc(l.carrier_dot) : ''}</div>
            <div style="color:#64748b;">${esc(l.carrier_phone) || ''} ${l.carrier_email ? '· ' + esc(l.carrier_email) : ''}</div>
          </div>
          <div style="${S.box}"><div style="${S.label}">Bill-To Customer</div>
            <div style="font-weight:700;">${esc(l.customer_name) || 'Not assigned'}</div>
          </div>
        </div>
        <table style="${S.table}">
          <thead><tr><th style="${S.th}">Stop</th><th style="${S.th}">Location</th></tr></thead>
          <tbody>
            <tr><td style="${S.td};font-weight:700;color:#1d4ed8;">1. PICKUP</td><td style="${S.td}">${esc(l.origin) || '—'}</td></tr>
            <tr><td style="${S.td};font-weight:700;color:#047857;">2. CONSIGNEE</td><td style="${S.td}">${esc(l.consignee_name) || ''}${l.consignee_address ? ' — ' + esc(l.consignee_address) : ''}</td></tr>
          </tbody>
        </table>
        <div style="${S.grid3}">
          <div style="${S.box}"><div style="${S.label}">Container #</div>${esc(l.container_number) || '—'}</div>
          <div style="${S.box}"><div style="${S.label}">BOL #</div>${esc(l.bol_number) || '—'}</div>
          <div style="${S.box}"><div style="${S.label}">Weight / Type</div>${esc(l.weight) || '—'} ${esc(l.container_type) || ''}</div>
        </div>
        <div style="${S.box};display:flex;justify-content:space-between;align-items:center;">
          <div style="font-weight:700;">Total Carrier Rate</div>
          <div style="font-size:1.4rem;font-weight:900;color:#1e3a8a;">${l.carrier_rate != null ? money(l.carrier_rate) + ' USD' : 'TBD'}</div>
        </div>
        ${l.notes ? `<div style="margin-top:12px;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:10px;color:#78350f;font-size:11px;"><strong>Notes:</strong> ${esc(l.notes)}</div>` : ''}
        <div style="margin-top:14px;border-top:1px solid #e2e8f0;padding-top:10px;color:#94a3b8;font-size:10px;">Carrier Signature: _______________________ &nbsp; Date: ___________</div>
      `;
    }

    else if (currentType === 'pod') {
      const l = currentLoad;
      const entity = entityFor(l);
      titleEl.innerText = 'Proof of Delivery';
      body.innerHTML = `
        <div style="${S.row}">
          ${brandHeader(entity)}
          <div style="text-align:right;">
            <div style="font-weight:700;color:#0f172a;">PROOF OF DELIVERY</div>
            <div style="color:#64748b;">Load # ${esc(l.load_number)}</div>
            <div style="color:#64748b;">Date: ${l.completed_date ? esc(l.completed_date.slice(0, 10)) : '___________'}</div>
          </div>
        </div>
        <div style="${S.grid2}">
          <div style="${S.box}"><div style="${S.label}">Pickup Address</div>${esc(l.origin) || '—'}</div>
          <div style="${S.box}"><div style="${S.label}">Delivery Address</div>
            <div style="font-weight:700;">${esc(l.consignee_name) || '—'}</div>
            <div style="color:#64748b;">${esc(l.consignee_address) || esc(l.deliver_to_address) || ''}</div>
          </div>
        </div>
        <div style="${S.grid3}">
          <div style="${S.box}"><div style="${S.label}">Container #</div>${esc(l.container_number) || '—'}</div>
          <div style="${S.box}"><div style="${S.label}">BOL #</div>${esc(l.bol_number) || '—'}</div>
          <div style="${S.box}"><div style="${S.label}">Weight</div>${esc(l.weight) || '—'}</div>
          <div style="${S.box}"><div style="${S.label}">Seal #</div>${esc(l.seal_number) || '—'}</div>
          <div style="${S.box}"><div style="${S.label}">Reference #</div>${esc(l.reference_number) || '—'}</div>
          <div style="${S.box}"><div style="${S.label}">Pickup #</div>${esc(l.pickup_number) || '—'}</div>
        </div>
        <table style="${S.table}">
          <thead><tr><th style="${S.th}">Qty</th><th style="${S.th}">Description</th><th style="${S.th}">Type</th></tr></thead>
          <tbody><tr><td style="${S.td}">${esc(l.packages_qty) || '1'}</td><td style="${S.td}">${esc(l.packages_desc) || esc(l.notes) || '—'}</td><td style="${S.td}">${esc(l.container_type) || '—'}</td></tr></tbody>
        </table>
        <div style="border-top:1px solid #e2e8f0;padding-top:12px;font-size:11px;color:#475569;">
          <p style="font-weight:700;color:#0f172a;margin-bottom:8px;">RECEIVED IN GOOD ORDER AND CONDITION</p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <div>Name: _______________________</div><div>Signature: _______________________</div>
            <div>Truck #: _______________________</div><div>Date: _______________________</div>
          </div>
        </div>
      `;
    }

    else if (currentType === 'invoice') {
      const inv = currentInvoice;
      const load = State.loads.find((l) => l.id === inv.load_id);
      const entity = load ? entityFor(load) : {};
      titleEl.innerText = 'Customer Invoice';
      body.innerHTML = `
        <div style="${S.row}">
          ${brandHeader(entity)}
          <div style="text-align:right;">
            <div style="font-weight:700;color:#0f172a;">INVOICE</div>
            <div style="color:#64748b;">${esc(inv.invoice_number)}</div>
            ${invoiceStatusBadge(inv.status)}
          </div>
        </div>
        <div style="${S.grid2}">
          <div style="${S.box}"><div style="${S.label}">Bill To</div>
            <div style="font-weight:700;">${esc(inv.customer_name) || 'Not assigned'}</div>
            <div style="color:#64748b;">${esc(inv.customer_address) || ''}</div>
          </div>
          <div style="${S.box}"><div style="${S.label}">Invoice Details</div>
            <div style="color:#64748b;">Load #: ${esc(inv.load_number)}</div>
            <div style="color:#64748b;">Terms: ${esc(inv.customer_terms) || 'Net 30'}</div>
            <div style="color:#64748b;">Issued: ${dateOrDash(inv.issued_date)}</div>
          </div>
        </div>
        <table style="${S.table}">
          <thead><tr><th style="${S.th}">Description</th><th style="${S.th}">Container / BOL</th><th style="${S.th};text-align:right;">Amount</th></tr></thead>
          <tbody><tr>
            <td style="${S.td}">Freight charges — ${esc(shortLoc(inv.origin))}</td>
            <td style="${S.td}">${esc(inv.container_number) || '—'} / ${esc(inv.bol_number) || '—'}</td>
            <td style="${S.td};text-align:right;font-weight:700;">${money(inv.amount)}</td>
          </tr></tbody>
        </table>
        <div style="${S.box};display:flex;justify-content:space-between;align-items:center;">
          <div style="font-weight:700;">Total Due</div>
          <div style="font-size:1.4rem;font-weight:900;color:#1e3a8a;">${money(inv.amount)} USD</div>
        </div>
      `;
    }

    else if (currentType === 'settlement') {
      const l = currentLoad;
      const entity = entityFor(l);
      titleEl.innerText = 'Carrier Settlement Statement';
      body.innerHTML = `
        <div style="${S.row}">
          ${brandHeader(entity)}
          <div style="text-align:right;">
            <div style="font-weight:700;color:#0f172a;">SETTLEMENT STATEMENT</div>
            <div style="color:#64748b;">Load # ${esc(l.load_number)}</div>
            ${payStatusBadgeText(l.carrier_pay_status || 'Pending')}
          </div>
        </div>
        <div style="${S.box}"><div style="${S.label}">Pay To</div>
          <div style="font-weight:700;">${esc(l.carrier_name) || 'Not assigned'}</div>
          <div style="color:#64748b;">MC# ${esc(l.carrier_mc) || '—'}</div>
        </div>
        <div style="${S.box};display:flex;justify-content:space-between;align-items:center;margin-top:14px;">
          <div style="font-weight:700;">Total Owed to Carrier</div>
          <div style="font-size:1.4rem;font-weight:900;color:#1e3a8a;">${l.carrier_rate != null ? money(l.carrier_rate) + ' USD' : 'TBD'}</div>
        </div>
        <div style="margin-top:10px;color:#94a3b8;font-size:11px;">${l.carrier_pay_status === 'Done' ? 'Paid on ' + dateOrDash(l.carrier_paid_date) : 'Payment pending.'}</div>
      `;
    }
  }

  function download() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 48;
    let y = 56;

    const l = currentLoad;
    const inv = currentInvoice;
    const load = currentType === 'invoice' ? State.loads.find((x) => x.id === inv.load_id) : l;
    const entity = load ? entityFor(load) : {};
    const loadNumber = currentType === 'invoice' ? inv.load_number : l.load_number;

    if (entity.logo_data_uri) {
      try { doc.addImage(entity.logo_data_uri, 'PNG', margin, y - 20, 60, 24); } catch (e) { /* ignore bad image */ }
    }
    const textX = entity.logo_data_uri ? margin + 70 : margin;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(30, 58, 138);
    doc.text(entity.name || 'Company', textX, y);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(100, 116, 139);
    y += 16; doc.text(entity.address || '', textX, y);
    y += 13; doc.text([entity.email, entity.phone].filter(Boolean).join('   |   '), textX, y);

    const titles = { rc: 'RATE CONFIRMATION', pod: 'PROOF OF DELIVERY', invoice: 'INVOICE', settlement: 'SETTLEMENT STATEMENT' };
    const fileTags = { rc: 'RateConfirmation', pod: 'ProofOfDelivery', invoice: 'Invoice', settlement: 'Settlement' };

    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(15, 23, 42);
    doc.text(titles[currentType], pageW - margin, 56, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(100, 116, 139);
    doc.text('Load # ' + (loadNumber || ''), pageW - margin, 72, { align: 'right' });
    if (currentType === 'invoice') doc.text('Invoice # ' + inv.invoice_number, pageW - margin, 86, { align: 'right' });

    y = 110;
    doc.setDrawColor(203, 213, 225); doc.line(margin, y, pageW - margin, y);
    y += 24;
    const colW = (pageW - margin * 2 - 16) / 2;

    if (currentType === 'rc') {
      doc.setFillColor(248, 250, 252); doc.rect(margin, y, colW, 62, 'F'); doc.rect(margin + colW + 16, y, colW, 62, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(15, 23, 42);
      doc.text('CARRIER', margin + 10, y + 16); doc.text('BILL-TO CUSTOMER', margin + colW + 26, y + 16);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(51, 65, 85);
      doc.text(doc.splitTextToSize(l.carrier_name || 'Not assigned', colW - 20), margin + 10, y + 30);
      doc.text(doc.splitTextToSize('MC# ' + (l.carrier_mc || '—'), colW - 20), margin + 10, y + 44);
      doc.text(doc.splitTextToSize(l.customer_name || 'Not assigned', colW - 20), margin + colW + 26, y + 30);
      y += 82;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(30, 64, 175);
      doc.text('1. PICKUP', margin, y);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(51, 65, 85);
      doc.text(doc.splitTextToSize(l.origin || '—', pageW - margin * 2 - 80), margin + 80, y);
      y += 24;
      doc.setFont('helvetica', 'bold'); doc.setTextColor(4, 120, 87);
      doc.text('2. CONSIGNEE', margin, y);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(51, 65, 85);
      doc.text(doc.splitTextToSize((l.consignee_name || '') + (l.consignee_address ? ' — ' + l.consignee_address : '') || '—', pageW - margin * 2 - 80), margin + 80, y);
      y += 34;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(15, 23, 42);
      doc.text('Container #: ' + (l.container_number || '—') + '   BOL #: ' + (l.bol_number || '—'), margin, y);
      y += 30;
      drawTotalBox(doc, margin, y, pageW, 'Total Carrier Rate', l.carrier_rate);
    }

    else if (currentType === 'pod') {
      doc.setFillColor(248, 250, 252); doc.rect(margin, y, colW, 60, 'F'); doc.rect(margin + colW + 16, y, colW, 60, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(15, 23, 42);
      doc.text('PICKUP ADDRESS', margin + 10, y + 16); doc.text('DELIVERY ADDRESS', margin + colW + 26, y + 16);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(51, 65, 85);
      doc.text(doc.splitTextToSize(l.origin || '—', colW - 20), margin + 10, y + 30);
      doc.text(doc.splitTextToSize((l.consignee_name || '') + (l.consignee_address ? (' — ' + l.consignee_address) : ''), colW - 20), margin + colW + 26, y + 30);
      y += 82;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(15, 23, 42);
      doc.text('Container #: ' + (l.container_number || '—') + '   BOL #: ' + (l.bol_number || '—'), margin, y);
      y += 16;
      doc.text('Seal #: ' + (l.seal_number || '—') + '   Reference #: ' + (l.reference_number || '—'), margin, y);
      y += 16;
      doc.text('Weight: ' + (l.weight || '—') + '   Type: ' + (l.container_type || '—'), margin, y);
      y += 24;
      doc.setFont('helvetica', 'normal'); doc.setTextColor(51, 65, 85);
      doc.text(doc.splitTextToSize('Qty ' + (l.packages_qty || '1') + ' — ' + (l.packages_desc || 'No description'), pageW - margin * 2), margin, y);
      y += 40;
      doc.setDrawColor(226, 232, 240); doc.line(margin, y, pageW - margin, y);
      y += 20;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(15, 23, 42);
      doc.text('RECEIVED IN GOOD ORDER AND CONDITION', margin, y);
      y += 20;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(51, 65, 85);
      doc.text('Name: _______________   Signature: _______________   Date: ___________', margin, y);
      y += 18;
      doc.text('Truck #: _______________   Time In: ___________   Time Out: ___________', margin, y);
    }

    else if (currentType === 'invoice') {
      doc.setFillColor(248, 250, 252); doc.rect(margin, y, colW, 55, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(15, 23, 42);
      doc.text('BILL TO', margin + 10, y + 16);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(51, 65, 85);
      doc.text(doc.splitTextToSize(inv.customer_name || 'Not assigned', colW - 20), margin + 10, y + 30);
      y += 75;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(51, 65, 85);
      doc.text('Description: Freight charges — ' + (inv.origin || ''), margin, y);
      y += 30;
      drawTotalBox(doc, margin, y, pageW, 'Total Due', inv.amount);
    }

    else if (currentType === 'settlement') {
      doc.setFillColor(248, 250, 252); doc.rect(margin, y, pageW - margin * 2, 50, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(15, 23, 42);
      doc.text('PAY TO', margin + 10, y + 16);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(51, 65, 85);
      doc.text((l.carrier_name || 'Not assigned') + '   MC# ' + (l.carrier_mc || '—'), margin + 10, y + 32);
      y += 70;
      drawTotalBox(doc, margin, y, pageW, 'Total Owed to Carrier', l.carrier_rate);
    }

    doc.save(`${fileTags[currentType]}_${loadNumber || 'document'}.pdf`);
    toast('PDF downloaded.', 'success');
  }

  function drawTotalBox(doc, margin, y, pageW, label, amount) {
    doc.setFillColor(248, 250, 252); doc.rect(margin, y, pageW - margin * 2, 46, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(15, 23, 42);
    doc.text(label, margin + 12, y + 28);
    doc.setFontSize(16); doc.setTextColor(30, 58, 138);
    const text = (amount !== null && amount !== undefined && amount !== '')
      ? ('$' + parseFloat(amount).toLocaleString(undefined, { minimumFractionDigits: 2 }) + ' USD')
      : 'TBD';
    doc.text(text, pageW - margin - 12, y + 28, { align: 'right' });
  }

  function downloadReportPdf(period, rows) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 40;
    let y = 50;

    doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(15, 23, 42);
    doc.text('Loads Report', margin, y);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(100, 116, 139);
    y += 18; doc.text('Period: ' + period.replace('_', ' ') + '   |   Generated: ' + new Date().toISOString().slice(0, 10), margin, y);
    y += 20;

    const headers = ['Load #', 'Entity', 'Status', 'Customer', 'Carrier', 'Carrier Rate', 'Customer Charge', 'Gross Profit'];
    const colWidths = [55, 40, 65, 85, 85, 65, 80, 65];
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setFillColor(30, 41, 59); doc.setTextColor(255, 255, 255);
    doc.rect(margin, y, pageW - margin * 2, 18, 'F');
    let x = margin + 4;
    headers.forEach((h, i) => { doc.text(h, x, y + 12); x += colWidths[i]; });
    y += 18;

    doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 41, 59);
    rows.forEach((r, idx) => {
      if (y > 740) { doc.addPage(); y = 50; }
      if (idx % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(margin, y, pageW - margin * 2, 16, 'F'); }
      x = margin + 4;
      const cells = [
        r.load_number, r.entity_code, r.status, r.customer_name || '—', r.carrier_name || '—',
        r.carrier_rate != null ? '$' + Number(r.carrier_rate).toFixed(2) : '—',
        r.customer_charge != null ? '$' + Number(r.customer_charge).toFixed(2) : '—',
        r.gross_profit != null ? '$' + Number(r.gross_profit).toFixed(2) : '—'
      ];
      cells.forEach((c, i) => { doc.text(doc.splitTextToSize(String(c), colWidths[i] - 4)[0] || '', x, y + 11); x += colWidths[i]; });
      y += 16;
    });

    doc.save(`loads_report_${period}.pdf`);
    toast('PDF downloaded.', 'success');
  }

  return { openForLoad, openForInvoice, close, download, downloadReportPdf };
})();
