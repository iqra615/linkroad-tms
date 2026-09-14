const App = (() => {
  let activeTab = 'dashboard';
  let confirmAction = null;

  const TAB_META = {
    dashboard: { title: 'Operations Dashboard', sub: 'Real-time dispatch, carrier management, and freight billing' },
    loads: { title: 'Load Board', sub: 'Every dispatch — customer, carrier, route, and rate' },
    carriers: { title: 'Carriers', sub: 'Approved motor carriers available for dispatch' },
    customers: { title: 'Customers', sub: 'Shipper / bill-to accounts' },
    consignees: { title: 'Consignees', sub: 'Delivery locations and receiving contacts' },
    invoices: { title: 'Customer Invoicing', sub: 'Generate, send, and track invoices for your loads' },
    payables: { title: 'Carrier Payables', sub: 'Track carrier payments and settlements' },
    users: { title: 'Team Access', sub: 'Manage who can sign in to this workspace' }
  };

  async function switchTab(tab) {
    activeTab = tab;
    document.querySelectorAll('.tab-section').forEach((el) => el.classList.add('hidden'));
    document.getElementById('tab-' + tab).classList.remove('hidden');
    document.querySelectorAll('.nav-btn').forEach((btn) => {
      const isActive = btn.dataset.tab === tab;
      const isUsersBtn = btn.id === 'nav-users-btn';
      btn.className = 'nav-btn w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition ' +
        (isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700');
      if (isUsersBtn && State.currentUser?.role !== 'Administrator') btn.classList.add('hidden');
    });
    document.getElementById('pageTitle').innerText = TAB_META[tab].title;
    document.getElementById('pageSub').innerText = TAB_META[tab].sub;
    await renderActiveTab();
  }

  async function renderActiveTab() {
    try {
      if (activeTab === 'dashboard') await RenderDashboard.render();
      else if (activeTab === 'loads') RenderLoads.render();
      else if (activeTab === 'carriers') RenderCarriers.render();
      else if (activeTab === 'customers') RenderCustomers.render();
      else if (activeTab === 'consignees') RenderConsignees.render();
      else if (activeTab === 'invoices') RenderInvoices.render();
      else if (activeTab === 'payables') RenderPayables.render();
      else if (activeTab === 'users') await RenderUsers.refresh();
    } catch (err) {
      toast(describeApiError(err), 'error');
    }
  }

  /** Called once, right after a successful login. */
  async function onLogin() {
    try {
      await State.refreshAll();
      if (State.currentUser.role === 'Administrator') await RenderUsers.refresh();
    } catch (err) {
      toast(describeApiError(err), 'error');
    }
    await switchTab('dashboard');
  }

  // ---- Cross-tab refresh helpers (called by modals.js after mutations) ----
  async function refreshLoadsDependentViews() {
    await State.refreshLoads(currentLoadQuery());
    await State.refreshInvoices(); // amounts/joins may reference loads
    await renderAllVisibleAndDashboard();
  }
  async function refreshCarriersDependentViews() {
    await State.refreshCarriers();
    await State.refreshLoads(currentLoadQuery()); // carrier_name joins
    await renderAllVisibleAndDashboard();
  }
  async function refreshCustomersDependentViews() {
    await State.refreshCustomers();
    await State.refreshLoads(currentLoadQuery());
    await State.refreshInvoices();
    await renderAllVisibleAndDashboard();
  }
  async function refreshConsigneesDependentViews() {
    await State.refreshConsignees();
    await State.refreshLoads(currentLoadQuery());
    await renderAllVisibleAndDashboard();
  }
  async function refreshInvoicesDependentViews() {
    await State.refreshInvoices();
    await renderAllVisibleAndDashboard();
  }
  async function renderAllVisibleAndDashboard() {
    await RenderDashboard.render();
    RenderLoads.render();
    RenderPayables.render();
    RenderInvoices.render();
    RenderCarriers.render();
    RenderCustomers.render();
    RenderConsignees.render();
  }
  function currentLoadQuery() {
    const search = document.getElementById('loadSearch').value.trim();
    const status = document.getElementById('loadStatusFilter').value;
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    return params.toString() ? `?${params}` : '';
  }

  // ---------------------------------------------------------------
  // Event delegation — one listener for the whole document, dispatched
  // by data-* attributes so render modules stay pure (string -> DOM).
  // ---------------------------------------------------------------
  function wireEvents() {
    document.querySelectorAll('.nav-btn[data-tab]').forEach((btn) => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    document.getElementById('loadSearch').addEventListener('input', debounce(() => RenderLoads.refresh(), 300));
    document.getElementById('loadStatusFilter').addEventListener('change', () => RenderLoads.refresh());

    document.getElementById('entityModalCloseBtn').addEventListener('click', Modals.close);
    document.getElementById('docModalCloseBtn').addEventListener('click', Documents.close);
    document.getElementById('docDownloadBtn').addEventListener('click', Documents.download);
    document.getElementById('confirmCancelBtn').addEventListener('click', closeConfirm);

    document.addEventListener('click', async (e) => {
      const t = e.target.closest('[data-open-modal], [data-close-entity-modal], [data-submit-entity], ' +
        '[data-edit-load], [data-delete-load], [data-edit-carrier], [data-delete-carrier], ' +
        '[data-edit-customer], [data-delete-customer], [data-edit-consignee], [data-delete-consignee], ' +
        '[data-edit-user], [data-delete-user], [data-open-doc], [data-create-invoice], ' +
        '[data-invoice-status], [data-delete-invoice], [data-carrier-pay]');
      if (!t) return;

      try {
        if (t.dataset.openModal) return Modals.open(t.dataset.openModal);
        if (t.dataset.closeEntityModal !== undefined) return Modals.close();
        if (t.dataset.submitEntity !== undefined) return Modals.submit();

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

        if (t.dataset.deleteInvoice) return openConfirm(`Delete ${t.dataset.invoiceLabel}? This can't be undone.`, async () => {
          await Api.Invoices.remove(t.dataset.deleteInvoice);
          await refreshInvoicesDependentViews();
          toast('Deleted.', 'success');
        });

        if (t.dataset.openDoc === 'rc') return Documents.openForLoad('rc', t.dataset.loadId);
        if (t.dataset.openDoc === 'bol') return Documents.openForLoad('bol', t.dataset.loadId);
        if (t.dataset.openDoc === 'settlement') return Documents.openForLoad('settlement', t.dataset.loadId);
        if (t.dataset.openDoc === 'invoice') return Documents.openForInvoice(t.dataset.invoiceId);

        if (t.dataset.createInvoice) {
          await Api.Invoices.create({ load_id: t.dataset.createInvoice });
          await refreshInvoicesDependentViews();
          toast('Invoice created.', 'success');
          return;
        }

        if (t.dataset.invoiceStatus) {
          await Api.Invoices.setStatus(t.dataset.invoiceStatus, t.dataset.statusValue);
          await refreshInvoicesDependentViews();
          toast('Invoice updated.', 'success');
          return;
        }

        if (t.dataset.carrierPay) {
          await Api.Loads.setCarrierPayment(t.dataset.carrierPay, t.dataset.payValue);
          await refreshLoadsDependentViews();
          toast('Payment status updated.', 'success');
          return;
        }
      } catch (err) {
        toast(describeApiError(err), 'error');
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
