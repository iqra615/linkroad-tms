/**
 * Small shared state object. Holds the logged-in user and local caches of
 * the "reference" entities (customers/carriers/consignees) so dropdowns
 * and lookups in render modules don't each fetch independently.
 */
const State = {
  currentUser: null,
  entities: [],
  users: [],
  customers: [],
  carriers: [],
  consignees: [],
  loads: [],
  invoices: [],

  findEntity(id) { return this.entities.find((e) => e.id === id); },
  findEntityByCode(code) { return this.entities.find((e) => e.code === code); },
  findCustomerName(id) { return this.customers.find((c) => c.id === id)?.name || ''; },
  findCarrierName(id) { return this.carriers.find((c) => c.id === id)?.name || ''; },
  findConsigneeName(id) { return this.consignees.find((c) => c.id === id)?.name || ''; },
  findUserName(id) { return this.users.find((u) => u.id === id)?.name || ''; },

  async refreshEntities() { this.entities = (await Api.Entities.list()).entities; },
  async refreshCustomers() { this.customers = (await Api.Customers.list()).customers; },
  async refreshCarriers() { this.carriers = (await Api.Carriers.list()).carriers; },
  async refreshConsignees() { this.consignees = (await Api.Consignees.list()).consignees; },
  async refreshLoads(query = '') { this.loads = (await Api.Loads.list(query)).loads; },
  async refreshInvoices(query = '') { this.invoices = (await Api.Invoices.list(query)).invoices; },
  async refreshUsersIfAdmin() {
    if (this.currentUser?.role === 'Administrator') this.users = (await Api.Users.list()).users;
  },

  /** Loads every reference + transactional list in parallel. Call after login and after any create/delete that could affect other tabs. */
  async refreshAll() {
    // Use allSettled, not all: one endpoint failing (e.g. a missing route on
    // a partially-deployed backend) should not blank out every other tab.
    const results = await Promise.allSettled([
      this.refreshEntities(),
      this.refreshCustomers(),
      this.refreshCarriers(),
      this.refreshConsignees(),
      this.refreshLoads(),
      this.refreshInvoices(),
      this.refreshUsersIfAdmin()
    ]);
    const failed = results.filter((r) => r.status === 'rejected');
    if (failed.length) {
      console.error('Some data failed to load:', failed.map((f) => f.reason));
      toast(`${failed.length} part(s) of the app failed to load — the backend may be running outdated code. Check the console for details.`, 'error');
    }
  }
};

