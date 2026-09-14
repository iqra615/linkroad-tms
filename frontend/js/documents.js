const Documents = (() => {
  let currentType = null;
  let currentLoad = null;
  let currentInvoice = null;

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

  function close() {
    hideModal('docModal');
  }

  function render() {
    const titleEl = document.getElementById('docModalTitle');
    const body = document.getElementById('docBody');

    if (currentType === 'rc') {
      const l = currentLoad;
      titleEl.innerHTML = `<i class="fa-solid fa-file-invoice text-blue-600"></i> Rate Confirmation`;
      body.innerHTML = `
        <div class="flex justify-between items-start border-b pb-4">
          ${brandHeader()}
          <div class="text-right">
            <div class="font-bold text-sm text-slate-900">RATE CONFIRMATION</div>
            <div class="text-slate-500">Load # ${esc(l.load_number)}</div>
            <div class="inline-block mt-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">${esc(l.status).toUpperCase()}</div>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div class="font-bold text-slate-900 uppercase text-[11px] mb-1">Carrier</div>
            <p class="font-semibold text-slate-800">${esc(l.carrier_name) || 'Not assigned'}</p>
            <p class="text-slate-500">MC# ${esc(l.carrier_mc) || '—'}</p>
            <p class="text-slate-500">${esc(l.carrier_phone) || ''} ${l.carrier_email ? (' · ' + esc(l.carrier_email)) : ''}</p>
            <p class="text-slate-500">${esc(l.carrier_address) || ''}</p>
          </div>
          <div class="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div class="font-bold text-slate-900 uppercase text-[11px] mb-1">Bill-To Customer</div>
            <p class="font-semibold text-slate-800">${esc(l.customer_name) || 'Not assigned'}</p>
            <p class="text-slate-500">${esc(l.customer_address) || ''}</p>
          </div>
        </div>
        <table class="w-full text-left border border-slate-200 rounded-lg overflow-hidden">
          <thead class="bg-slate-100 font-bold text-slate-800"><tr><th class="p-2.5">Stop</th><th class="p-2.5">Location</th></tr></thead>
          <tbody class="divide-y divide-slate-200">
            <tr><td class="p-2.5 font-bold text-blue-700">1. PICKUP</td><td class="p-2.5">${esc(l.origin) || '—'}</td></tr>
            <tr><td class="p-2.5 font-bold text-emerald-700">2. CONSIGNEE</td><td class="p-2.5">${esc(l.consignee_name) || ''}${l.consignee_address ? ' — ' + esc(l.consignee_address) : ''}</td></tr>
          </tbody>
        </table>
        <div class="grid grid-cols-3 gap-3">
          <div class="bg-slate-50 p-3 rounded-lg border border-slate-200"><div class="font-bold text-slate-900 uppercase text-[10px]">Container #</div><p class="text-slate-700">${esc(l.container_number) || '—'}</p></div>
          <div class="bg-slate-50 p-3 rounded-lg border border-slate-200"><div class="font-bold text-slate-900 uppercase text-[10px]">BOL #</div><p class="text-slate-700">${esc(l.bol_number) || '—'}</p></div>
          <div class="bg-slate-50 p-3 rounded-lg border border-slate-200"><div class="font-bold text-slate-900 uppercase text-[10px]">Weight / Type</div><p class="text-slate-700">${esc(l.weight) || '—'} ${esc(l.equipment_type) || ''}</p></div>
        </div>
        <div class="bg-slate-50 p-4 rounded-lg border border-slate-200 flex justify-between items-center">
          <div>
            <div class="font-bold text-slate-900">Total Carrier Rate:</div>
            <div class="text-[10px] text-slate-500">Includes all linehaul, fuel surcharge, and accessorials unless noted below</div>
          </div>
          <div class="text-2xl font-black text-blue-900">${l.carrier_rate != null ? money(l.carrier_rate) + ' USD' : 'TBD'}</div>
        </div>
        ${l.notes ? `<div class="text-slate-600 text-[11px] bg-amber-50 border border-amber-200 rounded-lg p-2.5"><strong>Notes:</strong> ${esc(l.notes)}</div>` : ''}
        ${signatureBlock('Carrier')}
      `;
    }

    else if (currentType === 'bol') {
      const l = currentLoad;
      titleEl.innerHTML = `<i class="fa-solid fa-clipboard-list text-blue-600"></i> Bill of Lading`;
      body.innerHTML = `
        <div class="flex justify-between items-start border-b pb-4">
          ${brandHeader()}
          <div class="text-right">
            <div class="font-bold text-sm text-slate-900">STRAIGHT BILL OF LADING</div>
            <div class="text-slate-500">Load # ${esc(l.load_number)}</div>
            <div class="text-slate-500">BOL #: ${esc(l.bol_number) || '—'}</div>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div class="font-bold text-slate-900 uppercase text-[11px] mb-1">Ship From</div>
            <p class="text-slate-700">${esc(l.origin) || '—'}</p>
          </div>
          <div class="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div class="font-bold text-slate-900 uppercase text-[11px] mb-1">Ship To (Consignee)</div>
            <p class="font-semibold text-slate-800">${esc(l.consignee_name) || '—'}</p>
            <p class="text-slate-500">${esc(l.consignee_address) || ''}</p>
          </div>
        </div>
        <div class="bg-slate-50 p-3 rounded-lg border border-slate-200">
          <div class="font-bold text-slate-900 uppercase text-[11px] mb-1">Carrier</div>
          <p class="text-slate-700">${esc(l.carrier_name) || 'Not assigned'} ${l.carrier_mc ? ('— MC# ' + esc(l.carrier_mc)) : ''}</p>
        </div>
        <table class="w-full text-left border border-slate-200 rounded-lg overflow-hidden">
          <thead class="bg-slate-100 font-bold text-slate-800"><tr><th class="p-2.5">Qty</th><th class="p-2.5">Description</th><th class="p-2.5">Weight</th><th class="p-2.5">Type</th></tr></thead>
          <tbody class="divide-y divide-slate-200">
            <tr>
              <td class="p-2.5">1</td>
              <td class="p-2.5">${esc(l.commodity_desc) || esc(l.notes) || 'Container ' + (esc(l.container_number) || '—')}</td>
              <td class="p-2.5">${esc(l.weight) || '—'}</td>
              <td class="p-2.5">${esc(l.equipment_type) || '—'}</td>
            </tr>
          </tbody>
        </table>
        <div class="border-t pt-4 text-[10px] text-slate-400 space-y-3">
          <p>Received, subject to individually determined rates or contracts that have been agreed upon in writing, the property described above in apparent good order, except as noted.</p>
          <div class="grid grid-cols-2 gap-6 pt-2">
            <div>Shipper Signature: _____________________<br>Date: ___________</div>
            <div>Carrier Signature: _____________________<br>Date: ___________</div>
          </div>
        </div>
      `;
    }

    else if (currentType === 'invoice') {
      const inv = currentInvoice;
      titleEl.innerHTML = `<i class="fa-solid fa-file-invoice-dollar text-emerald-600"></i> Customer Invoice`;
      body.innerHTML = `
        <div class="flex justify-between items-start border-b pb-4">
          ${brandHeader()}
          <div class="text-right">
            <div class="font-bold text-sm text-slate-900">INVOICE</div>
            <div class="text-slate-500">${esc(inv.invoice_number)}</div>
            <div class="inline-block mt-1 ${inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'} text-[10px] font-bold px-2 py-0.5 rounded">${esc(inv.status.toUpperCase())}</div>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div class="font-bold text-slate-900 uppercase text-[11px] mb-1">Bill To</div>
            <p class="font-semibold text-slate-800">${esc(inv.customer_name) || 'Not assigned'}</p>
            <p class="text-slate-500">${esc(inv.customer_address) || ''}</p>
            <p class="text-slate-500">${esc(inv.customer_email) || ''}</p>
          </div>
          <div class="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div class="font-bold text-slate-900 uppercase text-[11px] mb-1">Invoice Details</div>
            <p class="text-slate-500">Load #: ${esc(inv.load_number)}</p>
            <p class="text-slate-500">Terms: ${esc(inv.customer_terms) || 'Net 30'}</p>
            <p class="text-slate-500">Issued: ${esc(inv.issued_date) || '—'}</p>
            ${inv.due_date ? `<p class="text-slate-500">Due: ${esc(inv.due_date)}</p>` : ''}
          </div>
        </div>
        <table class="w-full text-left border border-slate-200 rounded-lg overflow-hidden">
          <thead class="bg-slate-100 font-bold text-slate-800"><tr><th class="p-2.5">Description</th><th class="p-2.5">Container / BOL</th><th class="p-2.5 text-right">Amount</th></tr></thead>
          <tbody class="divide-y divide-slate-200">
            <tr>
              <td class="p-2.5">Freight charges — ${esc(shortLoc(inv.origin))}</td>
              <td class="p-2.5 text-slate-500">${esc(inv.container_number) || '—'} / ${esc(inv.bol_number) || '—'}</td>
              <td class="p-2.5 text-right font-semibold">${money(inv.amount)}</td>
            </tr>
          </tbody>
        </table>
        <div class="bg-slate-50 p-4 rounded-lg border border-slate-200 flex justify-between items-center">
          <div class="font-bold text-slate-900">Total Due</div>
          <div class="text-2xl font-black text-blue-900">${money(inv.amount)} USD</div>
        </div>
        <div class="border-t pt-4 text-[10px] text-slate-400">Thank you for your business. Remit payment per agreed terms to Linkroad Logistics Inc.</div>
      `;
    }

    else if (currentType === 'settlement') {
      const l = currentLoad;
      titleEl.innerHTML = `<i class="fa-solid fa-money-check-dollar text-amber-600"></i> Carrier Settlement Statement`;
      body.innerHTML = `
        <div class="flex justify-between items-start border-b pb-4">
          ${brandHeader()}
          <div class="text-right">
            <div class="font-bold text-sm text-slate-900">SETTLEMENT STATEMENT</div>
            <div class="text-slate-500">Load # ${esc(l.load_number)}</div>
            <div class="inline-block mt-1 ${l.carrier_pay_status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'} text-[10px] font-bold px-2 py-0.5 rounded">${esc((l.carrier_pay_status || 'Unpaid').toUpperCase())}</div>
          </div>
        </div>
        <div class="bg-slate-50 p-3 rounded-lg border border-slate-200">
          <div class="font-bold text-slate-900 uppercase text-[11px] mb-1">Pay To</div>
          <p class="font-semibold text-slate-800">${esc(l.carrier_name) || 'Not assigned'}</p>
          <p class="text-slate-500">MC# ${esc(l.carrier_mc) || '—'}</p>
          <p class="text-slate-500">${esc(l.carrier_address) || ''}</p>
        </div>
        <table class="w-full text-left border border-slate-200 rounded-lg overflow-hidden">
          <thead class="bg-slate-100 font-bold text-slate-800"><tr><th class="p-2.5">Load #</th><th class="p-2.5">Route</th><th class="p-2.5 text-right">Rate</th></tr></thead>
          <tbody class="divide-y divide-slate-200">
            <tr>
              <td class="p-2.5">${esc(l.load_number)}</td>
              <td class="p-2.5 text-slate-500">${esc(shortLoc(l.origin))} → ${esc(l.consignee_name) || ''}</td>
              <td class="p-2.5 text-right font-semibold">${money(l.carrier_rate)}</td>
            </tr>
          </tbody>
        </table>
        <div class="bg-slate-50 p-4 rounded-lg border border-slate-200 flex justify-between items-center">
          <div class="font-bold text-slate-900">Total Owed to Carrier</div>
          <div class="text-2xl font-black text-blue-900">${l.carrier_rate != null ? money(l.carrier_rate) + ' USD' : 'TBD'}</div>
        </div>
        <div class="text-[10px] text-slate-400">${l.carrier_pay_status === 'Paid' ? 'Paid on ' + esc(l.carrier_paid_date) : 'Payment pending.'}</div>
      `;
    }
  }

  function brandHeader() {
    return `<div>
      <h1 class="text-xl font-black text-blue-900 uppercase">Linkroad Logistics</h1>
      <p class="text-slate-500">16192 Coastal Hwy, Lewes, DE 19958</p>
      <p class="text-slate-500">dispatch@linkroadlogistics.com &nbsp;|&nbsp; 267-283-9370</p>
    </div>`;
  }
  function signatureBlock(party) {
    return `<div class="border-t pt-4 text-[10px] text-slate-400 space-y-1">
      <p>Any questions about the load or rate — call 267-283-9370. Accessorials not listed here require prior authorization.</p>
      <p>${esc(party)} Signature: _______________________ &nbsp; Date: ___________</p>
    </div>`;
  }

  function download() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 48;
    let y = 56;

    doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(30, 58, 138);
    doc.text('LINKROAD LOGISTICS', margin, y);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(100, 116, 139);
    y += 16; doc.text('16192 Coastal Hwy, Lewes, DE 19958', margin, y);
    y += 13; doc.text('dispatch@linkroadlogistics.com   |   267-283-9370', margin, y);

    const titles = { rc: 'RATE CONFIRMATION', bol: 'STRAIGHT BILL OF LADING', invoice: 'INVOICE', settlement: 'SETTLEMENT STATEMENT' };
    const fileTags = { rc: 'RateConfirmation', bol: 'BOL', invoice: 'Invoice', settlement: 'Settlement' };
    const loadNumber = currentType === 'invoice' ? currentInvoice.load_number : currentLoad.load_number;

    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(15, 23, 42);
    doc.text(titles[currentType], pageW - margin, 56, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(100, 116, 139);
    doc.text('Load # ' + (loadNumber || ''), pageW - margin, 72, { align: 'right' });
    if (currentType === 'invoice') doc.text('Invoice # ' + currentInvoice.invoice_number, pageW - margin, 86, { align: 'right' });
    if (currentType === 'bol') doc.text('BOL # ' + (currentLoad.bol_number || '—'), pageW - margin, 86, { align: 'right' });

    y = 110;
    doc.setDrawColor(203, 213, 225); doc.line(margin, y, pageW - margin, y);
    y += 24;

    const colW = (pageW - margin * 2 - 16) / 2;

    if (currentType === 'rc') {
      const l = currentLoad;
      doc.setFillColor(248, 250, 252); doc.rect(margin, y, colW, 70, 'F'); doc.rect(margin + colW + 16, y, colW, 70, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(15, 23, 42);
      doc.text('CARRIER', margin + 10, y + 16);
      doc.text('BILL-TO CUSTOMER', margin + colW + 26, y + 16);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(51, 65, 85);
      doc.text(doc.splitTextToSize(l.carrier_name || 'Not assigned', colW - 20), margin + 10, y + 30);
      doc.text(doc.splitTextToSize('MC# ' + (l.carrier_mc || '—') + '   ' + (l.carrier_phone || ''), colW - 20), margin + 10, y + 44);
      doc.text(doc.splitTextToSize(l.carrier_address || '', colW - 20), margin + 10, y + 58);
      doc.text(doc.splitTextToSize(l.customer_name || 'Not assigned', colW - 20), margin + colW + 26, y + 30);
      doc.text(doc.splitTextToSize(l.customer_address || '', colW - 20), margin + colW + 26, y + 44);

      y += 92;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(30, 64, 175);
      doc.text('1. PICKUP', margin, y);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(51, 65, 85);
      doc.text(doc.splitTextToSize(l.origin || '—', pageW - margin * 2 - 80), margin + 80, y);
      y += 24;
      doc.setFont('helvetica', 'bold'); doc.setTextColor(4, 120, 87);
      doc.text('2. CONSIGNEE', margin, y);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(51, 65, 85);
      const consigneeText = (l.consignee_name || '') + (l.consignee_address ? ' — ' + l.consignee_address : '');
      doc.text(doc.splitTextToSize(consigneeText || '—', pageW - margin * 2 - 80), margin + 80, y);

      y += 34;
      doc.setDrawColor(203, 213, 225); doc.line(margin, y, pageW - margin, y);
      y += 22;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(15, 23, 42);
      doc.text('Container #: ' + (l.container_number || '—'), margin, y);
      doc.text('BOL #: ' + (l.bol_number || '—'), margin + 200, y);
      y += 16;
      doc.text('Weight / Type: ' + (l.weight || '—') + ' ' + (l.equipment_type || ''), margin, y);

      y += 30;
      drawTotalBox(doc, margin, y, pageW, 'Total Carrier Rate', l.carrier_rate);
      y += 70;
      if (l.notes) {
        doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(120, 53, 15);
        doc.text(doc.splitTextToSize('Notes: ' + l.notes, pageW - margin * 2), margin, y);
        y += 30;
      }
      doc.setDrawColor(226, 232, 240); doc.line(margin, y, pageW - margin, y);
      y += 20;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(148, 163, 184);
      doc.text('Any questions about the load or rate — call 267-283-9370. Accessorials not listed here require prior authorization.', margin, y);
      y += 24;
      doc.text('Carrier Signature: _______________________        Date: ___________', margin, y);
    }

    else if (currentType === 'invoice') {
      const inv = currentInvoice;
      doc.setFillColor(248, 250, 252); doc.rect(margin, y, colW, 60, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(15, 23, 42);
      doc.text('BILL TO', margin + 10, y + 16);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(51, 65, 85);
      doc.text(doc.splitTextToSize(inv.customer_name || 'Not assigned', colW - 20), margin + 10, y + 30);
      doc.text(doc.splitTextToSize(inv.customer_address || '', colW - 20), margin + 10, y + 44);
      y += 82;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(51, 65, 85);
      doc.text('Description: Freight charges — ' + (inv.origin || ''), margin, y);
      y += 16;
      doc.text('Container / BOL: ' + (inv.container_number || '—') + ' / ' + (inv.bol_number || '—'), margin, y);
      y += 30;
      drawTotalBox(doc, margin, y, pageW, 'Total Due', inv.amount);
    }

    else if (currentType === 'settlement') {
      const l = currentLoad;
      doc.setFillColor(248, 250, 252); doc.rect(margin, y, pageW - margin * 2, 60, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(15, 23, 42);
      doc.text('PAY TO', margin + 10, y + 16);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(51, 65, 85);
      doc.text(doc.splitTextToSize((l.carrier_name || 'Not assigned') + '   MC# ' + (l.carrier_mc || '—'), pageW - margin * 2 - 20), margin + 10, y + 30);
      doc.text(doc.splitTextToSize(l.carrier_address || '', pageW - margin * 2 - 20), margin + 10, y + 44);
      y += 82;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(51, 65, 85);
      doc.text('Route: ' + (l.origin || '') + '  ->  ' + (l.consignee_name || ''), margin, y);
      y += 30;
      drawTotalBox(doc, margin, y, pageW, 'Total Owed to Carrier', l.carrier_rate);
      y += 60;
      doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(100, 116, 139);
      doc.text(l.carrier_pay_status === 'Paid' ? ('Paid on ' + (l.carrier_paid_date || '')) : 'Payment pending.', margin, y);
    }

    else if (currentType === 'bol') {
      const l = currentLoad;
      doc.setFillColor(248, 250, 252); doc.rect(margin, y, colW, 60, 'F'); doc.rect(margin + colW + 16, y, colW, 60, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(15, 23, 42);
      doc.text('SHIP FROM', margin + 10, y + 16);
      doc.text('SHIP TO (CONSIGNEE)', margin + colW + 26, y + 16);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(51, 65, 85);
      doc.text(doc.splitTextToSize(l.origin || '—', colW - 20), margin + 10, y + 30);
      doc.text(doc.splitTextToSize((l.consignee_name || '') + (l.consignee_address ? (' — ' + l.consignee_address) : ''), colW - 20), margin + colW + 26, y + 30);
      y += 82;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(15, 23, 42);
      doc.text('Carrier: ' + (l.carrier_name || 'Not assigned') + (l.carrier_mc ? ('  MC# ' + l.carrier_mc) : ''), margin, y);
      y += 24;
      doc.setFont('helvetica', 'normal'); doc.setTextColor(51, 65, 85);
      doc.text('Qty: 1     Weight: ' + (l.weight || '—') + '     Type: ' + (l.equipment_type || '—'), margin, y);
      y += 16;
      doc.text(doc.splitTextToSize('Description: ' + (l.commodity_desc || l.notes || ('Container ' + (l.container_number || '—'))), pageW - margin * 2), margin, y);
      y += 50;
      doc.setDrawColor(226, 232, 240); doc.line(margin, y, pageW - margin, y);
      y += 24;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(148, 163, 184);
      doc.text('Received, subject to individually determined rates or contracts agreed upon in writing, the property', margin, y);
      y += 12;
      doc.text('described above in apparent good order, except as noted.', margin, y);
      y += 30;
      doc.text('Shipper Signature: _______________________        Date: ___________', margin, y);
      y += 20;
      doc.text('Carrier Signature: _______________________        Date: ___________', margin, y);
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

  return { openForLoad, openForInvoice, close, download };
})();
