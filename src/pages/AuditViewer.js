import { useEffect, useState, useCallback } from 'react';
import { api } from '../api';
import ErrorBanner from '../components/ErrorBanner';

export default function AuditViewer() {
  const [entityType, setEntityType] = useState('');
  const [entityId, setEntityId] = useState('');
  const [entries, setEntries] = useState([]);
  const [verify, setVerify] = useState(null);
  const [err, setErr] = useState(null);
  const [selected, setSelected] = useState(null);

  const load = useCallback(() => {
    api.listAudit({ entity_type: entityType || undefined, entity_id: entityId || undefined, limit: 200 })
      .then(r => setEntries(r.items)).catch(setErr);
  }, [entityType, entityId]);

  useEffect(() => { load(); }, [load]);

  const runVerify = async () => {
    setErr(null);
    try { setVerify(await api.verifyAudit()); } catch (e) { setErr(e); }
  };

  return (
    <div>
      <h2>Audit log</h2>
      <ErrorBanner error={err} />
      <div className="card">
        <div className="filters">
          <label>Entity type<input value={entityType} onChange={e => setEntityType(e.target.value)} placeholder="coded_records, meddra_versions, …" /></label>
          <label>Entity ID<input value={entityId} onChange={e => setEntityId(e.target.value)} /></label>
          <button className="secondary" onClick={load}>Filter</button>
          <button onClick={runVerify}>Verify chain</button>
        </div>
        {verify && (
          verify.ok
            ? <div className="ok" style={{ marginTop: 12 }}>Chain verified — {verify.checked} entries</div>
            : <div className="error" style={{ marginTop: 12 }}>Broken at {verify.broken_at_log_id}: {verify.error}</div>
        )}
      </div>

      <div className="row">
        <div className="card" style={{ flex: 2 }}>
          <table>
            <thead><tr><th>log_id</th><th>Entity</th><th>Action</th><th>Actor</th><th>At</th></tr></thead>
            <tbody>
              {entries.map(e => (
                <tr key={e.log_id} style={{ cursor: 'pointer' }} onClick={() => setSelected(e)}>
                  <td className="mono">{e.log_id}</td>
                  <td><span className="muted">{e.entity_type}</span> <span className="mono">{e.entity_id.slice(0, 12)}</span></td>
                  <td>{e.action}</td>
                  <td className="muted">{e.actor}</td>
                  <td className="muted">{new Date(e.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card" style={{ flex: 1 }}>
          <h3>Entry</h3>
          {!selected && <div className="muted">Click a row to inspect.</div>}
          {selected && (
            <>
              <div className="muted mono" style={{ wordBreak: 'break-all' }}>
                prev: {selected.prev_hash || '∅'}<br />
                curr: {selected.current_hash}
              </div>
              <pre className="json">{JSON.stringify(selected.payload, null, 2)}</pre>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
