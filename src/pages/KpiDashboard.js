import { useEffect, useState, useCallback } from 'react';
import { api } from '../api';
import { useStudy } from '../context/StudyContext';
import ErrorBanner from '../components/ErrorBanner';

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

function StatCard({ label, value, sub, color }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ color: color || 'var(--slate-800)' }}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

function PctBar({ label, value, color }) {
  const pct = Math.round(value * 100);
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

export default function KpiDashboard() {
  const { studies, activeStudyId } = useStudy();
  const [studyFilter, setStudyFilter] = useState(() => activeStudyId || '');
  const [days, setDays] = useState(30);
  const [kpi, setKpi] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true); setErr(null);
    api.getKpis({ study_id: studyFilter || undefined, days })
      .then(setKpi).catch(setErr).finally(() => setLoading(false));
  }, [studyFilter, days]);

  useEffect(() => { load(); }, [load]);

  const fmt = (v) => v !== null && v !== undefined ? `${Math.round(v * 100)}%` : '—';

  return (
    <div className="fade-in" style={{ maxWidth: 1100 }}>
      <div style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>ANALYTICS</div>
      <div className="section-header">
        <h2 style={{ margin: 0 }}>KPI Dashboard</h2>
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

      <ErrorBanner error={err} />

      {kpi && (
        <>
          {kpi.total_records === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--slate-400)' }}>
              No records match the current filters.
            </div>
          ) : (
            <>
              {/* Top KPI cards */}
              <div className="stat-grid">
                <StatCard label="Total records" value={kpi.total_records} sub="coded" />
                <StatCard label="Auto-rate" value={fmt(kpi.auto_rate)} sub="HIGH conf, no review needed" color="var(--success)" />
                <StatCard label="Conflict rate" value={fmt(kpi.conflict_rate)} sub="requires escalation" color={kpi.conflict_rate > 0.1 ? 'var(--danger)' : 'var(--slate-700)'} />
                <StatCard label="LLM confirm rate" value={fmt(kpi.llm_confirmation_rate)} sub="LLM agreed with top candidate" color="var(--primary)" />
                <StatCard label="Escalation rate" value={fmt(kpi.escalation_rate)} sub="sent to safety review" color={kpi.escalation_rate > 0.2 ? 'var(--warning)' : 'var(--slate-700)'} />
                <StatCard label="Override rate" value={fmt(kpi.override_rate)} sub="manually corrected" />
                <StatCard
                  label="Avg cross-encoder"
                  value={kpi.avg_cross_encoder_score !== null ? kpi.avg_cross_encoder_score.toFixed(3) : '—'}
                  sub="mean softmax score"
                  color="var(--primary)"
                />
              </div>

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
                        <div key={level} style={{ flex: 1, minWidth: 80, background: style.bg, borderRadius: 10, padding: '14px 10px', textAlign: 'center' }}>
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

              {/* Entity type breakdown */}
              {Object.keys(kpi.by_entity_type).length > 0 && (
                <div className="card">
                  <h3>Records by entity type</h3>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {Object.entries(kpi.by_entity_type).map(([type, count]) => (
                      <div key={type} style={{ background: 'var(--slate-50)', border: '1px solid var(--slate-200)', borderRadius: 8, padding: '12px 20px', minWidth: 120, textAlign: 'center' }}>
                        <div style={{ fontSize: 22, fontWeight: 800 }}>{count}</div>
                        <div style={{ fontSize: 12, color: 'var(--slate-500)', marginTop: 4 }}>{ENTITY_LABELS[type] || type}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Daily throughput */}
              {kpi.daily_throughput.length > 0 && (
                <div className="card">
                  <h3>Daily throughput (last {days} days)</h3>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80, overflowX: 'auto' }}>
                    {(() => {
                      const maxCount = Math.max(...kpi.daily_throughput.map(d => d.count), 1);
                      return kpi.daily_throughput.map(d => (
                        <div key={d.date} title={`${d.date}: ${d.count}`} style={{ flex: 1, minWidth: 8, maxWidth: 28, background: 'var(--primary)', borderRadius: '3px 3px 0 0', height: `${Math.max(4, (d.count / maxCount) * 72)}px`, cursor: 'default' }} />
                      ));
                    })()}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--slate-400)', marginTop: 4 }}>
                    <span>{kpi.daily_throughput[0]?.date}</span>
                    <span>{kpi.daily_throughput[kpi.daily_throughput.length - 1]?.date}</span>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
