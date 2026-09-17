const App = (() => {
  let activeTab = 'dashboard';
  let confirmAction = null;

  const TAB_META = {
    dashboard: 'Operational Dashboard',
    loadboard: 'Load Board',
    addload: 'Add Load',
    customers: 'Customers',
    consignees: 'Consignees',
    carriers: 'Carriers',
    invoices: 'Invoices & Payments',
    reports: 'Reports & Analytics',
    'users-tab': 'System Users Management'
  };

  const ADMIN_ONLY_TABS = ['invoices', 'reports', 'users-tab'];

  async function switchTab(tab) {
    if (ADMIN_ONLY_TABS.includes(tab) && State.currentUser?.role !== 'Administrator') {
      toast('You do not have permission to view that page.', 'error');
      tab = 'dashboard';
    }
    activeTab = tab;
    document.querySelectorAll('.content-area').forEach((el) => el.classList.add('hidden'));
    document.getElementById(tab).classList.remove('hidden');
    document.querySelectorAll('#sidebar-nav li').forEach((li) => li.classList.toggle('active', li.dataset.tab === tab));
    document.getElementById('page-title').innerText = TAB_META[tab] || tab;
    await renderActiveTab();
  }

  async function renderActiveTab() {
    try {
      if (activeTab === 'dashboard') await RenderDashboard.render();
      else if (activeTab === 'loadboard') RenderLoads.render();
      else if (activeTab === 'addload') renderAddLoadPage();
      else if (activeTab === 'customers') RenderCustomers.render();
      else if (activeTab === 'consignees') RenderConsignees.render();
      else if (activeTab === 'carriers') RenderCarriers.render();
      else if (activeTab === 'invoices') RenderInvoices.render();
      else if (activeTab === 'reports') await RenderReports.render();
      else if (activeTab === 'users-tab') await RenderUsers.refresh();
    } catch (err) {
      toast(describeApiError(err), 'error');
    }
  }

  function renderAddLoadPage() {
    const container = document.getElementById('addload-form-container');
    container.innerHTML = `
      <div class="form-grid">
        ${LoadForm.renderFields({}, 'addload', { hideActualDates: true })}
        <div class="form-actions"><button class="btn-primary" id="addLoadSaveBtn">Save & Dispatch</button></div>
      </div>
    `;
    document.getElementById('addLoadSaveBtn').addEventListener('click', async () => {
      const btn = document.getElementById('addLoadSaveBtn');
      const payload = LoadForm.collectValues('addload');
      if (!payload.entity_id) return toast('Company Entity is required.', 'error');
      btn.disabled = true;
      btn.innerText = 'Saving…';
      try {
        await Api.Loads.create(payload);
        await refreshLoadsDependentViews();
        toast('Load successfully created and added to the Load Board!', 'success');
        await switchTab('loadboard');
      } catch (err) {
        toast(describeApiError(err), 'error');
      } finally {
        btn.disabled = false;
        btn.innerText = 'Save & Dispatch';
      }
    });
  }

  async function onLogin() {
    try {
      await State.refreshAll();
    } catch (err) {
      toast(describeApiError(err), 'error');
    }
    await switchTab('dashboard');
  }

  // ---- Cross-tab refresh helpers ----
  async function refreshLoadsDependentViews() {
    await State.refreshLoads(currentLoadQuery());
    await State.refreshInvoices();
    await renderAllVisible();
  }
  async function refreshCarriersDependentViews() {
    await State.refreshCarriers();
    await State.refreshLoads(currentLoadQuery());
    await renderAllVisible();
  }
  async function refreshCustomersDependentViews() {
    await State.refreshCustomers();
    await State.refreshLoads(currentLoadQuery());
    await State.refreshInvoices();
    await renderAllVisible();
  }
  async function refreshConsigneesDependentViews() {
    await State.refreshConsignees();
    await State.refreshLoads(currentLoadQuery());
    await renderAllVisible();
  }
  async function refreshInvoicesDependentViews() {
    await State.refreshInvoices();
    await renderAllVisible();
  }
  async function renderAllVisible() {
    await RenderDashboard.render();
    RenderLoads.render();
    RenderInvoices.render();
    RenderCarriers.render();
    RenderCustomers.render();
    RenderConsignees.render();
  }
  function currentLoadQuery() {
    const search = document.getElementById('loadSearch').value.trim();
    const status = document.getElementById('loadStatusFilter').value;
    const entityId = document.getElementById('loadEntityFilter').value;
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    if (entityId) params.set('entity_id', entityId);
    return params.toString() ? `?${params}` : '';
  }

  async function updateLoadField(loadId, patch) {
    const existing = State.loads.find((l) => l.id === loadId);
    if (!existing) return;
    const payload = {
      entity_id: existing.entity_id, load_number: existing.load_number,
      dispatcher_user_id: existing.dispatcher_user_id, customer_id: existing.customer_id,
      carrier_id: existing.carrier_id, consignee_id: existing.consignee_id,
      load_type: existing.load_type, origin: existing.origin, deliver_to_address: existing.deliver_to_address,
      empty_return_location: existing.empty_return_location,
      container_number: existing.container_number, container_type: existing.container_type, bol_number: existing.bol_number,
      seal_number: existing.seal_number, reference_number: existing.reference_number, pickup_number: existing.pickup_number,
      weight: existing.weight, commodity_desc: existing.commodity_desc,
      packages_qty: existing.packages_qty, packages_desc: existing.packages_desc,
      eta_date: dateOnly(existing.eta_date), lfd_date: dateOnly(existing.lfd_date),
      pickup_date: dateOnly(existing.pickup_date), delivery_date: dateOnly(existing.delivery_date),
      empty_return_date: dateOnly(existing.empty_return_date), completed_date: dateOnly(existing.completed_date),
      carrier_rate: existing.carrier_rate, customer_charge: existing.customer_charge,
      status: existing.status, notes: existing.notes,
      ...patch
    };
    await Api.Loads.update(loadId, payload);
    await refreshLoadsDependentViews();
  }
  function dateOnly(d) { return d ? d.slice(0, 10) : null; }

  // ---------------------------------------------------------------
  function wireEvents() {
    document.querySelectorAll('#sidebar-nav li[data-tab]').forEach((li) => {
      li.addEventListener('click', () => switchTab(li.dataset.tab));
    });

    document.getElementById('loadSearch').addEventListener('input', debounce(() => RenderLoads.refresh(), 300));
    document.getElementById('loadStatusFilter').addEventListener('change', () => RenderLoads.refresh());
    document.getElementById('loadFilterMine').addEventListener('change', () => RenderLoads.render());
    document.getElementById('loadFilterAll').addEventListener('change', () => RenderLoads.render());
    document.getElementById('loadFilterHideCompleted').addEventListener('change', () => RenderLoads.render());
    document.getElementById('loadEntityFilter').addEventListener('change', () => RenderLoads.refresh());

    document.getElementById('entityModalCloseBtn').addEventListener('click', Modals.close);
    document.getElementById('entitySaveBtn').addEventListener('click', () => Modals.submit());
    document.getElementById('docModalCloseBtn').addEventListener('click', Documents.close);
    document.getElementById('docDownloadBtn').addEventListener('click', Documents.download);
    document.getElementById('confirmCancelBtn').addEventListener('click', closeConfirm);

    document.getElementById('reportsPeriod').addEventListener('change', () => RenderReports.refreshSummary());
    document.getElementById('generateUserReportBtn').addEventListener('click', () => RenderReports.generateUserReport());
    document.getElementById('exportExcelBtn').addEventListener('click', () => RenderReports.exportExcel());
    document.getElementById('exportPdfBtn').addEventListener('click', () => RenderReports.exportPdf());

    document.querySelectorAll('.cust-filter').forEach((cb) => cb.addEventListener('change', () => RenderInvoices.renderCustomerInvoices()));
    document.querySelectorAll('.carrier-filter').forEach((cb) => cb.addEventListener('change', () => RenderInvoices.renderCarrierPayments()));

    document.addEventListener('click', async (e) => {
      if (e.target.closest('[data-goto-addload]')) return switchTab('addload');
      const gotoTabBtn = e.target.closest('[data-goto-tab]');
      if (gotoTabBtn) return switchTab(gotoTabBtn.dataset.gotoTab);

      const t = e.target.closest('[data-open-modal], [data-view-load], [data-edit-load], [data-delete-load], ' +
        '[data-edit-carrier], [data-delete-carrier], [data-edit-customer], [data-delete-customer], ' +
        '[data-edit-consignee], [data-delete-consignee], [data-edit-user], [data-delete-user], ' +
        '[data-open-doc], [data-create-invoice]');
      if (!t) return;

      try {
        if (t.dataset.openModal) return Modals.open(t.dataset.openModal);

        if (t.dataset.viewLoad) return Modals.openDetail(t.dataset.viewLoad);
        if (t.dataset.editLoad) return Modals.open('load', t.dataset.editLoad);
        if (t.dataset.deleteLoad) return openConfirm(`Delete ${t.dataset.loadLabel}? This can't be undone.`, async () => {
          await Api.Loads.remove(t.dataset.deleteLoad);
          await refreshLoadsDependentViews();
          toast('Deleted.', 'success');
        });

        if (t.dataset.editCarrier) return Modals.open('carrier', t.dataset.editCarrier);
        if (t.dataset.deleteCarrier) return openConfirm(`Delete ${t.dataset.carrierLabel}? This can't be undone.`, async () => {
          await Api.Carriers.remove(t.dataset.deleteCarrier);
          await refreshCarriersDependentViews();
          toast('Deleted.', 'success');
        });

        if (t.dataset.editCustomer) return Modals.open('customer', t.dataset.editCustomer);
        if (t.dataset.deleteCustomer) return openConfirm(`Delete ${t.dataset.customerLabel}? This can't be undone.`, async () => {
          await Api.Customers.remove(t.dataset.deleteCustomer);
          await refreshCustomersDependentViews();
          toast('Deleted.', 'success');
        });

        if (t.dataset.editConsignee) return Modals.open('consignee', t.dataset.editConsignee);
        if (t.dataset.deleteConsignee) return openConfirm(`Delete ${t.dataset.consigneeLabel}? This can't be undone.`, async () => {
          await Api.Consignees.remove(t.dataset.deleteConsignee);
          await refreshConsigneesDependentViews();
          toast('Deleted.', 'success');
        });

        if (t.dataset.editUser) return Modals.open('user', t.dataset.editUser);
        if (t.dataset.deleteUser) return openConfirm(`Delete ${t.dataset.userLabel}? This can't be undone.`, async () => {
          await Api.Users.remove(t.dataset.deleteUser);
          await RenderUsers.refresh();
          toast('Deleted.', 'success');
        });

        if (t.dataset.openDoc === 'rc') return Documents.openForLoad('rc', t.dataset.loadId);
        if (t.dataset.openDoc === 'pod') return Documents.openForLoad('pod', t.dataset.loadId);
        if (t.dataset.openDoc === 'settlement') return Documents.openForLoad('settlement', t.dataset.loadId);
        if (t.dataset.openDoc === 'invoice') return Documents.openForInvoice(t.dataset.invoiceId);

        if (t.dataset.createInvoice) {
          await Api.Invoices.create({ load_id: t.dataset.createInvoice });
          await refreshInvoicesDependentViews();
          toast('Invoice created.', 'success');
          return;
        }
      } catch (err) {
        toast(describeApiError(err), 'error');
      }
    });

    document.addEventListener('change', async (e) => {
      const t = e.target;
      try {
        if (t.dataset.statusSelect) {
          const patch = { status: t.value };
          if (t.value !== 'Completed') patch.completed_date = null;
          await updateLoadField(t.dataset.statusSelect, patch);
        }
        if (t.dataset.completedDate) {
          await updateLoadField(t.dataset.completedDate, { completed_date: t.value || null });
        }
        if (t.dataset.invoiceStatusSelect) {
          await Api.Invoices.setStatus(t.dataset.invoiceStatusSelect, t.value);
          await refreshInvoicesDependentViews();
          toast('Invoice updated.', 'success');
        }
        if (t.dataset.carrierPaySelect) {
          await Api.Loads.setCarrierPayment(t.dataset.carrierPaySelect, t.value);
          await refreshLoadsDependentViews();
          toast('Payment status updated.', 'success');
        }
      } catch (err) {
        toast(describeApiError(err), 'error');
        renderActiveTab();
      }
    });
  }

  function openConfirm(text, onConfirm) {
    document.getElementById('confirmText').innerText = text;
    confirmAction = onConfirm;
    showModal('confirmModal');
    const btn = document.getElementById('confirmDeleteBtn');
    btn.onclick = async () => {
      try {
        await confirmAction();
      } catch (err) {
        toast(describeApiError(err), 'error');
      }
      closeConfirm();
    };
  }
  function closeConfirm() {
    hideModal('confirmModal');
    confirmAction = null;
  }

  function debounce(fn, ms) {
    let handle;
    return (...args) => {
      clearTimeout(handle);
      handle = setTimeout(() => fn(...args), ms);
    };
  }

  return {
    switchTab,
    onLogin,
    wireEvents,
    refreshLoadsDependentViews,
    refreshCarriersDependentViews,
    refreshCustomersDependentViews,
    refreshConsigneesDependentViews,
    refreshInvoicesDependentViews
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  App.wireEvents();
  AuthUI.wireEvents();
  AuthUI.boot();
});
