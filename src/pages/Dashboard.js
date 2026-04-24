import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useStudy } from '../context/StudyContext';
import ErrorBanner from '../components/ErrorBanner';
import Pill from '../components/Pill';

const ENTITY_LABELS = {
  adverse_event: 'Adverse Event',
  medical_history: 'Medical History',
  concomitant_medication: 'Conmed',
  procedure: 'Procedure',
  indication: 'Indication',
};

const CONF_COLORS = {
  HIGH:     { bg: 'var(--success-light)',  color: '#065f46' },
  MEDIUM:   { bg: 'var(--warning-light)',  color: '#92400e' },
  LOW:      { bg: 'var(--danger-light)',   color: '#991b1b' },
  CONFLICT: { bg: '#ede9fe',               color: '#5b21b6' },
};

function PctBar({ label, value, color }) {
  const pct = Math.round((value || 0) * 100);
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
        <span style={{ fontWeight: 500 }}>{label}</span>
        <span className="mono" style={{ fontWeight: 700 }}>{pct}%</span>
      </div>
      <div style={{ background: 'var(--slate-100)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, background: color || 'var(--primary)', height: '100%', borderRadius: 4, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { studies, activeStudyId } = useStudy();
  const [studyFilter, setStudyFilter] = useState(() => activeStudyId || '');
  const [days, setDays]               = useState(30);
  const [kpi, setKpi]                 = useState(null);
  const [versions, setVersions]       = useState([]);
  const [audit, setAudit]             = useState(null);
  const [recentRecords, setRecentRecords] = useState([]);
  const [err, setErr]                 = useState(null);
  const [loading, setLoading]         = useState(false);

  const load = useCallback(() => {
    setLoading(true); setErr(null);
    Promise.all([
      api.getKpis({ study_id: studyFilter || undefined, days }),
      api.versions(),
      api.verifyAudit(),
      api.listRecords({ study_id: studyFilter || undefined, limit: 5 }),
    ]).then(([k, v, a, r]) => {
      setKpi(k);
      setVersions(v.items);
      setAudit(a);
      setRecentRecords(r.items);
    }).catch(setErr).finally(() => setLoading(false));
  }, [studyFilter, days]);

  useEffect(() => { load(); }, [load]);

  const activeVersion = versions.find(v => v.is_active) || versions[0];
  const fmt = (v) => v !== null && v !== undefined ? `${Math.round(v * 100)}%` : '—';

  return (
    <div className="fade-in" style={{ maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>OVERVIEW</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <h2 style={{ margin: 0 }}>Dashboard</h2>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              Study
              <select value={studyFilter} onChange={e => setStudyFilter(e.target.value)} style={{ fontSize: 13 }}>
                <option value="">All studies</option>
                {studies.map(s => <option key={s.study_id} value={s.study_id}>{s.name}</option>)}
              </select>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              Period
              <select value={days} onChange={e => setDays(Number(e.target.value))} style={{ fontSize: 13 }}>
                {[7, 14, 30, 90, 365].map(d => <option key={d} value={d}>Last {d} days</option>)}
              </select>
            </label>
            <button className="secondary" onClick={load} disabled={loading} style={{ fontSize: 13 }}>
              {loading ? 'Loading…' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      <ErrorBanner error={err} />

      {/* Top stat cards */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Total records</div>
          <div className="stat-value">{kpi?.total_records ?? '—'}</div>
          <div className="stat-sub">coded entries</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Auto-rate</div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>{fmt(kpi?.auto_rate)}</div>
          <div className="stat-sub">no review needed</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">LLM confirm rate</div>
          <div className="stat-value" style={{ color: 'var(--primary)' }}>{fmt(kpi?.llm_confirmation_rate)}</div>
          <div className="stat-sub">LLM agreed with top PT</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Conflict rate</div>
          <div className="stat-value" style={{ color: kpi?.conflict_rate > 0.1 ? 'var(--danger)' : 'var(--slate-700)' }}>{fmt(kpi?.conflict_rate)}</div>
          <div className="stat-sub">requires escalation</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Escalation rate</div>
          <div className="stat-value" style={{ color: kpi?.escalation_rate > 0.2 ? 'var(--warning)' : 'var(--slate-700)' }}>{fmt(kpi?.escalation_rate)}</div>
          <div className="stat-sub">sent to safety review</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg cross-encoder</div>
          <div className="stat-value" style={{ color: 'var(--primary)', fontSize: 22 }}>
            {kpi?.avg_cross_encoder_score != null ? kpi.avg_cross_encoder_score.toFixed(3) : '—'}
          </div>
          <div className="stat-sub">mean softmax score</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active version</div>
          <div className="stat-value" style={{ color: 'var(--primary)', fontSize: 22 }}>
            {activeVersion ? `v${activeVersion.version_number}` : '—'}
          </div>
          <div className="stat-sub">{activeVersion?.release_date}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Audit chain</div>
          <div className="stat-value" style={{ fontSize: 20, color: audit?.ok ? 'var(--success)' : audit ? 'var(--danger)' : 'var(--slate-400)' }}>
            {audit ? (audit.ok ? 'Verified' : 'Broken') : '…'}
          </div>
          <div className="stat-sub">{audit?.checked || 0} entries checked</div>
        </div>
      </div>

      {kpi && kpi.total_records > 0 && (
        <>
          <div className="row" style={{ alignItems: 'flex-start' }}>
            {/* Routing rates */}
            <div className="card" style={{ flex: 1 }}>
              <h3>Routing rates</h3>
              <PctBar label="Auto (no review)" value={kpi.auto_rate} color="var(--success)" />
              <PctBar label="LLM confirmed" value={kpi.llm_confirmation_rate} color="var(--primary)" />
              <PctBar label="Escalated" value={kpi.escalation_rate} color="var(--warning)" />
              <PctBar label="Override" value={kpi.override_rate} color="var(--slate-500)" />
              <PctBar label="Conflict" value={kpi.conflict_rate} color="#7c3aed" />
            </div>

            {/* Confidence breakdown */}
            <div className="card" style={{ flex: 1 }}>
              <h3>Confidence breakdown</h3>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {Object.entries(kpi.by_confidence).sort().map(([level, count]) => {
                  const style = CONF_COLORS[level] || { bg: 'var(--slate-100)', color: 'var(--slate-700)' };
                  return (
                    <div key={level} style={{ flex: 1, minWidth: 70, background: style.bg, borderRadius: 10, padding: '14px 10px', textAlign: 'center' }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: style.color }}>{count}</div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: style.color, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 4 }}>{level}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Status breakdown */}
            <div className="card" style={{ flex: 1 }}>
              <h3>Status breakdown</h3>
              {Object.entries(kpi.by_status).sort().map(([status, count]) => (
                <div key={status} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--slate-100)' }}>
                  <span style={{ fontSize: 13, fontWeight: 500, textTransform: 'capitalize' }}>{status.replace('_', ' ')}</span>
                  <span className="mono" style={{ fontWeight: 700 }}>{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="row" style={{ alignItems: 'flex-start' }}>
            {/* Entity type breakdown */}
            {Object.keys(kpi.by_entity_type).length > 0 && (
              <div className="card" style={{ flex: 1 }}>
                <h3>Records by entity type</h3>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {Object.entries(kpi.by_entity_type).map(([type, count]) => (
                    <div key={type} style={{ background: 'var(--slate-50)', border: '1px solid var(--slate-200)', borderRadius: 8, padding: '12px 16px', minWidth: 100, textAlign: 'center' }}>
                      <div style={{ fontSize: 20, fontWeight: 800 }}>{count}</div>
                      <div style={{ fontSize: 11, color: 'var(--slate-500)', marginTop: 4 }}>{ENTITY_LABELS[type] || type}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Daily throughput */}
            {kpi.daily_throughput.length > 0 && (
              <div className="card" style={{ flex: 2 }}>
                <h3>Daily throughput (last {days} days)</h3>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 72, overflowX: 'auto' }}>
                  {(() => {
                    const maxCount = Math.max(...kpi.daily_throughput.map(d => d.count), 1);
                    return kpi.daily_throughput.map(d => (
                      <div key={d.date} title={`${d.date}: ${d.count}`}
                        style={{ flex: 1, minWidth: 6, maxWidth: 24, background: 'var(--primary)', borderRadius: '3px 3px 0 0', height: `${Math.max(4, (d.count / maxCount) * 64)}px`, cursor: 'default' }} />
                    ));
                  })()}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--slate-400)', marginTop: 4 }}>
                  <span>{kpi.daily_throughput[0]?.date}</span>
                  <span>{kpi.daily_throughput[kpi.daily_throughput.length - 1]?.date}</span>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* MedDRA versions + recent records */}
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div className="card" style={{ flex: '0 0 220px' }}>
          <h3>MedDRA versions</h3>
          {versions.map(v => (
            <div key={v.version_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--slate-100)' }}>
              <div>
                <div style={{ fontWeight: 700 }}>v{v.version_number}</div>
                <div className="muted">{v.release_date}</div>
              </div>
              {v.is_active && <span style={{ background: 'var(--success-light)', color: '#065f46', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 4 }}>ACTIVE</span>}
            </div>
          ))}
        </div>

        {recentRecords.length > 0 && (
          <div className="card flush" style={{ flex: 1 }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--slate-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Recent coded records</h3>
              <Link to="/review" style={{ fontSize: 13, fontWeight: 600 }}>View all →</Link>
            </div>
            <table>
              <thead>
                <tr><th>Text</th><th>PT</th><th>Type</th><th>Confidence</th><th>Status</th></tr>
              </thead>
              <tbody>
                {recentRecords.map(r => (
                  <tr key={r.record_id}>
                    <td style={{ maxWidth: 280 }}>
                      <Link to={`/records/${r.record_id}`} style={{ fontWeight: 500 }}>{r.input_text_masked?.slice(0, 55)}{r.input_text_masked?.length > 55 ? '…' : ''}</Link>
                    </td>
                    <td><span className="mono">{r.pt_code || '—'}</span> <span className="muted">{r.pt_name}</span></td>
                    <td className="muted" style={{ fontSize: 12 }}>{ENTITY_LABELS[r.entity_type] || 'AE'}</td>
                    <td><Pill value={r.confidence_level} /></td>
                    <td><Pill value={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
