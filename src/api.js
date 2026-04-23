const BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000/api/v1';

async function request(path, { method = 'GET', body, params } = {}) {
  const url = new URL(BASE + path, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    });
  }
  const res = await fetch(url.toString(), {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = data?.error?.message || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.data = data;
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  health: () => request('/health'),
  versions: () => request('/versions'),
  retrieve: (body) => request('/retrieve', { method: 'POST', body }),
  code: (body) => request('/code', { method: 'POST', body }),
  listRecords: (params) => request('/records', { params }),
  getRecord: (id) => request(`/records/${id}`),
  updateRecord: (id, body) => request(`/records/${id}`, { method: 'PATCH', body }),
  lockRecord: (id) => request(`/records/${id}/lock`, { method: 'POST' }),
  unlockRecord: (id) => request(`/records/${id}/unlock`, { method: 'POST' }),
  listShifts: (params) => request('/version-shifts', { params }),
  applyShift: (body) => request('/version-shifts/apply', { method: 'POST', body }),
  listSmqs: (params) => request('/smqs', { params }),
  smqMembers: (name, params) => request(`/smqs/${encodeURIComponent(name)}/members`, { params }),
  smqMatches: (name, params) => request(`/smqs/${encodeURIComponent(name)}/matches`, { params }),
  listAudit: (params) => request('/audit', { params }),
  verifyAudit: () => request('/audit/verify', { method: 'POST' }),
};
