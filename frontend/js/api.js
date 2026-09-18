/**
 * Thin fetch wrapper + one object per REST resource. Every other frontend
 * module calls through here instead of using fetch() directly, so auth
 * headers, error handling, and the base URL only live in one place.
 */
const Api = (() => {
  const BASE = window.APP_CONFIG.API_BASE_URL;

  function getToken() {
    return localStorage.getItem('linkroad_token');
  }
  function setToken(token) {
    if (token) localStorage.setItem('linkroad_token', token);
    else localStorage.removeItem('linkroad_token');
  }

  class ApiClientError extends Error {
    constructor(status, message, details) {
      super(message);
      this.status = status;
      this.details = details;
    }
  }

  async function request(path, { method = 'GET', body, auth = true } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (auth) {
      const token = getToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    let res;
    try {
      res = await fetch(`${BASE}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined
      });
    } catch (networkErr) {
      throw new ApiClientError(0, 'Could not reach the server. Is the backend running?');
    }

    if (res.status === 204) return null;

    let payload = null;
    try {
      payload = await res.json();
    } catch {
      // No JSON body (rare, e.g. some proxies) — fall through with null payload.
    }

    if (!res.ok) {
      if (res.status === 401) {
        // Token missing/expired/invalid — force back to the login screen.
        setToken(null);
        document.dispatchEvent(new CustomEvent('linkroad:unauthorized'));
      }
      throw new ApiClientError(res.status, payload?.error || `Request failed (${res.status})`, payload?.details);
    }

    return payload;
  }

  return {
    getToken,
    setToken,
    ApiClientError,

    health: () => request('/health', { auth: false }),

    Auth: {
      register: (data) => request('/auth/register', { method: 'POST', body: data, auth: false }),
      login: (data) => request('/auth/login', { method: 'POST', body: data, auth: false }),
      me: () => request('/auth/me')
    },

    Users: {
      list: () => request('/users'),
      create: (data) => request('/users', { method: 'POST', body: data }),
      update: (id, data) => request(`/users/${id}`, { method: 'PUT', body: data }),
      remove: (id) => request(`/users/${id}`, { method: 'DELETE' })
    },

    Entities: {
      list: () => request('/entities'),
      get: (id) => request(`/entities/${id}`),
      update: (id, data) => request(`/entities/${id}`, { method: 'PUT', body: data })
    },

    Customers: {
      list: (params = '') => request(`/customers${params}`),
      get: (id) => request(`/customers/${id}`),
      create: (data) => request('/customers', { method: 'POST', body: data }),
      update: (id, data) => request(`/customers/${id}`, { method: 'PUT', body: data }),
      remove: (id) => request(`/customers/${id}`, { method: 'DELETE' })
    },

    Carriers: {
      list: (params = '') => request(`/carriers${params}`),
      get: (id) => request(`/carriers/${id}`),
      create: (data) => request('/carriers', { method: 'POST', body: data }),
      update: (id, data) => request(`/carriers/${id}`, { method: 'PUT', body: data }),
      remove: (id) => request(`/carriers/${id}`, { method: 'DELETE' })
    },

    Consignees: {
      list: (params = '') => request(`/consignees${params}`),
      get: (id) => request(`/consignees/${id}`),
      create: (data) => request('/consignees', { method: 'POST', body: data }),
      update: (id, data) => request(`/consignees/${id}`, { method: 'PUT', body: data }),
      remove: (id) => request(`/consignees/${id}`, { method: 'DELETE' })
    },

    Loads: {
      list: (params = '') => request(`/loads${params}`),
      get: (id) => request(`/loads/${id}`),
      create: (data) => request('/loads', { method: 'POST', body: data }),
      update: (id, data) => request(`/loads/${id}`, { method: 'PUT', body: data }),
      remove: (id) => request(`/loads/${id}`, { method: 'DELETE' }),
      setCarrierPayment: (id, status) => request(`/loads/${id}/carrier-payment`, { method: 'PATCH', body: { status } }),
      calculateMiles: (id) => request(`/loads/${id}/calculate-miles`, { method: 'POST' })
    },

    Invoices: {
      list: (params = '') => request(`/invoices${params}`),
      get: (id) => request(`/invoices/${id}`),
      create: (data) => request('/invoices', { method: 'POST', body: data }),
      update: (id, data) => request(`/invoices/${id}`, { method: 'PUT', body: data }),
      setStatus: (id, status) => request(`/invoices/${id}/status`, { method: 'PATCH', body: { status } }),
      remove: (id) => request(`/invoices/${id}`, { method: 'DELETE' })
    },

    Dashboard: {
      summary: () => request('/dashboard/summary')
    },

    Reports: {
      summary: (period) => request(`/reports/summary?period=${period}`),
      userWise: (userId, period) => request(`/reports/user-wise?user_id=${userId}&period=${period}`),
      exportJson: (period) => request(`/reports/export?period=${period}&format=json`),
      /** CSV needs the auth header, so it's a real fetch + blob download, not a plain link. */
      async downloadCsv(period) {
        const token = getToken();
        const res = await fetch(`${BASE}/reports/export?period=${period}&format=csv`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (!res.ok) throw new ApiClientError(res.status, 'Could not export the report.');
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `loads_${period}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }
    }
  };
})();
