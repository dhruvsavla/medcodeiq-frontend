import { useEffect, useState, useCallback } from 'react';
import { api } from '../api';
import ErrorBanner from '../components/ErrorBanner';

export default function AuditViewer() {
  const [entityType, setEntityType] = useState('');
  const [entityId, setEntityId]     = useState('');
  const [entries, setEntries]       = useState([]);
  const [verify, setVerify]         = useState(null);
  const [err, setErr]               = useState(null);
  const [selected, setSelected]     = useState(null);
  const [verifying, setVerifying]   = useState(false);

  const load = useCallback(() => {
    api.listAudit({ entity_type: entityType || undefined, entity_id: entityId || undefined, limit: 200 })
      .then(r => setEntries(r.items)).catch(setErr);
  }, [entityType, entityId]);

  useEffect(() => { load(); }, [load]);

  const runVerify = async () => {
    setVerifying(true); setErr(null);
    try { setVerify(await api.verifyAudit()); }
    catch (e) { setErr(e); }
    finally { setVerifying(false); }
  };

  const ACTION_COLORS = {
    coded:                  { bg: 'var(--success-light)', color: '#065f46' },
    updated:                { bg: 'var(--info-light)',    color: '#1e40af' },
    locked:                 { bg: 'var(--warning-light)', color: '#92400e' },
    unlocked:               { bg: 'var(--slate-100)',     color: 'var(--slate-700)' },
    shift_applied:          { bg: 'var(--purple-light)',  color: '#5b21b6' },
    version_shift_flagged:  { bg: 'var(--danger-light)',  color: '#991b1b' },
    embeddings_generated:   { bg: 'var(--primary-light)', color: 'var(--primary-dark)' },
  };

  return (
    <div className="fade-in" style={{ maxWidth: 1200 }}>
      <div style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>COMPLIANCE</div>
      <h2>Audit Log</h2>
      <ErrorBanner error={err} />

      <div className="card">
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <span className="label">Entity type</span>
            <input value={entityType} onChange={e => setEntityType(e.target.value)}
              placeholder="coded_records, meddra_versions…" style={{ minWidth: 220 }} />
          </div>
          <div>
            <span className="label">Entity ID</span>
            <input value={entityId} onChange={e => setEntityId(e.target.value)}
              placeholder="UUID or identifier" style={{ minWidth: 220 }} />
          </div>
          <button className="secondary" onClick={load}>Filter</button>
          <button onClick={runVerify} disabled={verifying} className="success">
            {verifying ? 'Verifying…' : '🔒 Verify chain'}
          </button>
        </div>

        {verify && (
          <div className={verify.ok ? 'ok' : 'error'} style={{ marginTop: 16 }}>
            {verify.ok
              ? `✓ Chain integrity verified — ${verify.checked} entries, no tampering detected`
              : `✗ Integrity breach at log_id ${verify.broken_at_log_id}: ${verify.error}`}
          </div>
        )}
      </div>

      <div className="row" style={{ alignItems: 'flex-start' }}>
        {/* Table */}
        <div style={{ flex: 2, minWidth: 0 }}>
          <div className="card flush">
            <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--slate-100)', background: 'var(--slate-50)' }}>
              <h3 style={{ margin: 0 }}>{entries.length} entries</h3>
            </div>
            <table>
              <thead>
                <tr><th>ID</th><th>Entity</th><th>Action</th><th>Actor</th><th>Timestamp</th></tr>
              </thead>
              <tbody>
                {entries.map(e => {
                  const c = ACTION_COLORS[e.action] || { bg: 'var(--slate-100)', color: 'var(--slate-700)' };
                  return (
                    <tr key={e.log_id} style={{ cursor: 'pointer' }} onClick={() => setSelected(e)}>
                      <td><span className="mono">{e.log_id}</span></td>
                      <td>
                        <div style={{ fontSize: 11, color: 'var(--slate-400)', textTransform: 'uppercase', fontWeight: 600 }}>{e.entity_type}</div>
                        <span className="mono" style={{ fontSize: 11 }}>{e.entity_id.slice(0, 16)}</span>
                      </td>
                      <td>
                        <span style={{ background: c.bg, color: c.color, padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
                          {e.action}
                        </span>
                      </td>
                      <td className="muted">{e.actor}</td>
                      <td className="muted">{new Date(e.timestamp).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Inspector */}
        <div style={{ flex: 1, minWidth: 260 }}>
          <div className="card" style={{ position: 'sticky', top: 24 }}>
            <h3>Entry inspector</h3>
            {!selected ? (
              <div style={{ color: 'var(--slate-400)', fontSize: 14, padding: '16px 0' }}>Click any row to inspect its payload and hash chain.</div>
            ) : (
              <>
                <div style={{ marginBottom: 16 }}>
                  <div className="muted" style={{ marginBottom: 4 }}>Log ID</div>
                  <span className="mono">{selected.log_id}</span>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div className="muted" style={{ marginBottom: 4 }}>Previous hash</div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, wordBreak: 'break-all', color: 'var(--slate-700)' }}>
                    {selected.prev_hash || '∅ (first entry)'}
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div className="muted" style={{ marginBottom: 4 }}>Current hash</div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, wordBreak: 'break-all', color: 'var(--slate-700)' }}>
                    {selected.current_hash}
                  </div>
                </div>
                <div>
                  <div className="muted" style={{ marginBottom: 8 }}>Payload</div>
                  <pre className="json">{JSON.stringify(selected.payload, null, 2)}</pre>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
