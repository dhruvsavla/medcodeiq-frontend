import { useEffect, useState } from 'react';
import { api } from '../api';
import ErrorBanner from '../components/ErrorBanner';

export default function Dashboard() {
  const [versions, setVersions] = useState([]);
  const [records, setRecords] = useState({ total: 0, items: [] });
  const [audit, setAudit] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    Promise.all([api.versions(), api.listRecords({ limit: 10 }), api.verifyAudit()])
      .then(([v, r, a]) => { setVersions(v.items); setRecords(r); setAudit(a); })
      .catch(setErr);
  }, []);

  const counts = records.items.reduce((m, r) => {
    m[r.confidence_level] = (m[r.confidence_level] || 0) + 1;
    return m;
  }, {});

  return (
    <div>
      <h2>Dashboard</h2>
      <ErrorBanner error={err} />
      <div className="row">
        <div className="card">
          <h3>MedDRA versions</h3>
          {versions.map(v => (
            <div key={v.version_id} className="mono">
              {v.version_number} {v.is_active ? '(active)' : ''} — released {v.release_date}
            </div>
          ))}
        </div>
        <div className="card">
          <h3>Coded records (recent 10)</h3>
          <div>Total in DB: <b>{records.total}</b></div>
          <div className="muted">Breakdown of the latest 10:</div>
          <div>HIGH: {counts.HIGH || 0} · MEDIUM: {counts.MEDIUM || 0} · LOW: {counts.LOW || 0} · CONFLICT: {counts.CONFLICT || 0}</div>
        </div>
        <div className="card">
          <h3>Audit chain</h3>
          {audit && (
            audit.ok
              ? <div className="ok">Chain verified — {audit.checked} entries</div>
              : <div className="error">Broken at log_id={audit.broken_at_log_id}: {audit.error}</div>
          )}
        </div>
      </div>
    </div>
  );
}
